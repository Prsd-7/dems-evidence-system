"""
DEMS — Digital Evidence Management System  v2.1 (FINAL)
========================================================
Changes in this version:
  ✔ All routes use HTTPException (proper status codes, no silent {error:...})
  ✔ Global exception handler — no stack traces leak to client
  ✔ Blockchain integration: UPLOAD + VERIFY anchored to chain
  ✔ /blockchain endpoint — view full chain
  ✔ /blockchain/validate — integrity check
  ✔ Download hardened: file-exists check, log, risk refresh
  ✔ All helpers extracted — no duplicated SQL
"""

from datetime import datetime
import hashlib
import logging
import os
import re
import time
import uuid

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from blockchain import blockchain
from database  import get_connection


from verification import verify_chain_vs_db

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger("dems")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="DEMS API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Global exception handler — catches anything not already an HTTPException ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs."},
    )

# ── Constants ──────────────────────────────────────────────────────────────────
UPLOAD_FOLDER  = "uploads"
MAX_FILE_BYTES = 10 * 1024 * 1024          # 10 MB
ALLOWED_EXT    = {".txt", ".pdf", ".csv", ".log"}
_SAFE_NAME_RE  = re.compile(r"[^\w.\-]")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def sanitize(name: str) -> str:
    name = os.path.basename(name)
    return _SAFE_NAME_RE.sub("_", name) or "unnamed_file"


def log_action(evidence_id: int, action: str, conn):
    """Insert a row into access_logs and commit."""
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO access_logs (evidence_id, action) VALUES (%s, %s)",
        (evidence_id, action),
    )
    conn.commit()


def compute_risk(evidence_id: int, conn) -> int:
    """Behavior-based risk: base 10, +5/view, +10/download, −8/verify, +60 if Tampered."""
    cur = conn.cursor()
    cur.execute(
        "SELECT action, COUNT(*) FROM access_logs WHERE evidence_id=%s GROUP BY action",
        (evidence_id,),
    )
    c         = {r[0]: r[1] for r in cur.fetchall()}
    cur.execute("SELECT integrity_status FROM evidence WHERE evidence_id=%s", (evidence_id,))
    row       = cur.fetchone()
    status    = row[0] if row else "Unknown"
    score     = 10 + c.get("VIEW",0)*5 + c.get("DOWNLOAD",0)*10 - c.get("VERIFY",0)*8
    if status == "Tampered":
        score += 60
    return max(0, min(100, score))


def explain_risk(evidence_id: int, conn) -> str:
    """Plain-English XAI sentence for the current risk score."""
    cur = conn.cursor()
    cur.execute(
        "SELECT action, COUNT(*) FROM access_logs WHERE evidence_id=%s GROUP BY action",
        (evidence_id,),
    )
    c      = {r[0]: r[1] for r in cur.fetchall()}
    views  = c.get("VIEW",     0)
    dls    = c.get("DOWNLOAD", 0)
    vers   = c.get("VERIFY",   0)
    cur.execute("SELECT integrity_status FROM evidence WHERE evidence_id=%s", (evidence_id,))
    row    = cur.fetchone()
    status = row[0] if row else "Unknown"
    score  = max(0, min(100, 10 + views*5 + dls*10 - vers*8 + (60 if status=="Tampered" else 0)))

    parts = []
    if status == "Tampered":
        parts.append("file integrity is compromised (+60 penalty)")
    if dls:
        parts.append(f"downloaded {dls} time(s) (+{dls*10} pts)")
    if views:
        parts.append(f"viewed {views} time(s) (+{views*5} pts)")
    if vers:
        parts.append(f"verified {vers} time(s) (−{vers*8} pts, trust signal)")

    if not parts:
        return f"Score is {score}/100. No significant activity yet — base score only."
    return f"Score is {score}/100. Risk elevated because: " + "; ".join(parts) + "."


def refresh_risk(evidence_id: int, conn) -> int:
    """Compute, persist, and return new risk score."""
    score = compute_risk(evidence_id, conn)
    cur   = conn.cursor()
    cur.execute(
        "UPDATE evidence SET risk_score=%s WHERE evidence_id=%s",
        (score, evidence_id),
    )
    conn.commit()
    return score


def fetch_evidence_row(evidence_id: int, conn) -> dict:
    """Fetch one evidence row or raise 404."""
    cur = conn.cursor()
    cur.execute(
        """SELECT evidence_id, file_name, file_hash, file_path,
                  upload_time, integrity_status, risk_score,
                  COALESCE(file_size, 0)
           FROM evidence WHERE evidence_id=%s""",
        (evidence_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Evidence {evidence_id} not found")
    return dict(
        id        = row[0], file_name = row[1], hash      = row[2],
        path      = row[3], time      = str(row[4]),
        status    = row[5], risk      = row[6], file_size = row[7],
    )


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def home():
    return {
        "message":          "DEMS API Running",
        "version":          "2.1.0",
        "blockchain_blocks": blockchain.length,
        "chain_valid":       blockchain.is_valid(),
    }


# ── UPLOAD ────────────────────────────────────────────────────────────────────
@app.post("/upload/", status_code=201)
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(400, detail="Cannot upload empty file")

    # Check for corrupted/binary junk (optional)
    try:
        # For text files, try decode
        if file.filename.endswith(('.txt', '.log', '.csv')):
            content.decode('utf-8')
    except Exception:
        raise HTTPException(400, detail="File appears corrupted or unreadable")

    # 1 — size
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(400, detail=f"File too large ({len(content)/1e6:.1f} MB). Max 10 MB.")

    # 2 — type
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXT:
        raise HTTPException(400, detail=f"File type '{ext}' not allowed. Use: .txt .pdf .csv .log")

    # 3 — hash
    file_hash = hashlib.sha256(content).hexdigest()

    conn = get_connection()
    cur  = conn.cursor()

    # 4 — duplicate
    cur.execute("SELECT evidence_id, file_name FROM evidence WHERE file_hash=%s", (file_hash,))
    dup = cur.fetchone()
    if dup:
        cur.close(); conn.close()
        raise HTTPException(409, detail=f"Duplicate: file already stored as '{dup[1]}' (ID {dup[0]}).")

    # 5 — safe filename + overwrite protection
    safe = sanitize(file.filename)
    base, ext = os.path.splitext(safe)
    if os.path.exists(os.path.join(UPLOAD_FOLDER, safe)):
        safe = f"{base}_{int(time.time())}{ext}"
    path = os.path.join(UPLOAD_FOLDER, safe)

    # 6 — write
    with open(path, "wb") as f:
        f.write(content)

    size = len(content)

    # 7 — DB insert
    cur.execute(
        """INSERT INTO evidence
             (file_name, file_hash, file_path, upload_time, integrity_status, risk_score, file_size)
           VALUES (%s,%s,%s,NOW(),'Stored',10,%s)
           RETURNING evidence_id""",
        (safe, file_hash, path, size),
    )
    eid = cur.fetchone()[0]
    conn.commit()

    # 8 — log UPLOAD
    log_action(eid, "UPLOAD", conn)

    # 9 — anchor to blockchain
    block = blockchain.add_block({
        "action":      "UPLOAD",
        "evidence_id": eid,
        "file_name":   safe,
        "file_hash":   file_hash,
        "file_size":   size,
    })
    log.info("UPLOAD #%d anchored → block %d (%s…)", eid, block["index"], block["hash"][:12])

    cur.close(); conn.close()
    return {
        "id":            eid,
        "file_name":     safe,
        "hash":          file_hash,
        "file_size":     size,
        "block_index":   block["index"],
        "block_hash":    block["hash"],
        "status":        "Stored successfully",
    }


# ── GET ALL EVIDENCE ──────────────────────────────────────────────────────────
@app.get("/evidence")
def get_all_evidence():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """SELECT evidence_id, file_name, file_hash, file_path,
                  upload_time, integrity_status, risk_score,
                  COALESCE(file_size,0)
           FROM evidence ORDER BY upload_time DESC"""
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [
        dict(id=r[0], file_name=r[1], hash=r[2], path=r[3],
             time=str(r[4]), status=r[5], risk=r[6], file_size=r[7])
        for r in rows
    ]


# ── GET SINGLE EVIDENCE ───────────────────────────────────────────────────────
@app.get("/evidence/{evidence_id}")
def get_single_evidence(evidence_id: int):
    conn = get_connection()
    data = fetch_evidence_row(evidence_id, conn)
    log_action(evidence_id, "VIEW", conn)
    risk        = refresh_risk(evidence_id, conn)
    explanation = explain_risk(evidence_id, conn)
    cur = conn.cursor(); cur.close(); conn.close()
    return {**data, "risk": risk, "explanation": explanation}


# ── VERIFY ────────────────────────────────────────────────────────────────────
@app.get("/verify/{evidence_id}")
def verify_evidence(evidence_id: int):
    conn = get_connection()
    data = fetch_evidence_row(evidence_id, conn)

    if not os.path.exists(data["path"]):
        conn.close()
        raise HTTPException(404, detail=f"Physical file missing: {data['path']}")

    with open(data["path"], "rb") as f:
        current_hash = hashlib.sha256(f.read()).hexdigest()

    status = "Verified" if current_hash == data["hash"] else "Tampered"

    cur = conn.cursor()
    cur.execute(
        "UPDATE evidence SET integrity_status=%s WHERE evidence_id=%s",
        (status, evidence_id),
    )
    conn.commit()

    log_action(evidence_id, "VERIFY", conn)
    risk        = refresh_risk(evidence_id, conn)
    explanation = explain_risk(evidence_id, conn)

    # Anchor verify to blockchain
    block = blockchain.add_block({
        "action":       "VERIFY",
        "evidence_id":  evidence_id,
        "file_name":    data["file_name"],
        "file_hash":    current_hash,
        "status":       status,
        "risk":         risk,
    })
    log.info("VERIFY #%d → %s | block %d (%s…)", evidence_id, status, block["index"], block["hash"][:12])

    cur.close(); conn.close()
    return {
        "id":          evidence_id,
        "status":      status,
        "risk":        risk,
        "explanation": explanation,
        "block_index": block["index"],
        "block_hash":  block["hash"],
    }


# ── DOWNLOAD ──────────────────────────────────────────────────────────────────
@app.get("/download/{evidence_id}")
def download_file(evidence_id: int):
    conn = get_connection()
    data = fetch_evidence_row(evidence_id, conn)

    if not os.path.exists(data["path"]):
        conn.close()
        raise HTTPException(404, detail=f"Physical file missing: {data['path']}")

    log_action(evidence_id, "DOWNLOAD", conn)
    refresh_risk(evidence_id, conn)
    conn.close()

    return FileResponse(
        path       = data["path"],
        filename   = data["file_name"],
        media_type = "application/octet-stream",
    )


# ── PREVIEW (.txt only) ───────────────────────────────────────────────────────
@app.get("/preview/{evidence_id}")
def preview_file(evidence_id: int):
    conn = get_connection()
    data = fetch_evidence_row(evidence_id, conn)
    conn.close()

    _, ext = os.path.splitext(data["file_name"])
    if ext.lower() != ".txt":
        raise HTTPException(400, detail="Preview only available for .txt files.")

    if not os.path.exists(data["path"]):
        raise HTTPException(404, detail="Physical file missing.")

    with open(data["path"], "r", encoding="utf-8", errors="replace") as f:
        content = f.read(5000)

    return PlainTextResponse(content)


# ── LOGS ──────────────────────────────────────────────────────────────────────
@app.get("/logs")
def get_all_logs():
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """SELECT al.id, al.evidence_id, e.file_name, al.action, al.access_time
           FROM access_logs al
           JOIN evidence e ON al.evidence_id = e.evidence_id
           ORDER BY al.access_time DESC LIMIT 500"""
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [dict(log_id=r[0], evidence_id=r[1], file_name=r[2], action=r[3], time=str(r[4])) for r in rows]


@app.get("/logs/{evidence_id}")
def get_evidence_logs(evidence_id: int):
    conn = get_connection()
    # verify exists
    fetch_evidence_row(evidence_id, conn)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, evidence_id, action, access_time FROM access_logs WHERE evidence_id=%s ORDER BY access_time DESC",
        (evidence_id,),
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [dict(log_id=r[0], evidence_id=r[1], action=r[2], time=str(r[3])) for r in rows]


# ── BLOCKCHAIN ────────────────────────────────────────────────────────────────
@app.get("/blockchain")
def get_blockchain():
    """Return full blockchain. Valid for audit/display."""
    return {
        "length":    blockchain.length,
        "is_valid":  blockchain.is_valid(),
        "last_hash": blockchain.last_hash(),
        "chain":     blockchain.chain,
    }


@app.get("/blockchain/validate")
def validate_blockchain():
    """Validate chain integrity. Returns pass/fail with details."""
    valid = blockchain.is_valid()
    return {
        "is_valid":  valid,
        "blocks":    blockchain.length,
        "last_hash": blockchain.last_hash(),
        "message":   "Chain integrity verified — no tampering detected." if valid
                     else "CHAIN INTEGRITY FAILURE — one or more blocks have been altered.",
    }

#VERIFICATION
@app.get("/admin/verify-consistency")
def check_consistency():
    """Cross-verify database against blockchain"""
    result = verify_chain_vs_db()
    return result



# ── MIGRATION ─────────────────────────────────────────────────────────────────
@app.get("/admin/migrate")
def migrate():
    """Run once to update DB schema. Safe to run multiple times."""
    conn = get_connection()
    cur  = conn.cursor()
    steps = []

    cur.execute("ALTER TABLE evidence ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0")
    steps.append("file_size column")

    cur.execute("""
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evidence_file_hash_unique') THEN
            ALTER TABLE evidence ADD CONSTRAINT evidence_file_hash_unique UNIQUE (file_hash);
          END IF;
        END$$;
    """)
    steps.append("UNIQUE constraint on file_hash")

    cur.execute("CREATE INDEX IF NOT EXISTS idx_evidence_time ON evidence(upload_time DESC)")
    steps.append("index on upload_time")

    cur.execute("CREATE INDEX IF NOT EXISTS idx_logs_eid ON access_logs(evidence_id)")
    steps.append("index on access_logs.evidence_id")

    conn.commit()
    cur.close(); conn.close()
    return {"status": "Migration complete", "applied": steps}
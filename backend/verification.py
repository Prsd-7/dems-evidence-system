"""
verification.py — Cross-validation between Database and Blockchain
"""

from database import get_connection
from blockchain import blockchain

def verify_chain_vs_db():
    """
    Compare all evidence hashes in DB against blockchain records.
    Returns: {
        "status": "CONSISTENT" | "TAMPERED",
        "total_evidence": int,
        "mismatches": [list of evidence_ids with issues]
    }
    """
    conn = get_connection()
    cur = conn.cursor()
    
    # Get all evidence from DB
    cur.execute("SELECT evidence_id, file_hash FROM evidence ORDER BY evidence_id")
    db_records = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    conn.close()
    
    # Get all UPLOAD blocks from blockchain
    chain = blockchain.chain
    bc_records = {}
    for block in chain:
        if block.get("data", {}).get("action") == "UPLOAD":
            eid = block["data"].get("evidence_id")
            file_hash = block["data"].get("file_hash")
            if eid and file_hash:
                bc_records[eid] = file_hash
    
    # Compare
    mismatches = []
    for eid, db_hash in db_records.items():
        bc_hash = bc_records.get(eid)
        if bc_hash and bc_hash != db_hash:
            mismatches.append(eid)
    
    return {
        "status": "CONSISTENT" if len(mismatches) == 0 else "TAMPERED",
        "total_evidence": len(db_records),
        "blockchain_records": len(bc_records),
        "mismatches": mismatches
    }
// Complete EvidenceDetails — all features:
// ✔ Metadata card
// ✔ XAI risk explanation
// ✔ .txt file preview
// ✔ Copy SHA-256 hash
// ✔ Confirm before download
// ✔ Per-file audit trail (fetches /logs/{id})
// ✔ Integrity timeline (visual history of status changes from logs)
// ✔ Active tab: Details | Audit Trail
import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState }    from "react"

const getRiskBadge = (score) => {
  if (score >= 70) return { label: "High",   color: "var(--red)",    bg: "var(--red-bg)" }
  if (score >= 30) return { label: "Medium", color: "var(--orange)", bg: "var(--orange-bg)" }
  return               { label: "Low",    color: "var(--green)",  bg: "var(--green-bg)" }
}

const fmtSize = (b) => {
  if (!b) return "Unknown"
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

const ACTION_COLOR = {
  UPLOAD:   "var(--text-secondary)",
  VIEW:     "var(--accent)",
  VERIFY:   "var(--green)",
  DOWNLOAD: "var(--orange)",
}

const ACTION_BG = {
  UPLOAD:   "var(--bg-surface)",
  VIEW:     "var(--accent-glow)",
  VERIFY:   "var(--green-bg)",
  DOWNLOAD: "var(--orange-bg)",
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start", gap: "16px" }}>
      <div style={{ width: "150px", flexShrink: 0, fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", paddingTop: "2px" }}>
        {label}
      </div>
      <div style={{ flex: 1, wordBreak: "break-all", fontSize: "13px", color: "var(--text-primary)" }}>
        {children}
      </div>
    </div>
  )
}

function EvidenceDetails() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [data,     setData]     = useState(null)
  const [logs,     setLogs]     = useState([])
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState("details")  // "details" | "audit"
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    // Fetch evidence details
    fetch(`http://127.0.0.1:8000/evidence/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
        // Fetch .txt preview if applicable
        if (d.file_name?.toLowerCase().endsWith(".txt")) {
          fetch(`http://127.0.0.1:8000/preview/${id}`)
            .then(r => r.text())
            .then(t => setPreview(t))
            .catch(() => setPreview("(preview unavailable)"))
        }
      })
      .catch(() => setLoading(false))

    // Fetch per-file audit logs
    fetch(`http://127.0.0.1:8000/logs/${id}`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
  }, [id])

  const copyHash = () => {
    if (!data?.hash) return
    navigator.clipboard.writeText(data.hash).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = (e) => {
    const ok = window.confirm(
      `Download "${data.file_name}"?\n\nThis action will be permanently recorded in the audit trail.`
    )
    if (!ok) e.preventDefault()
  }

  if (loading) return (
    <div style={{ padding: "40px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
      <span className="spinner"/> Loading evidence details…
    </div>
  )

  if (!data || data.error) return (
    <div style={{ padding: "40px" }}>
      <div style={{ color: "var(--red)", marginBottom: "16px" }}>Evidence not found or server error.</div>
      <button onClick={() => navigate("/evidence")} style={{ fontSize: "12px", padding: "5px 14px" }}>
        ← Back to Evidence
      </button>
    </div>
  )

  const badge   = getRiskBadge(data.risk)
  const fileExt = data.file_name?.split(".").pop()?.toLowerCase() || ""

  // Build integrity timeline from logs — only VERIFY + UPLOAD events matter for status
  const timeline = logs.filter(l => ["UPLOAD", "VERIFY"].includes(l.action)).reverse()

  return (
    <div style={{ maxWidth: "820px", padding: "24px 24px 60px" }}>

      {/* Back */}
      <button onClick={() => navigate("/evidence")} style={{ marginBottom: "20px", fontSize: "12px", padding: "4px 12px" }}>
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "22px", flexWrap: "wrap" }}>
        <h1>Evidence #{data.id}</h1>
        <span title={`Score: ${data.risk}/100 — 0–29 Low · 30–69 Medium · 70–100 High`}
          style={{ background: badge.bg, color: badge.color, padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 500, cursor: "help" }}>
          {badge.label} Risk · {data.risk}
        </span>
        <span style={{
          color: data.status === "Verified" ? "var(--green)" : data.status === "Tampered" ? "var(--red)" : "var(--text-muted)",
          fontSize: "13px", fontWeight: 500
        }}>
          {data.status}
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0", marginBottom: "18px", borderBottom: "1px solid var(--border)" }}>
        {[["details", "Details"], ["audit", `Audit Trail (${logs.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            fontSize: "13px", padding: "8px 18px",
            background: "transparent", border: "none", borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
            color: tab === key ? "var(--accent)" : "var(--text-muted)",
            borderRadius: "0", fontWeight: tab === key ? 600 : 400,
            marginBottom: "-1px"
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: DETAILS ─────────────────────────────────────────── */}
      {tab === "details" && (
        <>
          {/* Metadata card */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "0 24px", marginBottom: "16px" }}>
            <Row label="File Name">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>{data.file_name}</span>
            </Row>
            <Row label="Status">
              <span title={data.status === "Verified" ? "Hash matches original — integrity confirmed" : data.status === "Tampered" ? "Hash mismatch — file modified after upload" : "Not yet verified — run Verify to check"}
                style={{ color: data.status === "Verified" ? "var(--green)" : data.status === "Tampered" ? "var(--red)" : "var(--text-secondary)", fontWeight: 500, cursor: "help" }}>
                {data.status}
              </span>
            </Row>
            <Row label="Uploaded">{data.time?.slice(0, 19)}</Row>
            <Row label="File Type">
              <span style={{ background: "var(--bg-surface)", border: "1px solid var(--border-bright)", padding: "1px 8px", borderRadius: "4px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                .{fileExt}
              </span>
            </Row>
            <Row label="File Size">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{fmtSize(data.file_size)}</span>
            </Row>
            <Row label="File Path">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--text-muted)" }}>{data.path}</span>
            </Row>
            <Row label="SHA-256 Hash">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--accent)", flex: 1 }}>
                  {data.hash}
                </span>
                <button onClick={copyHash} title="Copy to clipboard"
                  style={{ fontSize: "11px", padding: "2px 10px", flexShrink: 0, background: copied ? "var(--green-bg)" : "var(--bg-surface)", borderColor: copied ? "var(--green)" : "var(--border-bright)", color: copied ? "var(--green)" : "var(--text-muted)" }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </Row>
          </div>

          {/* XAI Explanation */}
          {data.explanation && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent-dim)", borderRadius: "var(--radius-lg)", padding: "14px 20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: "6px" }}>
                WHY IS THE RISK SCORE {data.risk}/100?
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                {data.explanation}
              </p>
            </div>
          )}

          {/* .txt preview */}
          {fileExt === "txt" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "16px", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                FILE PREVIEW (first 5000 chars)
              </div>
              <pre style={{ margin: 0, padding: "16px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "280px", overflowY: "auto", background: "var(--bg-surface)" }}>
                {preview === null ? "Loading…" : preview || "(empty file)"}
              </pre>
            </div>
          )}

          {/* Download */}
          <a href={`http://127.0.0.1:8000/download/${id}`} onClick={handleDownload}
            style={{ display: "inline-block", background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", color: "var(--accent)", padding: "8px 20px", borderRadius: "var(--radius)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            Download File
          </a>
        </>
      )}

      {/* ── TAB: AUDIT TRAIL ─────────────────────────────────────── */}
      {tab === "audit" && (
        <>
          {/* Integrity timeline — visual */}
          {timeline.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "14px" }}>
                INTEGRITY TIMELINE
              </div>
              <div style={{ position: "relative" }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: "7px", top: "8px", bottom: "8px", width: "1px", background: "var(--border)" }}/>

                {timeline.map((log, i) => {
                  const isVerify = log.action === "VERIFY"
                  const color    = isVerify ? "var(--green)" : "var(--text-muted)"
                  return (
                    <div key={log.log_id} style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: i < timeline.length - 1 ? "16px" : "0", position: "relative" }}>
                      {/* Dot */}
                      <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: isVerify ? "var(--green)" : "var(--border-bright)", border: `2px solid ${color}`, flexShrink: 0, zIndex: 1, marginTop: "1px" }}/>
                      <div>
                        <div style={{ fontSize: "12px", color, fontWeight: 500 }}>{log.action}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                          {log.time?.slice(0, 19)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full log table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Log ID", "Action", "Timestamp"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No logs found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.log_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>#{log.log_id}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: ACTION_BG[log.action] || "var(--bg-surface)", color: ACTION_COLOR[log.action] || "var(--text-muted)", padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 500 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {log.time?.slice(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default EvidenceDetails
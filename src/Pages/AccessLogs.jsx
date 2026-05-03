// AccessLogs.jsx
import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"

const ACTION_STYLE = {
  VIEW:     { color: "var(--accent)",  bg: "var(--accent-glow)" },
  DOWNLOAD: { color: "var(--orange)",  bg: "var(--orange-bg)" },
  VERIFY:   { color: "var(--green)",   bg: "var(--green-bg)" },
  UPLOAD:   { color: "var(--text-secondary)", bg: "var(--bg-surface)" },
}

export function AccessLogs() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState("All")
  const navigate = useNavigate()

  useEffect(() => {
    fetch("http://127.0.0.1:8000/logs")
      .then(r => r.json())
      .then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const counts   = useMemo(() => ({ VIEW: 0, DOWNLOAD: 0, VERIFY: 0, UPLOAD: 0, ...logs.reduce((a, l) => { a[l.action] = (a[l.action] || 0) + 1; return a }, {}) }), [logs])
  const filtered = useMemo(() => filter === "All" ? logs : logs.filter(l => l.action === filter), [logs, filter])

  return (
    <div style={{ maxWidth: "960px" }}>
      <div style={{ marginBottom: "22px" }}>
        <h1>Access Logs</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Full audit trail — {logs.length} events</p>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        {["UPLOAD","VIEW","VERIFY","DOWNLOAD"].map(a => {
          const s = ACTION_STYLE[a] || {}
          return (
            <div key={a} style={{ background: s.bg, border: `1px solid ${s.color}`, padding: "5px 14px", borderRadius: "20px", fontSize: "12px", color: s.color, fontWeight: 500 }}>
              {a}: {counts[a]}
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>Filter:</span>
        {["All","UPLOAD","VIEW","VERIFY","DOWNLOAD"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize: "12px", padding: "4px 10px", background: filter === f ? "var(--accent-glow)" : "var(--bg-surface)", borderColor: filter === f ? "var(--accent-dim)" : "var(--border-bright)", color: filter === f ? "var(--accent)" : "var(--text-secondary)" }}>{f}</button>
        ))}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Log ID","Evidence ID","File Name","Action","Timestamp"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>Loading logs…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>No logs found</td></tr>
            ) : filtered.map(log => {
              const s = ACTION_STYLE[log.action] || { color: "var(--text-muted)", bg: "transparent" }
              return (
                <tr key={log.log_id}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.12s" }}
                  onClick={() => navigate(`/evidence/${log.evidence_id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>#{log.log_id}</td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>#{log.evidence_id}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{log.file_name}</span></td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 500 }}>{log.action}</span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>{log.time?.slice(0, 19)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AccessLogs
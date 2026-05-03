import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function RiskAnalysis() {
  const [evidence, setEvidence] = useState([])
  const [loading,  setLoading]  = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch("http://127.0.0.1:8000/evidence")
      .then(r => r.json())
      .then(d => { setEvidence(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const high   = evidence.filter(e => e.risk >= 70)
  const medium = evidence.filter(e => e.risk >= 30 && e.risk < 70)
  const low    = evidence.filter(e => e.risk < 30)
  const total  = evidence.length

  const Section = ({ title, color, bg, items }) => (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "18px" }}>
      <div style={{ padding: "11px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ background: bg, color, padding: "2px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{items.length} file{items.length !== 1 ? "s" : ""}</span>
        {total > 0 && (
          <>
            <div style={{ flex: 1, height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${(items.length / total) * 100}%`, height: "100%", background: color, borderRadius: "2px" }}/>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", minWidth: "30px", textAlign: "right" }}>{((items.length / total) * 100).toFixed(0)}%</span>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "13px" }}>None</div>
      ) : items.map(item => (
        <div key={item.id} onClick={() => navigate(`/evidence/${item.id}`)}
          style={{ padding: "11px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.12s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{item.file_name}</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.status}</span>
            <span style={{ fontSize: "12px", color, fontWeight: 600 }}>Score: {item.risk}</span>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) return <div style={{ padding: "40px", color: "var(--text-muted)" }}>Loading…</div>

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ marginBottom: "26px" }}>
        <h1>Risk Analysis</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
          Files grouped by dynamic behavior-based risk score · Click any file to view details
        </p>
      </div>
      {evidence.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          No evidence in system yet
        </div>
      ) : (
        <>
          <Section title="High Risk"   color="var(--red)"    bg="var(--red-bg)"    items={high} />
          <Section title="Medium Risk" color="var(--orange)" bg="var(--orange-bg)" items={medium} />
          <Section title="Low Risk"    color="var(--green)"  bg="var(--green-bg)"  items={low} />
        </>
      )}
    </div>
  )
}

export default RiskAnalysis
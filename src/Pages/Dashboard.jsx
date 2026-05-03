// Dashboard — auto-refresh every 30s (real-time monitoring without WebSocket)
// ✔ Live stat cards
// ✔ % tampered + avg risk
// ✔ 7-day activity chart
// ✔ Auto-refresh with countdown indicator
// ✔ Role-aware: Admin sees high-risk alert banner
// ✔ DB ↔ Blockchain Consistency Check (CRITICAL POLISH)
import { useEffect, useState, useCallback } from "react"

const getRiskBadge = (score) => {
  if (score >= 70) return { label: "High",   color: "var(--red)",    bg: "var(--red-bg)" }
  if (score >= 30) return { label: "Medium", color: "var(--orange)", bg: "var(--orange-bg)" }
  return               { label: "Low",    color: "var(--green)",  bg: "var(--green-bg)" }
}

const REFRESH_INTERVAL = 30  // seconds

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "10px" }}>{label}</div>
      <div style={{ fontSize: "1.7rem", fontWeight: 600, color: color || "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>{sub}</div>}
    </div>
  )
}

function Dashboard() {
  const [evidence,     setEvidence]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [lastUpdate,   setLastUpdate]   = useState(null)
  const [countdown,    setCountdown]    = useState(REFRESH_INTERVAL)
  const [consistency,  setConsistency]  = useState(null)
  const [checkingDB,   setCheckingDB]   = useState(false)

  // Get role from sessionStorage
  const auth = JSON.parse(sessionStorage.getItem("dems_auth") || "{}")
  const isAdmin = auth.role === "Admin"

  const fetchData = useCallback(() => {
    fetch("http://127.0.0.1:8000/evidence")
      .then(r => r.json())
      .then(d => {
        setEvidence(Array.isArray(d) ? d : [])
        setLoading(false)
        setLastUpdate(new Date())
        setCountdown(REFRESH_INTERVAL)
      })
      .catch(() => setLoading(false))
  }, [])

  // CRITICAL POLISH: DB vs Blockchain Consistency Check
  const checkConsistency = async () => {
    setCheckingDB(true)
    setConsistency(null)
    try {
      const res = await fetch("http://127.0.0.1:8000/admin/verify-consistency")
      const data = await res.json()
      setConsistency(data)
    } catch (err) {
      setConsistency({
        status: "ERROR",
        message: "Cannot reach consistency check endpoint. Backend may be offline."
      })
    }
    setCheckingDB(false)
  }

  // Initial fetch
  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL), 1000)
    return () => clearInterval(tick)
  }, [])

  const total    = evidence.length
  const tampered = evidence.filter(e => e.status === "Tampered").length
  const verified = evidence.filter(e => e.status === "Verified").length
  const highRisk = evidence.filter(e => e.risk >= 70).length
  const tampPct  = total ? ((tampered / total) * 100).toFixed(1) : "0.0"
  const avgRisk  = total ? Math.round(evidence.reduce((s, e) => s + e.risk, 0) / total) : 0

  // 7-day trend
  const trend = (() => {
    const days = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days[d.toISOString().slice(0, 10)] = 0
    }
    evidence.forEach(e => { const k = e.time?.slice(0, 10); if (k && k in days) days[k]++ })
    return Object.entries(days)
  })()
  const maxBar = Math.max(1, ...trend.map(([, v]) => v))

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header + refresh indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            {loading ? "Loading…" : `Live data · ${total} files in system`}
          </p>
        </div>
        {/* Auto-refresh badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={fetchData} style={{ fontSize: "12px", padding: "4px 12px" }}>
            Refresh
          </button>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            auto in {countdown}s
            {lastUpdate && <span style={{ marginLeft: "8px", opacity: 0.6 }}>· {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </div>
      </div>

      {/* CRITICAL POLISH: DB ↔ Blockchain Consistency Check */}
      <div style={{ 
        background: "var(--bg-card)", 
        border: "1px solid var(--border)", 
        borderRadius: "var(--radius-lg)", 
        padding: "16px 20px", 
        marginBottom: "20px" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: consistency ? "12px" : "0" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "2px" }}>
              System Integrity Check
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Cross-verify database against blockchain ledger
            </div>
          </div>
          <button 
            onClick={checkConsistency}
            disabled={checkingDB}
            style={{ 
              fontSize: "12px", 
              padding: "6px 16px",
              opacity: checkingDB ? 0.6 : 1,
              cursor: checkingDB ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {checkingDB && <span className="spinner" style={{ width: "12px", height: "12px" }}/>}
            {checkingDB ? "Checking..." : "Verify Consistency"}
          </button>
        </div>

        {/* Consistency Results */}
        {consistency && (
          <div style={{
            padding: "12px 14px",
            background: consistency.status === "CONSISTENT" ? "var(--green-bg)" : 
                       consistency.status === "TAMPERED" ? "var(--red-bg)" : "var(--orange-bg)",
            border: `1px solid ${consistency.status === "CONSISTENT" ? "var(--green)" : 
                                 consistency.status === "TAMPERED" ? "var(--red)" : "var(--orange)"}`,
            borderRadius: "var(--radius)",
            color: consistency.status === "CONSISTENT" ? "var(--green)" : 
                   consistency.status === "TAMPERED" ? "var(--red)" : "var(--orange)"
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              {consistency.status === "CONSISTENT" && "✓ "}
              {consistency.status === "TAMPERED" && "⚠️ "}
              {consistency.status === "ERROR" && "❌ "}
              {consistency.message}
            </div>
            {consistency.status !== "ERROR" && (
              <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
                DB: {consistency.total_evidence} records | 
                Blockchain: {consistency.blockchain_records} records
                {consistency.mismatches?.length > 0 && (
                  <div style={{ marginTop: "4px", color: "var(--red)" }}>
                    Hash mismatches: Evidence IDs {consistency.mismatches.join(", ")}
                  </div>
                )}
                {consistency.missing_in_blockchain?.length > 0 && (
                  <div style={{ marginTop: "4px", color: "var(--red)" }}>
                    Missing from blockchain: Evidence IDs {consistency.missing_in_blockchain.join(", ")}
                  </div>
                )}
                {consistency.orphaned_blocks?.length > 0 && (
                  <div style={{ marginTop: "4px", color: "var(--orange)" }}>
                    Orphaned blockchain records: Evidence IDs {consistency.orphaned_blocks.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin alert — show if high-risk files exist */}
      {isAdmin && highRisk > 0 && (
        <div style={{ background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: "var(--radius-lg)", padding: "12px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "var(--red)", fontSize: "13px", fontWeight: 500 }}>
            Admin Alert: {highRisk} high-risk file{highRisk !== 1 ? "s" : ""} require{highRisk === 1 ? "s" : ""} review.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "22px" }}>
        <StatCard label="TOTAL EVIDENCE"  value={loading ? "—" : total}    color="var(--accent)" />
        <StatCard label="TAMPERED"        value={loading ? "—" : tampered}
          sub={`${tampPct}% of all files`}
          color={tampered > 0 ? "var(--red)" : undefined} />
        <StatCard label="VERIFIED"        value={loading ? "—" : verified}  color="var(--green)" />
        <StatCard label="AVG RISK SCORE"  value={loading ? "—" : avgRisk}
          sub={avgRisk >= 70 ? "High — review urgently" : avgRisk >= 30 ? "Medium" : "System healthy"}
          color={avgRisk >= 70 ? "var(--red)" : avgRisk >= 30 ? "var(--orange)" : "var(--green)"} />
      </div>

      {/* 7-day chart */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 22px", marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "14px" }}>
          UPLOAD ACTIVITY — LAST 7 DAYS
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "64px" }}>
          {trend.map(([date, count]) => (
            <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div title={`${date}: ${count} upload(s)`}
                style={{ width: "100%", background: count > 0 ? "var(--accent)" : "var(--border)", borderRadius: "3px 3px 0 0", height: `${Math.max(4, (count / maxBar) * 48)}px`, opacity: count > 0 ? 1 : 0.4, transition: "height 0.3s" }}/>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent evidence */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em" }}>
          RECENT EVIDENCE
        </div>
        {loading ? (
          <div style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>
            <span className="spinner" style={{ marginRight: "8px" }}/> Loading…
          </div>
        ) : evidence.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)" }}>
            No evidence uploaded yet
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["File Name", "Upload Time", "Status", "Risk"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.slice(0, 8).map(item => {
                const badge = getRiskBadge(item.risk)
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{item.file_name}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px" }}>{item.time?.slice(0, 19)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: item.status === "Verified" ? "var(--green)" : item.status === "Tampered" ? "var(--red)" : "var(--text-muted)", fontSize: "12px", fontWeight: 500 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 500 }}>
                        {badge.label} ({item.risk})
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard
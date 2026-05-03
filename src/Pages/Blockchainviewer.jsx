// BlockchainViewer.jsx — Visual blockchain explorer
// Shows every block, chain validity, and links blocks to evidence actions.
// ✔ Chain validity banner (green/red)
// ✔ Block cards with hash, previous hash, data, timestamp
// ✔ Color-coded by action type (UPLOAD / VERIFY / GENESIS)
// ✔ Auto-refresh every 15s
import { useEffect, useState, useCallback } from "react"

const ACTION_COLOR = {
  GENESIS: { color: "var(--text-muted)",     bg: "var(--bg-surface)" },
  UPLOAD:  { color: "var(--accent)",          bg: "var(--accent-glow)" },
  VERIFY:  { color: "var(--green)",           bg: "var(--green-bg)" },
}

function BlockchainViewer() {
  const [chain,     setChain]     = useState([])
  const [meta,      setMeta]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [countdown, setCountdown] = useState(15)

  const fetchChain = useCallback(() => {
    fetch("http://127.0.0.1:8000/blockchain")
      .then(r => r.json())
      .then(d => {
        setChain(d.chain || [])
        setMeta({ length: d.length, is_valid: d.is_valid, last_hash: d.last_hash })
        setLoading(false)
        setCountdown(15)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchChain() }, [fetchChain])
  useEffect(() => {
    const iv = setInterval(fetchChain, 15000)
    return () => clearInterval(iv)
  }, [fetchChain])
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 15), 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (ts) => {
    if (!ts) return "—"
    return new Date(ts * 1000).toLocaleString()
  }

  const truncate = (h, n = 20) => h ? `${h.slice(0, n)}…` : "—"

  if (loading) return (
    <div style={{ padding: "40px", color: "var(--text-muted)", display: "flex", gap: "10px", alignItems: "center" }}>
      <span className="spinner"/> Loading blockchain…
    </div>
  )

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
        <div>
          <h1>Blockchain Ledger</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            Immutable audit chain · {meta?.length || 0} blocks · auto-refresh in {countdown}s
          </p>
        </div>
        <button onClick={fetchChain} style={{ fontSize: "12px", padding: "5px 14px" }}>Refresh</button>
      </div>

      {/* Chain validity banner */}
      {meta && (
        <div style={{
          padding: "12px 18px", marginBottom: "20px", borderRadius: "var(--radius-lg)",
          background: meta.is_valid ? "var(--green-bg)" : "var(--red-bg)",
          border: `1px solid ${meta.is_valid ? "var(--green)" : "var(--red)"}`,
          display: "flex", alignItems: "center", gap: "12px"
        }}>
          <span style={{ fontSize: "16px" }}>{meta.is_valid ? "✓" : "✗"}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: meta.is_valid ? "var(--green)" : "var(--red)" }}>
              {meta.is_valid ? "Chain integrity verified — no tampering detected" : "CHAIN INTEGRITY FAILURE — blocks have been altered"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
              Last block hash: {truncate(meta.last_hash, 32)}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "22px" }}>
        {[
          ["Total blocks",   chain.length],
          ["UPLOAD events",  chain.filter(b => b.data?.action === "UPLOAD").length],
          ["VERIFY events",  chain.filter(b => b.data?.action === "VERIFY").length],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 18px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "6px" }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "var(--accent)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Block cards — newest first */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {[...chain].reverse().map((block) => {
          const action = block.data?.action || "GENESIS"
          const style  = ACTION_COLOR[action] || ACTION_COLOR.GENESIS
          return (
            <div key={block.index} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", overflow: "hidden"
            }}>
              {/* Block header */}
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                    Block #{block.index}
                  </span>
                  <span style={{ background: style.bg, color: style.color, padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500 }}>
                    {action}
                  </span>
                  {block.data?.evidence_id && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Evidence #{block.data.evidence_id}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtTime(block.timestamp)}
                </span>
              </div>

              {/* Block body */}
              <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "3px" }}>BLOCK HASH</div>
                  <div title={block.hash} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--accent)", cursor: "help" }}>
                    {truncate(block.hash, 28)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "3px" }}>PREVIOUS HASH</div>
                  <div title={block.previous_hash} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--text-muted)", cursor: "help" }}>
                    {truncate(block.previous_hash, 28)}
                  </div>
                </div>

                {/* Evidence hash if present */}
                {block.data?.file_hash && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "3px" }}>FILE HASH (SHA-256)</div>
                    <div title={block.data.file_hash} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--text-secondary)", cursor: "help" }}>
                      {block.data.file_hash}
                    </div>
                  </div>
                )}

                {/* File name */}
                {block.data?.file_name && (
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "3px" }}>FILE</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>{block.data.file_name}</div>
                  </div>
                )}

                {/* Verify status */}
                {block.data?.status && (
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "3px" }}>INTEGRITY RESULT</div>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: block.data.status === "Verified" ? "var(--green)" : "var(--red)" }}>
                      {block.data.status}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {chain.length === 0 && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          No blocks yet — upload or verify evidence to anchor to the chain.
        </div>
      )}
    </div>
  )
}

export default BlockchainViewer
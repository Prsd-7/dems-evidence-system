import { Link, useLocation } from "react-router-dom"

const NAV = [
  { to: "/dashboard",  label: "Dashboard",      icon: "▦" },
  { to: "/upload",     label: "Upload Evidence", icon: "↑" },
  { to: "/evidence",   label: "Evidence",        icon: "≡" },
  { to: "/risk",       label: "Risk Analysis",   icon: "◈" },
  { to: "/logs",       label: "Access Logs",     icon: "⊡" },
  { to: "/blockchain", label: "Blockchain",      icon: "⛓" },
  { to: "/reports",    label: "Reports",         icon: "□" },
]

function Sidebar() {
  const { pathname } = useLocation()
  return (
    <div style={{ width: "220px", background: "var(--bg-surface)", borderRight: "1px solid var(--border)", height: "100vh", padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "0 20px 28px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: "2px" }}>DEMS</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Digital Evidence System</div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, flex: 1 }}>
        {NAV.map(({ to, label, icon }) => {
          const active = pathname === to
          return (
            <li key={to}>
              <Link to={to} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 20px", fontSize: "13px",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--bg-hover)" : "transparent",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.15s", textDecoration: "none"
              }}>
                <span style={{ fontSize: "14px", opacity: 0.8 }}>{icon}</span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
        v2.1.0 · forensic grade
      </div>
    </div>
  )
}

export default Sidebar
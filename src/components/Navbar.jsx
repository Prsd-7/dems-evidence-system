import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function Navbar() {
  const [time, setTime] = useState(new Date())
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t    = setInterval(() => setTime(new Date()), 1000)
    const auth = sessionStorage.getItem("dems_auth")
    if (auth) setUser(JSON.parse(auth))
    return () => clearInterval(t)
  }, [])

  const logout = () => { sessionStorage.removeItem("dems_auth"); navigate("/login") }

  return (
    <div style={{ height: "56px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Digital Evidence Management System</div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-muted)" }}>
          {time.toLocaleTimeString()}
        </span>
        {user && (
          <>
            <span style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", color: "var(--accent)", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500 }}>
              {user.role} — {user.username}
            </span>
            <button onClick={logout} style={{ fontSize: "12px", padding: "3px 10px", color: "var(--text-muted)", borderColor: "var(--border)" }}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Navbar
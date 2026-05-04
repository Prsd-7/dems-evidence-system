// Navbar — includes dark/light theme toggle button
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../ThemeContext"

function Navbar() {
  const [time, setTime]   = useState(new Date())
  const [user, setUser]   = useState(null)
  const navigate          = useNavigate()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const t    = setInterval(() => setTime(new Date()), 1000)
    const auth = sessionStorage.getItem("dems_auth")
    if (auth) setUser(JSON.parse(auth))
    return () => clearInterval(t)
  }, [])

  const logout = () => {
    sessionStorage.removeItem("dems_auth")
    navigate("/login")
  }

  const isDark = theme === "dark"

  return (
    <div style={{
      height: "56px",
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px", flexShrink: 0,
      boxShadow: "var(--shadow)"
    }}>
      {/* Left — system name */}
      <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
        Digital Evidence Management System
      </div>

      {/* Right — clock + theme toggle + user + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

        {/* Live clock */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px", color: "var(--text-muted)"
        }}>
          {time.toLocaleTimeString()}
        </span>

        {/* ── Theme toggle ── */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        {/* User badge + logout */}
        {user && (
          <>
            <span style={{
              background: "var(--accent-glow)",
              border: "1px solid var(--accent-dim)",
              color: "var(--accent)",
              padding: "3px 10px", borderRadius: "20px",
              fontSize: "12px", fontWeight: 500
            }}>
              {user.role} — {user.username}
            </span>
            <button
              onClick={logout}
              style={{ fontSize: "12px", padding: "3px 10px", color: "var(--text-muted)" }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Navbar
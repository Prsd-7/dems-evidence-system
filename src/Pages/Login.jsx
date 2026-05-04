// Login page — includes theme toggle so users can switch before signing in
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../ThemeContext"

const USERS = {
  investigator: { password: "dems2024", role: "Investigator" },
  admin:        { password: "admin123", role: "Admin" },
}

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const handleLogin = (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    setTimeout(() => {
      const user = USERS[username.toLowerCase()]
      if (user && user.password === password) {
        sessionStorage.setItem("dems_auth", JSON.stringify({
          username, role: user.role, loginTime: new Date().toISOString()
        }))
        navigate("/dashboard")
      } else {
        setError("Invalid username or password.")
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)", position: "relative"
    }}>

      {/* Theme toggle — top right corner */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        style={{ position: "fixed", top: "20px", right: "20px" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "40px 36px",
        width: "100%", maxWidth: "380px",
        boxShadow: "var(--shadow-lg)"
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "20px", color: "var(--accent)",
            letterSpacing: "0.12em", marginBottom: "6px", fontWeight: 600
          }}>
            DEMS
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Digital Evidence Management System
          </div>
        </div>

        <form onSubmit={handleLogin}>
          {/* Username */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>USERNAME</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="investigator"
              required
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: "16px", padding: "10px 14px",
              background: "var(--red-bg)", border: "1px solid var(--red)",
              borderRadius: "var(--radius)", color: "var(--red)", fontSize: "13px"
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "10px",
              background: "var(--accent-dim)",
              borderColor: "var(--accent)", color: "white",
              fontSize: "13px", fontWeight: 600,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Authenticating…" : "Sign In"}
          </button>
        </form>

        {/* Credentials hint */}
        <div style={{
          marginTop: "24px", padding: "12px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius)", border: "1px solid var(--border)",
          fontSize: "11px", color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.9
        }}>
          investigator / dems2024<br />
          admin / admin123
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: "block", fontSize: "11px",
  color: "var(--text-muted)",
  letterSpacing: "0.06em", marginBottom: "6px"
}

const inputStyle = {
  padding: "9px 12px",
  fontSize: "13px",
  fontFamily: "inherit",
  boxSizing: "border-box"
}

export default Login
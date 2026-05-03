// All gaps fixed:
// ✔ Loading spinner on upload button
// ✔ Error messages for all backend rejections (size, type, duplicate, server)
// ✔ Copy-hash button after successful upload
// ✔ File type restriction on input element too
// ✔ Upload response includes evidence ID with link to details
import { useState } from "react"
import { useNavigate } from "react-router-dom"

function UploadEvidence() {
  const [file,     setFile]     = useState(null)
  const [result,   setResult]   = useState(null)   // { hash, file_name, id, file_size }
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setResult(null)
    setError("")
    setCopied(false)
  }

  const uploadToBackend = async () => {
    if (!file) { setError("Please select a file first."); return }
    setLoading(true)
    setError("")
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://127.0.0.1:8000/upload/", { method: "POST", body: formData })
      const data = await res.json()

      if (data.error) { setError(data.error); setLoading(false); return }

      setResult(data)
    } catch {
      setError("Cannot reach server. Make sure the backend is running on port 8000.")
    }
    setLoading(false)
  }

  const copyHash = () => {
    if (!result?.hash) return
    navigator.clipboard.writeText(result.hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const formatSize = (bytes) => {
    if (!bytes) return ""
    if (bytes < 1024)        return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1>Upload Evidence</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
          Accepted: .txt · .pdf · .csv · .log · Max size: 10 MB
        </p>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px" }}>

        {/* File selector */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>SELECT FILE</label>
          <input
            type="file"
            accept=".txt,.pdf,.csv,.log"
            onChange={handleFileChange}
            style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block" }}
          />
          {file && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
              {file.name} · {formatSize(file.size)}
            </div>
          )}
        </div>

        {/* Upload button with spinner */}
        <button
          onClick={uploadToBackend}
          disabled={loading || !file}
          style={{
            padding: "8px 20px", display: "flex", alignItems: "center", gap: "8px",
            opacity: loading || !file ? 0.6 : 1,
            cursor: loading || !file ? "not-allowed" : "pointer"
          }}
        >
          {loading && (
            <span style={{ display: "inline-block", width: "13px", height: "13px", border: "2px solid var(--border-bright)", borderTopColor: "var(--text-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
          )}
          {loading ? "Uploading…" : "Upload & Generate Hash"}
        </button>

        {/* Error */}
        {error && (
          <div style={{ marginTop: "16px", padding: "10px 14px", background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: "var(--radius)", color: "var(--red)", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ padding: "10px 14px", background: "var(--green-bg)", border: "1px solid var(--green)", borderRadius: "var(--radius)", color: "var(--green)", fontSize: "13px", marginBottom: "16px" }}>
              Uploaded successfully — Evidence ID #{result.id}
            </div>

            {/* Hash display with copy button */}
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>SHA-256 HASH</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "10px 12px", borderRadius: "var(--radius)", color: "var(--accent)", wordBreak: "break-all" }}>
                  {result.hash}
                </div>
                <button
                  onClick={copyHash}
                  title="Copy hash to clipboard"
                  style={{ padding: "8px 12px", fontSize: "12px", flexShrink: 0, background: copied ? "var(--green-bg)" : "var(--bg-surface)", borderColor: copied ? "var(--green)" : "var(--border-bright)", color: copied ? "var(--green)" : "var(--text-muted)" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* View evidence link */}
            <button
              onClick={() => navigate(`/evidence/${result.id}`)}
              style={{ fontSize: "12px", padding: "5px 14px", background: "var(--accent-glow)", borderColor: "var(--accent-dim)", color: "var(--accent)" }}
            >
              View Evidence Details →
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const labelStyle = { display: "block", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "6px" }

export default UploadEvidence
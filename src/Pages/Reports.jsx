import { useEffect, useState } from "react"

function Reports() {
  const [evidence, setEvidence] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")

  const auth    = JSON.parse(sessionStorage.getItem("dems_auth") || "{}")
  const isAdmin = auth.role === "Admin"

  useEffect(() => {
    fetch("http://127.0.0.1:8000/evidence")
      .then(async r => {
        if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e.detail||`Error ${r.status}`) }
        return r.json()
      })
      .then(d => { setEvidence(Array.isArray(d)?d:[]); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const total    = evidence.length
  const tampered = evidence.filter(e=>e.status==="Tampered")
  const verified = evidence.filter(e=>e.status==="Verified")
  const highRisk = evidence.filter(e=>e.risk>=70)
  const avgRisk  = total ? Math.round(evidence.reduce((s,e)=>s+e.risk,0)/total) : 0
  const intPct   = total ? +((verified.length/total)*100).toFixed(1) : 0

  if (loading) return <div style={{padding:"40px",color:"var(--text-muted)"}}>Loading…</div>
  if (error)   return (
    <div style={{padding:"40px",color:"var(--red)"}}>
      Failed to load: {error}
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          body,*{background:white!important;color:black!important;border-color:#ccc!important}
          .no-print{display:none!important}
          .print-show{display:block!important}
          h1{font-size:20px!important}
        }
        .print-show{display:none}
      `}</style>

      <div style={{maxWidth:"800px"}}>
        <div className="print-show" style={{marginBottom:"16px"}}>
          <h1>DEMS — Audit Report</h1>
          <p style={{fontSize:"12px"}}>Generated: {new Date().toLocaleString()} · {auth.role}: {auth.username}</p>
          <hr/>
        </div>

        <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px"}}>
          <div>
            <h1>Reports</h1>
            <p style={{color:"var(--text-muted)",fontSize:"13px",marginTop:"4px"}}>
              System integrity summary
              {isAdmin && <span style={{marginLeft:"8px",color:"var(--accent)",fontSize:"12px"}}>(Admin view)</span>}
            </p>
          </div>
          <button onClick={()=>window.print()} style={{fontSize:"12px",padding:"6px 16px",background:"var(--accent-glow)",borderColor:"var(--accent-dim)",color:"var(--accent)"}}>
            Export PDF
          </button>
        </div>

        {/* Integrity bar */}
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"18px 22px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"11px",color:"var(--text-muted)",letterSpacing:"0.06em"}}>INTEGRITY RATE</span>
            <span style={{fontSize:"13px",fontWeight:600,color:intPct>=80?"var(--green)":intPct>=50?"var(--orange)":"var(--red)"}}>{intPct}%</span>
          </div>
          <div style={{height:"10px",background:"var(--border)",borderRadius:"5px",overflow:"hidden"}}>
            <div style={{width:`${intPct}%`,height:"100%",background:intPct>=80?"var(--green)":intPct>=50?"var(--orange)":"var(--red)",borderRadius:"5px"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
            <span style={{fontSize:"11px",color:"var(--green)"}}>{verified.length} verified</span>
            <span style={{fontSize:"11px",color:"var(--red)"}}>{tampered.length} tampered</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden",marginBottom:"18px"}}>
          {[
            ["Total evidence files",   total],
            ["Verified files",         verified.length],
            ["Tampered files",         tampered.length],
            ["High risk files (≥70)",  highRisk.length],
            ["Average risk score",     `${avgRisk}/100`],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{padding:"13px 20px",borderBottom:i<arr.length-1?"1px solid var(--border)":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"13px",color:"var(--text-secondary)"}}>{label}</span>
              <span style={{fontWeight:600,color:"var(--text-primary)"}}>{value}</span>
            </div>
          ))}
        </div>

        {/* Tampered files */}
        {tampered.length>0 && (
          <section style={{marginBottom:"18px"}}>
            <h2 style={{fontSize:"14px",color:"var(--red)",marginBottom:"10px"}}>Tampered Evidence</h2>
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
              {tampered.map((item,i)=>(
                <div key={item.id} style={{padding:"11px 18px",borderBottom:i<tampered.length-1?"1px solid var(--border)":"none",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"12px"}}>{item.file_name}</span>
                  <div style={{display:"flex",gap:"14px"}}>
                    <span style={{fontSize:"12px",color:"var(--text-muted)"}}>ID #{item.id}</span>
                    <span style={{fontSize:"12px",color:"var(--red)",fontWeight:500}}>Risk: {item.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* High risk — admin only */}
        {isAdmin && highRisk.length>0 && (
          <section style={{marginBottom:"18px"}}>
            <h2 style={{fontSize:"14px",color:"var(--orange)",marginBottom:"10px"}}>High Risk Files (Admin)</h2>
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
              {highRisk.map((item,i)=>(
                <div key={item.id} style={{padding:"11px 18px",borderBottom:i<highRisk.length-1?"1px solid var(--border)":"none",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"12px"}}>{item.file_name}</span>
                  <div style={{display:"flex",gap:"14px"}}>
                    <span style={{fontSize:"12px",color:"var(--text-muted)"}}>{item.status}</span>
                    <span style={{fontSize:"12px",color:"var(--orange)",fontWeight:500}}>Score: {item.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <p style={{fontSize:"11px",color:"var(--text-muted)",fontFamily:"'JetBrains Mono',monospace"}}>
          Generated: {new Date().toLocaleString()} · {auth.role}: {auth.username}
        </p>
      </div>
    </>
  )
}

export default Reports
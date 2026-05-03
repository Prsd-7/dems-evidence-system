// Final EvidenceManagement — global fetch error handling, disabled verify during request
import { useEffect, useState, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"

const getRiskBadge = (s) => s >= 70
  ? { label:"High",   color:"var(--red)",    bg:"var(--red-bg)" }
  : s >= 30
  ? { label:"Medium", color:"var(--orange)", bg:"var(--orange-bg)" }
  : { label:"Low",    color:"var(--green)",  bg:"var(--green-bg)" }

const fmtSize = (b) => !b ? "—"
  : b < 1024 ? `${b} B`
  : b < 1048576 ? `${(b/1024).toFixed(1)} KB`
  : `${(b/1048576).toFixed(1)} MB`

const PAGE = 10

function EvidenceManagement() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")
  const [verifying, setVerifying] = useState(null)
  const [search,  setSearch]  = useState("")
  const [debQ,    setDebQ]    = useState("")
  const [fStatus, setFStatus] = useState("All")
  const [fRisk,   setFRisk]   = useState("All")
  const [sortKey, setSortKey] = useState("time")
  const [sortDir, setSortDir] = useState("desc")
  const [page,    setPage]    = useState(1)
  const debRef  = useRef(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true); setError("")
    fetch("http://127.0.0.1:8000/evidence")
      .then(async r => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          throw new Error(e.detail || `Server error ${r.status}`)
        }
        return r.json()
      })
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const onSearch = (v) => {
    setSearch(v)
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDebQ(v); setPage(1) }, 300)
  }

  const verify = async (id, name) => {
    if (!window.confirm(`Verify integrity of "${name}"?\n\nThis will recompute SHA-256 and update risk score.`)) return
    setVerifying(id)
    try {
      const r = await fetch(`http://127.0.0.1:8000/verify/${id}`)
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.detail || `Verify failed (${r.status})`)
      }
      const d = await r.json()
      alert(`Status: ${d.status}\nRisk: ${d.risk}/100\nBlock: #${d.block_index}\n\n${d.explanation}`)
      load()
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setVerifying(null)
    }
  }

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d==="asc"?"desc":"asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  const rows = useMemo(() => {
    let r = [...data]
    if (debQ.trim()) { const q=debQ.toLowerCase(); r=r.filter(e=>e.file_name.toLowerCase().includes(q)) }
    if (fStatus!=="All") r=r.filter(e=>e.status===fStatus)
    if (fRisk==="High")   r=r.filter(e=>e.risk>=70)
    if (fRisk==="Medium") r=r.filter(e=>e.risk>=30&&e.risk<70)
    if (fRisk==="Low")    r=r.filter(e=>e.risk<30)
    r.sort((a,b)=>{
      let va=a[sortKey], vb=b[sortKey]
      if (sortKey==="time"){va=new Date(va);vb=new Date(vb)}
      return (va<vb?-1:va>vb?1:0)*(sortDir==="asc"?1:-1)
    })
    return r
  }, [data, debQ, fStatus, fRisk, sortKey, sortDir])

  const pages    = Math.max(1, Math.ceil(rows.length/PAGE))
  const pageRows = rows.slice((page-1)*PAGE, page*PAGE)
  const SI = ({col}) => sortKey!==col
    ? <span style={{opacity:0.3,marginLeft:3}}>⇅</span>
    : <span style={{marginLeft:3}}>{sortDir==="asc"?"↑":"↓"}</span>

  const filtersOn = debQ || fStatus!=="All" || fRisk!=="All"

  return (
    <div style={{maxWidth:"1300px"}}>
      <div style={{marginBottom:"18px"}}>
        <h1>Evidence Management</h1>
        <p style={{color:"var(--text-muted)",fontSize:"13px",marginTop:"4px"}}>
          {loading ? "Loading…" : `${rows.length} of ${data.length} file${data.length!==1?"s":""}${filtersOn?" (filtered)":""}`}
        </p>
      </div>

      {/* Global fetch error */}
      {error && (
        <div style={{padding:"10px 14px",background:"var(--red-bg)",border:"1px solid var(--red)",borderRadius:"var(--radius)",color:"var(--red)",fontSize:"13px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{error}</span>
          <button onClick={load} style={{fontSize:"12px",padding:"3px 10px",borderColor:"var(--red)",color:"var(--red)"}}>Retry</button>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:"10px",marginBottom:"12px",flexWrap:"wrap",background:"var(--bg-card)",padding:"12px 14px",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)"}}>
        <input type="text" placeholder="Search by file name…" value={search} onChange={e=>onSearch(e.target.value)}
          style={{flex:1,minWidth:"180px",padding:"6px 12px",background:"var(--bg-surface)",border:"1px solid var(--border-bright)",borderRadius:"var(--radius)",color:"var(--text-primary)",fontSize:"13px",fontFamily:"inherit"}}/>
        <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1)}} style={sel}>
          <option>All</option><option>Verified</option><option>Tampered</option><option>Stored</option>
        </select>
        <select value={fRisk} onChange={e=>{setFRisk(e.target.value);setPage(1)}} style={sel}>
          <option value="All">All Risk</option><option value="High">High (≥70)</option><option value="Medium">Medium (30–69)</option><option value="Low">Low (&lt;30)</option>
        </select>
        {filtersOn && <button onClick={()=>{setSearch("");setDebQ("");setFStatus("All");setFRisk("All");setPage(1)}} style={{fontSize:"12px",padding:"6px 12px",color:"var(--text-muted)"}}>Clear</button>}
      </div>

      {/* Table */}
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid var(--border)"}}>
              <th style={th}>ID</th>
              <th style={{...th,cursor:"pointer"}} onClick={()=>sort("file_name")}>File Name <SI col="file_name"/></th>
              <th style={th}>Hash</th>
              <th style={{...th,cursor:"pointer"}} onClick={()=>sort("status")}>Status <SI col="status"/></th>
              <th style={{...th,cursor:"pointer"}} onClick={()=>sort("time")}>Uploaded <SI col="time"/></th>
              <th style={th}>Size</th>
              <th style={{...th,cursor:"pointer"}} onClick={()=>sort("risk")}>Risk <SI col="risk"/></th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={ctr}><span className="spinner" style={{marginRight:"8px"}}/> Loading…</td></tr>
            ) : pageRows.length===0 ? (
              <tr><td colSpan="8" style={ctr}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",padding:"12px 0"}}>
                  <span style={{fontSize:"24px",opacity:0.3}}>◻</span>
                  <span>{filtersOn ? "No evidence matches your filters." : "No evidence uploaded yet."}</span>
                  {filtersOn && <button onClick={()=>{setSearch("");setDebQ("");setFStatus("All");setFRisk("All")}} style={{fontSize:"12px",padding:"4px 12px",marginTop:"4px"}}>Clear filters</button>}
                </div>
              </td></tr>
            ) : pageRows.map(item => {
              const b = getRiskBadge(item.risk)
              const isVer = verifying===item.id
              return (
                <tr key={item.id}
                  style={{borderBottom:"1px solid var(--border)",transition:"background 0.12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg-hover)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...td,color:"var(--text-muted)",fontFamily:"'JetBrains Mono',monospace"}}>#{item.id}</td>
                  <td style={td}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"12px"}}>{item.file_name}</span></td>
                  <td style={td}>
                    <span title={`Full hash:\n${item.hash}`} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",color:"var(--text-muted)",background:"var(--bg-surface)",padding:"2px 6px",borderRadius:"4px",cursor:"help"}}>
                      {item.hash?.slice(0,18)}…
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{color:item.status==="Verified"?"var(--green)":item.status==="Tampered"?"var(--red)":"var(--text-secondary)",fontWeight:500,fontSize:"12px"}}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{...td,color:"var(--text-muted)",fontSize:"12px"}}>{item.time?.slice(0,19)}</td>
                  <td style={{...td,color:"var(--text-muted)",fontSize:"12px",fontFamily:"'JetBrains Mono',monospace"}}>{fmtSize(item.file_size)}</td>
                  <td style={td}>
                    <span title={`Score: ${item.risk}/100\n0–29 Low · 30–69 Medium · 70–100 High`}
                      style={{background:b.bg,color:b.color,padding:"3px 10px",borderRadius:"12px",fontSize:"12px",fontWeight:500,cursor:"help"}}>
                      {b.label} ({item.risk})
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{display:"flex",gap:"6px"}}>
                      <button onClick={()=>navigate(`/evidence/${item.id}`)} style={{fontSize:"12px",padding:"4px 10px"}}>View</button>
                      <button onClick={()=>verify(item.id,item.file_name)} disabled={isVer}
                        style={{fontSize:"12px",padding:"4px 10px",background:"var(--accent-glow)",borderColor:"var(--accent-dim)",color:"var(--accent)",display:"flex",alignItems:"center",gap:"5px",opacity:isVer?0.6:1,cursor:isVer?"not-allowed":"pointer"}}>
                        {isVer && <span className="spinner" style={{width:"10px",height:"10px",borderWidth:"1.5px"}}/>}
                        {isVer?"Verifying…":"Verify"}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages>1 && (
        <div style={{display:"flex",justifyContent:"center",gap:"6px",marginTop:"14px"}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{fontSize:"12px",padding:"4px 12px",opacity:page===1?0.4:1}}>← Prev</button>
          {Array.from({length:pages},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={{fontSize:"12px",padding:"4px 10px",background:p===page?"var(--accent-glow)":"var(--bg-card)",borderColor:p===page?"var(--accent-dim)":"var(--border-bright)",color:p===page?"var(--accent)":"var(--text-secondary)"}}>{p}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{fontSize:"12px",padding:"4px 12px",opacity:page===pages?0.4:1}}>Next →</button>
        </div>
      )}
    </div>
  )
}

const th  = {padding:"10px 13px",textAlign:"left",fontSize:"11px",color:"var(--text-muted)",letterSpacing:"0.06em",fontWeight:500}
const td  = {padding:"11px 13px",fontSize:"13px",color:"var(--text-primary)"}
const ctr = {padding:"32px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px"}
const sel = {background:"var(--bg-surface)",border:"1px solid var(--border-bright)",borderRadius:"var(--radius)",padding:"6px 10px",color:"var(--text-primary)",fontSize:"13px",fontFamily:"inherit",cursor:"pointer"}

export default EvidenceManagement
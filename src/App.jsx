import { useState, useRef, useEffect } from "react";

// ─── DEFAULTS ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  usuarios: [
    { id: "u1", nombre: "Alberto Pavón", email: "alberto.pavon@hiloo.es" },
    { id: "u2", nombre: "César Soto",    email: "cesar.soto@hiloo.es"   },
  ],
  clientes: [
    { id: "c1", codigo: "AD", nombre: "Administración" },
    { id: "c2", codigo: "NO", nombre: "Nóminas" },
    { id: "c3", codigo: "SG", nombre: "Seguros" },
  ],
  proyectos: [{ id: "p1", codigo: "PRY01", nombre: "Proyecto Base" }],
  posiciones: [
    { id: "ps1", nombre: "Administrativo", costeInterno: 25,  costeFacturacion: 40  },
    { id: "ps2", nombre: "Técnico",        costeInterno: 45,  costeFacturacion: 70  },
    { id: "ps3", nombre: "Senior",         costeInterno: 70,  costeFacturacion: 110 },
    { id: "ps4", nombre: "Dirección",      costeInterno: 95,  costeFacturacion: 150 },
  ],
  tipos: [
    { id: "t1", nombre: "Reunión" },
    { id: "t2", nombre: "Mantenimiento" },
    { id: "t3", nombre: "Desarrollo" },
    { id: "t4", nombre: "Formación" },
    { id: "t5", nombre: "Soporte" },
    { id: "t6", nombre: "Gestión" },
  ],
};

const TODAY = () => new Date().toISOString().slice(0, 10);
const MONTH_START = () => new Date().toISOString().slice(0, 7) + "-01";

function snap15(time) {
  const [h, m] = time.split(":").map(Number);
  const s = Math.round(m / 15) * 15;
  const hh = s === 60 ? h + 1 : h, mm = s === 60 ? 0 : s;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}
function minutesBetween(s, e) {
  const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number);
  return Math.max(0, eh*60+em-(sh*60+sm));
}
function formatDuration(mins) {
  const h=Math.floor(mins/60),m=mins%60;
  if(!h) return `${m}m`; if(!m) return `${h}h`; return `${h}h ${m}m`;
}
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

const TIME_OPTIONS=[];
for(let h=0;h<24;h++) for(let m=0;m<60;m+=15)
  TIME_OPTIONS.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);

function loadLS(key, fallback) {
  try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key,JSON.stringify(value)); } catch {}
}

// ─── AUTOCOMPLETE ──────────────────────────────────────────────────────────
function AutoComplete({ value, onChange, items, placeholder }) {
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState(value||"");
  const ref=useRef(null);
  useEffect(()=>{ setQ(value||""); },[value]);
  const filtered = q.length===0 ? items : items.filter(it=>
    it.label.toLowerCase().includes(q.toLowerCase())||
    (it.sub&&it.sub.toLowerCase().includes(q.toLowerCase()))
  );
  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  function select(item){ setQ(item.label); onChange(item.value); setOpen(false); }
  return(
    <div ref={ref} style={{position:"relative",flex:1,minWidth:0}}>
      <input value={q}
        onChange={e=>{ setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder} style={S.input} autoComplete="off"/>
      {open&&filtered.length>0&&(
        <div style={S.acDrop}>
          {filtered.map(it=>(
            <div key={it.value} onMouseDown={()=>select(it)} style={S.acItem}>
              {it.sub&&<span style={S.acBadge}>{it.sub}</span>}
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function UserSelector({ usuarios, onSelect }) {
  return(
    <div style={S.loginScreen}>
      <div style={S.loginCard}>
        <div style={{fontSize:48,marginBottom:8}}>⏱</div>
        <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",color:"#0f172a"}}>Horas Hiloo</h1>
        <p style={{fontSize:14,color:"#64748b",marginBottom:32}}>Selecciona tu cuenta para continuar</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}>
          {usuarios.map(u=>(
            <button key={u.id} onClick={()=>onSelect(u)} style={S.loginBtn}>
              <div style={S.loginAvatar}>{u.nombre.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
              <div style={{textAlign:"left"}}>
                <div style={{fontWeight:600,fontSize:15,color:"#0f172a"}}>{u.nombre}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{u.email}</div>
              </div>
            </button>
          ))}
        </div>
        <p style={{fontSize:11,color:"#94a3b8",marginTop:24,textAlign:"center"}}>
          Integración SSO con Microsoft 365 disponible como siguiente paso
        </p>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [entries,setEntries]         = useState(()=>loadLS("hh:entries",[]));
  const [config,setConfig]           = useState(()=>loadLS("hh:config",DEFAULT_CONFIG));
  const [currentUser,setCurrentUser] = useState(()=>loadLS("hh:user",null));
  const [view,setView]               = useState("registro");
  const [modal,setModal]             = useState(null);
  const [toast,setToast]             = useState(null);

  // Registro filters
  const [regModo,setRegModo]       = useState("dia");
  const [regFecha,setRegFecha]     = useState(TODAY());
  const [regDesde,setRegDesde]     = useState(MONTH_START());
  const [regHasta,setRegHasta]     = useState(TODAY());
  const [regUsuario,setRegUsuario] = useState("Todos");
  const [regCliente,setRegCliente] = useState("Todos");

  // Resumen filters
  const [resDesde,setResDesde] = useState(MONTH_START());
  const [resHasta,setResHasta] = useState(TODAY());

  function showToast(msg,type="ok"){ setToast({msg,type}); setTimeout(()=>setToast(null),2500); }
  function handleSelectUser(u){ setCurrentUser(u); saveLS("hh:user",u); }
  function handleLogout(){ setCurrentUser(null); saveLS("hh:user",null); }

  function makeEmpty(){
    return{id:null,fecha:TODAY(),usuario:currentUser?.nombre||"",
      cliente:"",proyecto:"",posicion:"",tipo:"",
      facturable:false,horaInicio:"09:00",horaFin:"09:15",observaciones:""};
  }

  function handleSave(entry){
    const next=entry.id
      ?entries.map(e=>e.id===entry.id?entry:e)
      :[...entries,{...entry,id:genId()}];
    setEntries(next); saveLS("hh:entries",next);
    setModal(null); showToast(entry.id?"Entrada actualizada":"Entrada guardada");
  }

  function handleDelete(id){
    const next=entries.filter(e=>e.id!==id);
    setEntries(next); saveLS("hh:entries",next);
    showToast("Entrada eliminada","warn");
  }

  function handleSaveConfig(cfg){ setConfig(cfg); saveLS("hh:config",cfg); showToast("Configuración guardada"); }

  const filteredReg = entries.filter(e=>{
    if(regModo==="dia"){ if(e.fecha!==regFecha) return false; }
    else { if(e.fecha<regDesde||e.fecha>regHasta) return false; }
    if(regUsuario!=="Todos"&&e.usuario!==regUsuario) return false;
    if(regCliente!=="Todos"&&e.cliente!==regCliente) return false;
    return true;
  }).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.horaInicio.localeCompare(b.horaInicio));

  const filteredRes = entries.filter(e=>e.fecha>=resDesde&&e.fecha<=resHasta);

  const resStats=(()=>{
    const byUsuario={},byCliente={};
    let totalMins=0,factMins=0,costInt=0,costFact=0;
    filteredRes.forEach(e=>{
      const mins=minutesBetween(e.horaInicio,e.horaFin);
      totalMins+=mins; if(e.facturable) factMins+=mins;
      const p=config.posiciones.find(p=>p.nombre===e.posicion);
      costInt +=(mins/60)*(p?.costeInterno||0);
      costFact+=(mins/60)*(p?.costeFacturacion||0);
      byUsuario[e.usuario]=(byUsuario[e.usuario]||0)+mins;
      byCliente[e.cliente||"Sin cliente"]=(byCliente[e.cliente||"Sin cliente"]||0)+mins;
    });
    return{totalMins,factMins,costInt,costFact,byUsuario,byCliente};
  })();

  const allClientes=["Todos",...Array.from(new Set(entries.map(e=>e.cliente).filter(Boolean)))];

  if(!currentUser) return <UserSelector usuarios={config.usuarios} onSelect={handleSelectUser}/>;

  return(
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}><span style={{fontSize:22}}>⏱</span><span style={S.logoText}>Horas Hiloo</span></div>
          <nav style={S.nav}>
            {[{k:"registro",l:"📋 Registro"},{k:"resumen",l:"📊 Resumen"},{k:"config",l:"⚙️ Config"}].map(({k,l})=>(
              <button key={k} onClick={()=>setView(k)} style={{...S.navBtn,...(view===k?S.navBtnActive:{})}}>{l}</button>
            ))}
          </nav>
          <button onClick={handleLogout} style={S.userChip} title="Cambiar usuario">
            <span style={S.userAvatar}>{currentUser.nombre.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
            <span style={{fontSize:13,color:"#cbd5e1",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.nombre}</span>
          </button>
        </div>
      </header>

      <main style={S.main}>

        {/* ══ REGISTRO ══ */}
        {view==="registro"&&(
          <div>
            <div style={S.filtersBar}>
              <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1.5px solid #e2e8f0",flexShrink:0}}>
                {[{v:"dia",l:"📅 Día"},{v:"rango",l:"📆 Rango"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setRegModo(v)}
                    style={{padding:"7px 14px",border:"none",cursor:"pointer",fontSize:13,fontWeight:500,
                      background:regModo===v?"#1d4ed8":"#fff",color:regModo===v?"#fff":"#475569"}}>
                    {l}
                  </button>
                ))}
              </div>

              {regModo==="dia"?(
                <FG label="Fecha">
                  <input type="date" value={regFecha} onChange={e=>setRegFecha(e.target.value)} style={S.filterInput}/>
                </FG>
              ):(
                <>
                  <FG label="Desde"><input type="date" value={regDesde} onChange={e=>setRegDesde(e.target.value)} style={S.filterInput}/></FG>
                  <FG label="Hasta"><input type="date" value={regHasta} onChange={e=>setRegHasta(e.target.value)} style={S.filterInput}/></FG>
                </>
              )}

              <FG label="Usuario">
                <select value={regUsuario} onChange={e=>setRegUsuario(e.target.value)} style={S.filterInput}>
                  <option>Todos</option>
                  {config.usuarios.map(u=><option key={u.id}>{u.nombre}</option>)}
                </select>
              </FG>
              <FG label="Cliente">
                <select value={regCliente} onChange={e=>setRegCliente(e.target.value)} style={S.filterInput}>
                  {allClientes.map(c=><option key={c}>{c}</option>)}
                </select>
              </FG>
              <button style={S.btnPrimary} onClick={()=>setModal({mode:"new",data:makeEmpty()})}>+ Nueva entrada</button>
            </div>

            {filteredReg.length>0&&(
              <div style={S.dayTotals}>
                {regModo==="rango"&&<span style={{marginRight:8,color:"#1e40af"}}>{filteredReg.length} entradas · </span>}
                Total: <strong>{formatDuration(filteredReg.reduce((a,e)=>a+minutesBetween(e.horaInicio,e.horaFin),0))}</strong>
                <span style={{marginLeft:16}}>Facturable: <strong style={{color:"#16a34a"}}>{formatDuration(filteredReg.filter(e=>e.facturable).reduce((a,e)=>a+minutesBetween(e.horaInicio,e.horaFin),0))}</strong></span>
              </div>
            )}

            {filteredReg.length===0?(
              <div style={S.empty}>
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <p>No hay entradas para este período.</p>
                <button style={S.btnPrimary} onClick={()=>setModal({mode:"new",data:makeEmpty()})}>+ Añadir primera entrada</button>
              </div>
            ):(
              regModo==="dia"?(
                <div style={S.entriesGrid}>
                  {filteredReg.map(e=>(
                    <EntryCard key={e.id} entry={e} showDate={false}
                      onEdit={()=>setModal({mode:"edit",data:e})}
                      onDelete={()=>handleDelete(e.id)}
                      onCopy={()=>{const{id,...rest}=e;setModal({mode:"copy",data:{...rest,id:null}});}}
                    />
                  ))}
                </div>
              ):(
                <div style={S.tableWrap}>
                  <div style={{overflowX:"auto"}}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {["Fecha","Usuario","Cliente","Proyecto","Posición","Tipo","Inicio","Fin","Duración","Fact.","Obs.",""].map(h=>(
                            <th key={h} style={S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReg.map(e=>(
                          <EntryRow key={e.id} entry={e}
                            onEdit={()=>setModal({mode:"edit",data:e})}
                            onDelete={()=>handleDelete(e.id)}
                            onCopy={()=>{const{id,...rest}=e;setModal({mode:"copy",data:{...rest,id:null}});}}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ══ RESUMEN ══ */}
        {view==="resumen"&&(
          <div>
            <div style={S.filtersBar}>
              <FG label="Desde"><input type="date" value={resDesde} onChange={e=>setResDesde(e.target.value)} style={S.filterInput}/></FG>
              <FG label="Hasta"><input type="date" value={resHasta} onChange={e=>setResHasta(e.target.value)} style={S.filterInput}/></FG>
            </div>
            <div style={S.statsGrid}>
              <StatCard label="Total horas"         value={formatDuration(resStats.totalMins)}  icon="⏱" color="#2563eb"/>
              <StatCard label="Horas facturables"   value={formatDuration(resStats.factMins)}   icon="💶" color="#16a34a"/>
              <StatCard label="Coste interno"       value={`${resStats.costInt.toFixed(0)}€`}   icon="🏭" color="#9333ea"/>
              <StatCard label="Importe facturación" value={`${resStats.costFact.toFixed(0)}€`}  icon="📈" color="#dc2626"/>
            </div>
            <div style={S.resumenCols}>
              <div style={S.resumenBlock}>
                <h3 style={S.resumenTitle}>Por usuario</h3>
                {Object.entries(resStats.byUsuario).map(([p,m])=><BarRow key={p} label={p} mins={m} total={resStats.totalMins}/>)}
                {!Object.keys(resStats.byUsuario).length&&<p style={{color:"#9ca3af",fontSize:14}}>Sin datos</p>}
              </div>
              <div style={S.resumenBlock}>
                <h3 style={S.resumenTitle}>Por cliente</h3>
                {Object.entries(resStats.byCliente).map(([c,m])=><BarRow key={c} label={c} mins={m} total={resStats.totalMins}/>)}
                {!Object.keys(resStats.byCliente).length&&<p style={{color:"#9ca3af",fontSize:14}}>Sin datos</p>}
              </div>
            </div>
            {filteredRes.length>0&&(
              <div style={S.tableWrap}>
                <h3 style={S.resumenTitle}>Detalle de entradas</h3>
                <div style={{overflowX:"auto"}}>
                  <table style={S.table}>
                    <thead>
                      <tr>{["Fecha","Usuario","Cliente","Proyecto","Posición","Tipo","Inicio","Fin","Duración","Fact.","C.Interno","C.Factura","Obs."].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredRes.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.horaInicio.localeCompare(b.horaInicio)).map(e=>{
                        const mins=minutesBetween(e.horaInicio,e.horaFin);
                        const p=config.posiciones.find(p=>p.nombre===e.posicion);
                        const ci=((mins/60)*(p?.costeInterno||0)).toFixed(0);
                        const cf=((mins/60)*(p?.costeFacturacion||0)).toFixed(0);
                        return(
                          <tr key={e.id}>
                            <td style={S.td}>{e.fecha}</td><td style={S.td}>{e.usuario}</td>
                            <td style={S.td}>{e.cliente||"—"}</td><td style={S.td}>{e.proyecto||"—"}</td>
                            <td style={S.td}>{e.posicion?<PosTag pos={e.posicion}/>:"—"}</td>
                            <td style={S.td}>{e.tipo||"—"}</td>
                            <td style={S.td}>{e.horaInicio}</td><td style={S.td}>{e.horaFin}</td>
                            <td style={S.td}><strong>{formatDuration(mins)}</strong></td>
                            <td style={S.td}>{e.facturable?<span style={{color:"#16a34a"}}>✔</span>:<span style={{color:"#9ca3af"}}>—</span>}</td>
                            <td style={S.td}>{ci}€</td>
                            <td style={S.td}>{e.facturable?<strong style={{color:"#16a34a"}}>{cf}€</strong>:<span style={{color:"#9ca3af"}}>—</span>}</td>
                            <td style={{...S.td,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.observaciones||"—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CONFIG ══ */}
        {view==="config"&&<ConfigView config={config} onSave={handleSaveConfig}/>}

      </main>

      {modal&&<EntryModal mode={modal.mode} initialData={modal.data} config={config} onSave={handleSave} onClose={()=>setModal(null)}/>}
      {toast&&<div style={{...S.toast,background:toast.type==="warn"?"#dc2626":"#16a34a"}}>{toast.msg}</div>}
    </div>
  );
}

function FG({label,children}){
  return <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:120}}><label style={S.filterLabel}>{label}</label>{children}</div>;
}

// ─── ENTRY CARD ────────────────────────────────────────────────────────────
function EntryCard({entry,onEdit,onDelete,onCopy}){
  const [confirmDel,setConfirmDel]=useState(false);
  const mins=minutesBetween(entry.horaInicio,entry.horaFin);
  return(
    <div style={S.card}>
      <div style={S.cardTop}>
        <span style={S.cardTime}>{entry.horaInicio} – {entry.horaFin}</span>
        <span style={S.cardDur}>{formatDuration(mins)}</span>
        <div style={{display:"flex",gap:6,marginLeft:"auto",alignItems:"center"}}>
          {confirmDel?(
            <>
              <span style={{fontSize:13,color:"#dc2626",fontWeight:600}}>¿Eliminar?</span>
              <button style={{...S.iconBtn,background:"#fee2e2",color:"#dc2626",borderRadius:6,padding:"3px 10px",fontSize:13,fontWeight:600}}
                onClick={()=>{onDelete();setConfirmDel(false);}}>Sí</button>
              <button style={{...S.iconBtn,background:"#f1f5f9",color:"#475569",borderRadius:6,padding:"3px 10px",fontSize:13}}
                onClick={()=>setConfirmDel(false)}>No</button>
            </>
          ):(
            <>
              <button style={S.iconBtn} onClick={onCopy}  title="Duplicar">⧉</button>
              <button style={S.iconBtn} onClick={onEdit}  title="Editar">✏️</button>
              <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>setConfirmDel(true)} title="Eliminar">🗑</button>
            </>
          )}
        </div>
      </div>
      <div style={S.cardMeta}>
        <span style={S.chip}>{entry.usuario}</span>
        {entry.cliente&&<span style={{...S.chip,background:"#dbeafe",color:"#1d4ed8"}}>{entry.cliente}</span>}
        {entry.proyecto&&<span style={{...S.chip,background:"#fef9c3",color:"#854d0e"}}>{entry.proyecto}</span>}
        {entry.posicion&&<PosTag pos={entry.posicion}/>}
        {entry.tipo&&<span style={{...S.chip,background:"#f3e8ff",color:"#7c3aed"}}>{entry.tipo}</span>}
        {entry.facturable
          ?<span style={{...S.chip,background:"#dcfce7",color:"#15803d"}}>💶 Facturable</span>
          :<span style={{...S.chip,background:"#f3f4f6",color:"#6b7280"}}>🔒 Interno</span>}
      </div>
      {entry.observaciones&&<p style={S.cardObs}>{entry.observaciones}</p>}
    </div>
  );
}

// ─── ENTRY ROW (tabla rango) ────────────────────────────────────────────────
function EntryRow({entry,onEdit,onDelete,onCopy}){
  const [confirmDel,setConfirmDel]=useState(false);
  const mins=minutesBetween(entry.horaInicio,entry.horaFin);
  return(
    <tr style={{borderBottom:"1px solid #f1f5f9"}}>
      <td style={S.td}>{entry.fecha}</td>
      <td style={S.td}>{entry.usuario}</td>
      <td style={S.td}>{entry.cliente||"—"}</td>
      <td style={S.td}>{entry.proyecto||"—"}</td>
      <td style={S.td}>{entry.posicion?<PosTag pos={entry.posicion}/>:"—"}</td>
      <td style={S.td}>{entry.tipo||"—"}</td>
      <td style={S.td}>{entry.horaInicio}</td>
      <td style={S.td}>{entry.horaFin}</td>
      <td style={S.td}><strong>{formatDuration(mins)}</strong></td>
      <td style={S.td}>{entry.facturable?<span style={{color:"#16a34a"}}>✔</span>:<span style={{color:"#9ca3af"}}>—</span>}</td>
      <td style={{...S.td,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.observaciones||"—"}</td>
      <td style={{...S.td,whiteSpace:"nowrap"}}>
        {confirmDel?(
          <span style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:12,color:"#dc2626",fontWeight:600}}>¿Seguro?</span>
            <button style={{...S.iconBtn,background:"#fee2e2",color:"#dc2626",borderRadius:5,padding:"2px 8px",fontSize:12,fontWeight:600}}
              onClick={()=>{onDelete();setConfirmDel(false);}}>Sí</button>
            <button style={{...S.iconBtn,background:"#f1f5f9",color:"#475569",borderRadius:5,padding:"2px 8px",fontSize:12}}
              onClick={()=>setConfirmDel(false)}>No</button>
          </span>
        ):(
          <span style={{display:"flex",gap:2}}>
            <button style={S.iconBtn} onClick={onCopy}  title="Duplicar">⧉</button>
            <button style={S.iconBtn} onClick={onEdit}  title="Editar">✏️</button>
            <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>setConfirmDel(true)} title="Eliminar">🗑</button>
          </span>
        )}
      </td>
    </tr>
  );
}

const POS_COLORS={Administrativo:{bg:"#f0fdf4",col:"#166534"},Técnico:{bg:"#eff6ff",col:"#1e40af"},Senior:{bg:"#fdf4ff",col:"#701a75"},Dirección:{bg:"#fff7ed",col:"#9a3412"}};
function PosTag({pos}){
  if(!pos) return null;
  const c=POS_COLORS[pos]||{bg:"#f3f4f6",col:"#374151"};
  return <span style={{...S.chip,background:c.bg,color:c.col}}>{pos}</span>;
}
function StatCard({label,value,icon,color}){return(
  <div style={{...S.statCard,borderTop:`4px solid ${color}`}}>
    <div style={{fontSize:26}}>{icon}</div>
    <div style={{fontSize:26,fontWeight:700,color}}>{value}</div>
    <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{label}</div>
  </div>
);}
function BarRow({label,mins,total}){
  const pct=total>0?(mins/total)*100:0;
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
        <span style={{fontWeight:500}}>{label}</span>
        <span style={{color:"#6b7280"}}>{formatDuration(mins)} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{height:8,borderRadius:4,background:"#e5e7eb"}}>
        <div style={{height:"100%",borderRadius:4,background:"#2563eb",width:`${pct}%`,transition:"width .4s"}}/>
      </div>
    </div>
  );
}

// ─── ENTRY MODAL ───────────────────────────────────────────────────────────
function EntryModal({mode,initialData,config,onSave,onClose}){
  const [form,setForm]=useState(initialData);
  const [errors,setErrors]=useState({});
  function set(k,v){ setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})); }
  function handleTimeChange(field,val){
    const snapped=snap15(val); set(field,snapped);
    if(field==="horaInicio"){
      const sm=parseInt(snapped.split(":")[0])*60+parseInt(snapped.split(":")[1]);
      const em=parseInt(form.horaFin.split(":")[0])*60+parseInt(form.horaFin.split(":")[1]);
      if(em<=sm){ const nm=sm+15,h=Math.floor(nm/60),m=nm%60; set("horaFin",`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); }
    }
  }
  function validate(){
    const e={};
    if(!form.fecha)   e.fecha="Requerido";
    if(!form.usuario) e.usuario="Requerido";
    if(minutesBetween(form.horaInicio,form.horaFin)<=0) e.horaFin="Debe ser posterior al inicio";
    return e;
  }
  function handleSubmit(){ const e=validate(); if(Object.keys(e).length){setErrors(e);return;} onSave(form); }
  const dur=minutesBetween(form.horaInicio,form.horaFin);
  const clienteItems  =config.clientes.map(c=>({value:c.nombre,label:c.nombre,sub:c.codigo}));
  const proyectoItems =config.proyectos.map(p=>({value:p.nombre,label:p.nombre,sub:p.codigo}));
  const posicionItems =config.posiciones.map(p=>({value:p.nombre,label:p.nombre,sub:`${p.costeInterno}€`}));
  const tipoItems     =config.tipos.map(t=>({value:t.nombre,label:t.nombre}));
  const usuarioItems  =config.usuarios.map(u=>({value:u.nombre,label:u.nombre,sub:u.email.split("@")[0]}));
  const selPos        =config.posiciones.find(p=>p.nombre===form.posicion);
  return(
    <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={S.modalBox}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{mode==="edit"?"✏️ Editar":mode==="copy"?"⧉ Duplicar":"＋ Nueva entrada"}</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div style={S.formRow}>
            <Field label="Fecha *" error={errors.fecha}>
              <input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)} style={{...S.input,...(errors.fecha?S.inputErr:{})}}/>
            </Field>
            <Field label="Usuario *" error={errors.usuario}>
              <AutoComplete value={form.usuario} onChange={v=>set("usuario",v)} items={usuarioItems} placeholder="Selecciona usuario"/>
            </Field>
          </div>
          <div style={S.formRow}>
            <Field label="Hora inicio">
              <select value={form.horaInicio} onChange={e=>handleTimeChange("horaInicio",e.target.value)} style={S.input}>
                {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Hora fin" error={errors.horaFin}>
              <select value={form.horaFin} onChange={e=>handleTimeChange("horaFin",e.target.value)} style={{...S.input,...(errors.horaFin?S.inputErr:{})}}>
                {TIME_OPTIONS.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Duración">
              <div style={{...S.input,background:"#f9fafb",fontWeight:600,color:dur>0?"#16a34a":"#ef4444",display:"flex",alignItems:"center"}}>
                {dur>0?formatDuration(dur):"⚠ Inválido"}
              </div>
            </Field>
          </div>
          <div style={S.formRow}>
            <Field label="Cliente">
              <AutoComplete value={form.cliente} onChange={v=>set("cliente",v)} items={clienteItems} placeholder="Buscar cliente…"/>
            </Field>
            <Field label="Proyecto">
              <AutoComplete value={form.proyecto} onChange={v=>set("proyecto",v)} items={proyectoItems} placeholder="Buscar proyecto…"/>
            </Field>
          </div>
          <div style={S.formRow}>
            <Field label="Posición">
              <AutoComplete value={form.posicion} onChange={v=>set("posicion",v)} items={posicionItems} placeholder="Escribe la posición…"/>
              {selPos&&(
                <div style={S.costHint}>
                  <span>🏭 Interno: <strong>{selPos.costeInterno}€/h</strong></span>
                  <span>💶 Facturación: <strong>{selPos.costeFacturacion}€/h</strong></span>
                </div>
              )}
            </Field>
            <Field label="Tipo de tarea">
              <AutoComplete value={form.tipo} onChange={v=>set("tipo",v)} items={tipoItems} placeholder="Escribe el tipo…"/>
            </Field>
          </div>
          <Field label="Facturación">
            <div style={{display:"flex",gap:8}}>
              {[false,true].map(v=>(
                <button key={String(v)} onClick={()=>set("facturable",v)}
                  style={{...S.toggleBtn,...(form.facturable===v?(v?S.toggleSi:S.toggleNo):{})}} >
                  {v?"💶 Sí, facturable":"🔒 No facturable"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observaciones">
            <textarea value={form.observaciones} onChange={e=>set("observaciones",e.target.value)}
              style={{...S.input,height:68,resize:"vertical"}} placeholder="Notas adicionales…"/>
          </Field>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={S.btnPrimary} onClick={handleSubmit}>{mode==="edit"?"💾 Guardar cambios":"✔ Añadir entrada"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({label,children,error}){
  return(
    <div style={{flex:1,minWidth:130}}>
      <label style={S.label}>{label}</label>
      {children}
      {error&&<p style={{color:"#ef4444",fontSize:12,marginTop:3}}>{error}</p>}
    </div>
  );
}

// ─── CONFIG SECTIONS (defined OUTSIDE ConfigView to prevent focus loss) ────
function CatalogSection({ listKey, title, icon, fields, color, cfg, setCfg }) {
  const [draft,setDraft] = useState(()=>Object.fromEntries(fields.map(f=>[f.key,""])));
  function addItem(){
    if(!fields.every(f=>!f.required||draft[f.key].trim())) return;
    const item={id:genId(),...Object.fromEntries(fields.map(f=>[f.key,draft[f.key].trim()]))};
    setCfg(c=>({...c,[listKey]:[...c[listKey],item]}));
    setDraft(Object.fromEntries(fields.map(f=>[f.key,""])));
  }
  function removeItem(id){ setCfg(c=>({...c,[listKey]:c[listKey].filter(i=>i.id!==id)})); }
  function updateItem(id,field,value){ setCfg(c=>({...c,[listKey]:c[listKey].map(i=>i.id===id?{...i,[field]:value}:i)})); }
  return(
    <div style={S.configSection}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:20}}>{icon}</span>
        <h3 style={{...S.resumenTitle,marginBottom:0}}>{title}</h3>
        <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{cfg[listKey].length} elemento(s)</span>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:4,paddingLeft:10}}>
        {fields.map(f=>(
          <span key={f.key} style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",
            ...(f.w?{width:f.w,flexShrink:0}:{flex:1})}}>
            {f.label}
          </span>
        ))}
        <span style={{width:28}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
        {cfg[listKey].map(item=>(
          <div key={item.id} style={{...S.catalogRow,borderLeft:`3px solid ${color}`}}>
            {fields.map(f=>(
              <input key={f.key}
                value={item[f.key]||""}
                onChange={e=>updateItem(item.id,f.key,e.target.value)}
                style={{...S.catalogInput,...(f.w?{width:f.w,flexShrink:0}:{flex:1})}}
                placeholder={f.label}/>
            ))}
            <button onClick={()=>removeItem(item.id)} style={S.removeBtn}>✕</button>
          </div>
        ))}
        {!cfg[listKey].length&&<p style={{fontSize:13,color:"#9ca3af",fontStyle:"italic",padding:"4px 0"}}>Sin elementos.</p>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:"1px dashed #e2e8f0",paddingTop:10}}>
        {fields.map(f=>(
          <input key={f.key} value={draft[f.key]}
            onChange={e=>setDraft(d=>({...d,[f.key]:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addItem()}
            style={{...S.input,...(f.w?{width:f.w,flexShrink:0}:{flex:1})}}
            placeholder={`${f.label}${f.required?" *":""}`}/>
        ))}
        <button style={{...S.btnPrimary,background:color,padding:"9px 14px"}} onClick={addItem}>+ Añadir</button>
      </div>
    </div>
  );
}

function UsuariosSection({ cfg, setCfg }) {
  const [draft,setDraft]=useState({nombre:"",email:""});
  function add(){
    if(!draft.nombre.trim()||!draft.email.trim()) return;
    setCfg(c=>({...c,usuarios:[...c.usuarios,{id:genId(),...draft}]}));
    setDraft({nombre:"",email:""});
  }
  function remove(id){ setCfg(c=>({...c,usuarios:c.usuarios.filter(u=>u.id!==id)})); }
  function update(id,field,value){ setCfg(c=>({...c,usuarios:c.usuarios.map(u=>u.id===id?{...u,[field]:value}:u)})); }
  return(
    <div style={S.configSection}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:20}}>👥</span>
        <h3 style={{...S.resumenTitle,marginBottom:0}}>Usuarios</h3>
        <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{cfg.usuarios.length} usuario(s)</span>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:4,paddingLeft:10}}>
        <span style={{flex:1,fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>Nombre</span>
        <span style={{flex:1,fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>Email Office 365</span>
        <span style={{width:28}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
        {cfg.usuarios.map(u=>(
          <div key={u.id} style={{...S.catalogRow,borderLeft:"3px solid #6366f1"}}>
            <input value={u.nombre} onChange={e=>update(u.id,"nombre",e.target.value)}
              style={{...S.catalogInput,flex:1}} placeholder="Nombre"/>
            <input value={u.email} onChange={e=>update(u.id,"email",e.target.value)}
              style={{...S.catalogInput,flex:1}} placeholder="email@hiloo.es"/>
            <button onClick={()=>remove(u.id)} style={S.removeBtn}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,borderTop:"1px dashed #e2e8f0",paddingTop:10}}>
        <input value={draft.nombre} onChange={e=>setDraft(d=>({...d,nombre:e.target.value}))}
          style={{...S.input,flex:1}} placeholder="Nombre *"/>
        <input value={draft.email} onChange={e=>setDraft(d=>({...d,email:e.target.value}))}
          onKeyDown={e=>e.key==="Enter"&&add()}
          style={{...S.input,flex:1}} placeholder="email@hiloo.es *"/>
        <button style={{...S.btnPrimary,background:"#6366f1",padding:"9px 14px"}} onClick={add}>+ Añadir</button>
      </div>
    </div>
  );
}

function ConfigView({ config, onSave }) {
  const [cfg,setCfg] = useState(()=>JSON.parse(JSON.stringify(config)));
  return(
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <UsuariosSection cfg={cfg} setCfg={setCfg}/>
      <CatalogSection title="Clientes" icon="🏢" listKey="clientes" color="#2563eb" cfg={cfg} setCfg={setCfg}
        fields={[{key:"codigo",label:"Código",w:90,required:true},{key:"nombre",label:"Nombre del cliente",required:true}]}/>
      <CatalogSection title="Proyectos" icon="📁" listKey="proyectos" color="#d97706" cfg={cfg} setCfg={setCfg}
        fields={[{key:"codigo",label:"Código",w:90},{key:"nombre",label:"Nombre del proyecto",required:true}]}/>
      <CatalogSection title="Posiciones" icon="🎯" listKey="posiciones" color="#7c3aed" cfg={cfg} setCfg={setCfg}
        fields={[
          {key:"nombre",label:"Posición",required:true},
          {key:"costeInterno",label:"€/h Interno",w:100},
          {key:"costeFacturacion",label:"€/h Facturación",w:120},
        ]}/>
      <CatalogSection title="Tipos de tarea" icon="🏷️" listKey="tipos" color="#059669" cfg={cfg} setCfg={setCfg}
        fields={[{key:"nombre",label:"Tipo de tarea",required:true}]}/>
      <button style={{...S.btnPrimary,width:"100%",padding:"13px 0",fontSize:15,marginTop:4}} onClick={()=>onSave(cfg)}>
        💾 Guardar toda la configuración
      </button>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const S={
  app:{minHeight:"100vh",background:"#f8fafc",fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",color:"#1e293b"},
  loginScreen:{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",padding:16},
  loginCard:{background:"#fff",borderRadius:20,padding:"40px 32px",width:"100%",maxWidth:380,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.1)",display:"flex",flexDirection:"column",alignItems:"center"},
  loginBtn:{display:"flex",alignItems:"center",gap:14,background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"14px 16px",cursor:"pointer",width:"100%"},
  loginAvatar:{width:40,height:40,borderRadius:10,background:"#1d4ed8",color:"#fff",fontWeight:700,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  header:{background:"#0f172a",boxShadow:"0 2px 8px rgba(0,0,0,.2)",position:"sticky",top:0,zIndex:100},
  headerInner:{maxWidth:1100,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",gap:12,height:56},
  logo:{display:"flex",alignItems:"center",gap:8},
  logoText:{fontSize:18,fontWeight:700,color:"#f8fafc",letterSpacing:"-0.5px"},
  nav:{display:"flex",gap:4,flex:1},
  navBtn:{background:"none",border:"none",color:"#94a3b8",padding:"6px 12px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:500},
  navBtnActive:{background:"#1e40af",color:"#fff"},
  userChip:{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.07)",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer"},
  userAvatar:{width:26,height:26,borderRadius:6,background:"#2563eb",color:"#fff",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  main:{maxWidth:1100,margin:"0 auto",padding:"20px 16px 80px"},
  filtersBar:{display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-end",marginBottom:20,background:"#fff",padding:16,borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.08)"},
  filterLabel:{fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"},
  filterInput:{padding:"7px 10px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",fontSize:14,color:"#1e293b",outline:"none"},
  btnPrimary:{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"},
  btnSecondary:{background:"#f1f5f9",color:"#475569",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:500,cursor:"pointer"},
  dayTotals:{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:14,color:"#1e40af"},
  entriesGrid:{display:"flex",flexDirection:"column",gap:10},
  card:{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,.07)",border:"1.5px solid #f1f5f9"},
  cardTop:{display:"flex",alignItems:"center",gap:10,marginBottom:10},
  cardTime:{fontSize:17,fontWeight:700,fontVariantNumeric:"tabular-nums"},
  cardDur:{fontSize:13,color:"#64748b",background:"#f1f5f9",padding:"2px 8px",borderRadius:20},
  cardMeta:{display:"flex",flexWrap:"wrap",gap:6},
  cardObs:{margin:"10px 0 0",fontSize:13,color:"#64748b",borderTop:"1px solid #f1f5f9",paddingTop:8},
  chip:{fontSize:12,fontWeight:500,background:"#f1f5f9",color:"#475569",padding:"2px 10px",borderRadius:20},
  iconBtn:{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4,borderRadius:6,color:"#64748b"},
  empty:{textAlign:"center",padding:"60px 20px",color:"#94a3b8",fontSize:15},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:24},
  statCard:{background:"#fff",borderRadius:12,padding:"20px 16px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",display:"flex",flexDirection:"column",gap:4},
  resumenCols:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginBottom:24},
  resumenBlock:{background:"#fff",borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,.07)"},
  resumenTitle:{fontSize:15,fontWeight:700,marginBottom:14,marginTop:0},
  tableWrap:{background:"#fff",borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,.07)"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:13},
  th:{textAlign:"left",padding:"8px 10px",background:"#f8fafc",color:"#64748b",fontWeight:600,borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"},
  td:{padding:"8px 10px",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16},
  modalBox:{background:"#fff",borderRadius:16,width:"100%",maxWidth:660,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.25)"},
  modalHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px 14px",borderBottom:"1.5px solid #f1f5f9"},
  modalTitle:{margin:0,fontSize:17,fontWeight:700},
  closeBtn:{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af",padding:4},
  modalBody:{padding:"18px 24px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:14},
  modalFooter:{padding:"14px 24px",borderTop:"1.5px solid #f1f5f9",display:"flex",justifyContent:"flex-end",gap:10},
  formRow:{display:"flex",flexWrap:"wrap",gap:12},
  label:{display:"block",fontSize:12,fontWeight:600,color:"#64748b",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.04em"},
  input:{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",fontSize:14,color:"#1e293b",outline:"none",boxSizing:"border-box"},
  inputErr:{borderColor:"#ef4444",background:"#fff5f5"},
  toggleBtn:{flex:1,padding:"10px 8px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#f8fafc",fontSize:13,fontWeight:500,cursor:"pointer",color:"#64748b"},
  toggleSi:{background:"#dcfce7",borderColor:"#16a34a",color:"#15803d"},
  toggleNo:{background:"#fee2e2",borderColor:"#dc2626",color:"#b91c1c"},
  costHint:{display:"flex",gap:16,fontSize:12,color:"#475569",marginTop:5,background:"#f8fafc",padding:"5px 10px",borderRadius:6},
  acDrop:{position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:600,maxHeight:210,overflowY:"auto"},
  acItem:{padding:"9px 12px",cursor:"pointer",fontSize:14,display:"flex",gap:8,alignItems:"center",borderBottom:"1px solid #f8fafc"},
  acBadge:{fontSize:11,fontWeight:700,color:"#fff",background:"#475569",padding:"1px 7px",borderRadius:10,whiteSpace:"nowrap",flexShrink:0},
  configSection:{background:"#fff",borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,.07)",marginBottom:14},
  catalogRow:{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",borderRadius:8,padding:"7px 10px"},
  catalogInput:{background:"transparent",border:"none",outline:"none",fontSize:14,color:"#1e293b",minWidth:40},
  removeBtn:{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:14,padding:"0 2px",flexShrink:0},
  toast:{position:"fixed",bottom:24,right:24,color:"#fff",padding:"12px 20px",borderRadius:10,fontWeight:600,fontSize:14,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.2)"},
};
import React, { useState, useEffect, useRef } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = "https://crhknonvxsvxaxvwfdjs.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaGtub252eHN2eGF4dndmZGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODMzMjAsImV4cCI6MjA5NTE1OTMyMH0.UdfXAFt4ZeM3uAmQG2oZhpUO6K3mwffg0Lfg_USlHWM";

async function sbFetch(path, options={}) {
  const session = getSession();
  const headers = {
    "apikey": SUPA_KEY,
    "Content-Type": "application/json",
    ...(session ? {"Authorization": "Bearer " + session.access_token} : {"Authorization": "Bearer " + SUPA_KEY}),
    ...options.headers,
  };
  const res = await fetch(SUPA_URL + path, {...options, headers});
  if(!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function getSession() {
  try { const s = localStorage.getItem("sb_session"); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveSession(s) { try { localStorage.setItem("sb_session", s ? JSON.stringify(s) : ""); } catch {} }

async function signIn(email, password) {
  const res = await fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {"apikey": SUPA_KEY, "Content-Type": "application/json"},
    body: JSON.stringify({email, password}),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error_description || data.msg || "Erro ao fazer login");
  saveSession(data);
  return data;
}

async function signOut() {
  const session = getSession();
  if(session) {
    await fetch(SUPA_URL + "/auth/v1/logout", {
      method: "POST",
      headers: {"apikey": SUPA_KEY, "Authorization": "Bearer " + session.access_token},
    }).catch(()=>{});
  }
  saveSession(null);
}

async function getProfile() {
  const data = await sbFetch("/rest/v1/profiles?select=*&limit=1");
  return data && data[0] ? data[0] : null;
}

// DB helpers
const db = {
  async sectors() { return sbFetch("/rest/v1/sectors?select=*&order=name"); },
  async corridors() { return sbFetch("/rest/v1/corridors?select=*&order=number"); },
  async bays() { return sbFetch("/rest/v1/bays?select=*&order=number"); },
  async floors() { return sbFetch("/rest/v1/floors?select=*&order=number"); },
  async boxes() { return sbFetch("/rest/v1/boxes?select=*"); },
  async products() { return sbFetch("/rest/v1/products?select=*&order=sku"); },

  async upsertSector(s) { return sbFetch("/rest/v1/sectors", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(s)}); },
  async deleteSector(id) { return sbFetch("/rest/v1/sectors?id=eq."+id, {method:"DELETE"}); },
  async upsertCorridor(c) { return sbFetch("/rest/v1/corridors", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(c)}); },
  async deleteCorridor(id) { return sbFetch("/rest/v1/corridors?id=eq."+id, {method:"DELETE"}); },
  async upsertBay(b) { return sbFetch("/rest/v1/bays", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(b)}); },
  async deleteBay(id) { return sbFetch("/rest/v1/bays?id=eq."+id, {method:"DELETE"}); },
  async upsertFloor(f) { return sbFetch("/rest/v1/floors", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(f)}); },
  async deleteFloor(id) { return sbFetch("/rest/v1/floors?id=eq."+id, {method:"DELETE"}); },
  async upsertBox(b) { return sbFetch("/rest/v1/boxes", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(b)}); },
  async deleteBox(id) { return sbFetch("/rest/v1/boxes?id=eq."+id, {method:"DELETE"}); },
  async upsertProduct(p) { return sbFetch("/rest/v1/products", {method:"POST", headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify(p)}); },
  async deleteProduct(sku) { return sbFetch("/rest/v1/products?sku=eq."+sku, {method:"DELETE"}); },
};

// Load all data from Supabase and assemble into app structure
async function loadFromSupabase() {
  const [sectors, corridors, bays, floors, boxes, products] = await Promise.all([
    db.sectors(), db.corridors(), db.bays(), db.floors(), db.boxes(), db.products(),
  ]);
  const productsMap = {};
  (products||[]).forEach(p => {
    productsMap[p.sku] = {
      sku: p.sku, desc: p.description, familia: p.familia,
      fornecedor: p.fornecedor, um: p.um, preco: p.preco ? String(p.preco) : "",
      dtaInicio: p.dta_inicio||"", dtaFim: p.dta_fim||"",
      ean: p.ean||"", situacao: p.situacao||"NN",
    };
  });
  const floorsWithBoxes = (floors||[]).map(f => ({
    id: f.id, number: f.number,
    boxes: (boxes||[]).filter(b => b.floor_id === f.id).map(b => ({
      id: b.id, sku: b.sku, qty: b.qty,
      updatedBy: b.updated_by||"", date: b.date||"",
      validade: b.validade||"", stackId: b.stack_id||null, stackOrder: b.stack_order||0,
    })),
  }));
  const baysWithFloors = (bays||[]).map(b => ({
    id: b.id, number: b.number, side: b.side, label: b.label,
    floors: floorsWithBoxes.filter(f => (floors||[]).find(fl => fl.id === f.id && fl.bay_id === b.id)),
  }));
  const corridorsWithBays = (corridors||[]).map(c => ({
    id: c.id, sectorId: c.sector_id, number: c.number,
    bays: baysWithFloors.filter(b => (bays||[]).find(ba => ba.id === b.id && ba.corridor_id === c.id)),
  }));
  return {
    sectors: (sectors||[]).map(s => ({id:s.id, name:s.name, mascot:s.mascot})),
    corridors: corridorsWithBays,
    products: productsMap,
  };
}

const genId = () => Math.random().toString(36).slice(2,9);
const todayFull = () => { const d=new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const fmtDate = raw => { const d=raw.replace(/\D/g,"").slice(0,8); if(d.length<=2)return d; if(d.length<=4)return d.slice(0,2)+"/"+d.slice(2); return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4); };
const calcVenc = (fab,m) => { const p=fab.split("/"); if(p.length!==3)return""; const d=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(d))return""; d.setMonth(d.getMonth()+Number(m)); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const parsePrice = v => parseFloat(String(v).replace(",","."))||0;
const renumberFloors = floors => [...floors].sort((a,b)=>a.number-b.number).map((f,i)=>({...f,number:i+1}));

function getValidity(dateStr) {
  if(!dateStr||dateStr.length<10) return null;
  const p=dateStr.split("/"); if(p.length!==3||p[2].length<4) return null;
  const exp=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(exp)) return null;
  const now=new Date(); now.setHours(0,0,0,0);
  const days=Math.floor((exp-now)/86400000);
  if(days>90) return {days,color:"#1dd1a1",label:"OK"};
  if(days>60) return {days,color:"#ffd166",label:"Atenção"};
  if(days>30) return {days,color:"#ff9f43",label:"Urgente"};
  return {days,color:"#ff6b6b",label:days<0?"Vencido":"Crítico"};
}

function getAllExpiring(data) {
  const res=[];
  (data.corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{
    if(!box.validade) return;
    const v=getValidity(box.validade);
    if(v&&v.days<=90) res.push({box,fl,bay,cor,v,product:(data.products||{})[box.sku]});
  }))));
  return res.sort((a,b)=>a.v.days-b.v.days);
}

function findBySku(sku,corridors) {
  const res=[];
  (corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{
    if(box.sku===sku) res.push({box,fl,bay,cor});
  }))));
  return res;
}

// Group boxes into stacks for display
function getStackGroups(boxes) {
  const stacks={};
  const order=[];
  const seen=new Set();
  boxes.forEach(b=>{
    const key=b.stackId||b.id;
    if(!seen.has(key)){seen.add(key);order.push(key);}
    if(!stacks[key]) stacks[key]=[];
    stacks[key].push(b);
  });
  return order.map(key=>stacks[key].sort((a,b_)=>(a.stackOrder||0)-(b_.stackOrder||0)));
}

const INITIAL = {
  sectors:[
    {id:"sec1",name:"Tintas e Acabamentos",mascot:"🎨"},
    {id:"sec2",name:"Hidráulica",mascot:"🦆"},
    {id:"sec3",name:"Ferramentas Manuais",mascot:"🔧"},
    {id:"sec4",name:"Material Elétrico",mascot:"⚡"},
    {id:"sec5",name:"Pisos e Revestimentos",mascot:"🏠"},
  ],
  products:{
    "1026780":{sku:"1026780",desc:"Mang. Multi Uso 3/8x4.0 Transp Rolo 50M",familia:"Acessórios Hidráulicos",fornecedor:"Force Line",um:"M",preco:"9.73",dtaInicio:"03/06/2025",dtaFim:"31/12/9999",ean:"7899018416919",situacao:"NN"},
    "1024256":{sku:"1024256",desc:"Reg. Esf. 440 DN28",familia:"Hidráulica",fornecedor:"Krona",um:"UN",preco:"",dtaInicio:"",dtaFim:"",ean:"",situacao:"NN"},
  },
  corridors:[
    {id:"c41",sectorId:"sec1",number:41,bays:[
      {id:"c41b1e",number:1,side:"Esquerdo",label:"Tintas Látex",floors:[
        {id:"f3a",number:3,boxes:[
          {id:"bx1",sku:"1026780",qty:8,updatedBy:"Caio",date:"05/05/2025",validade:"",stackId:"stk1",stackOrder:0},
          {id:"bx1b",sku:"1024256",qty:4,updatedBy:"Caio",date:"05/05/2025",validade:"",stackId:"stk1",stackOrder:1},
          {id:"bx1c",sku:"1026780",qty:3,updatedBy:"Caio",date:"06/05/2025",validade:"",stackId:null,stackOrder:0},
        ]},
        {id:"f2a",number:2,boxes:[{id:"bx2",sku:"1024276",qty:10,updatedBy:"Caio",date:"11/05/2025",validade:"",stackId:null,stackOrder:0}]},
        {id:"f1a",number:1,boxes:[]}
      ]},
      {id:"c41b1d",number:1,side:"Direito",label:"Rolos e Pincéis",floors:[{id:"f2b",number:2,boxes:[]},{id:"f1b",number:1,boxes:[]}]},
    ]},
    {id:"c44",sectorId:"sec2",number:44,bays:[
      {id:"c44b1e",number:1,side:"Esquerdo",label:"Bases e Registros",floors:[
        {id:"f2d",number:2,boxes:[{id:"bx3",sku:"1024256",qty:20,updatedBy:"Caio",date:"11/03/2025",validade:"",stackId:null,stackOrder:0}]},
        {id:"f1e",number:1,boxes:[
          {id:"bx4",sku:"1024274",qty:6,updatedBy:"Caio",date:"22/03/2025",validade:"",stackId:"stk2",stackOrder:0},
          {id:"bx5",sku:"1798178",qty:58,updatedBy:"Caio",date:"22/03/2025",validade:"",stackId:"stk2",stackOrder:1}
        ]}
      ]},
    ]},
    {id:"c42",sectorId:"sec3",number:42,bays:[{id:"c42b1e",number:1,side:"Esquerdo",label:"Chaves",floors:[{id:"f1h",number:1,boxes:[]}]}]},
    {id:"c43",sectorId:"sec4",number:43,bays:[{id:"c43b1e",number:1,side:"Esquerdo",label:"Disjuntores",floors:[{id:"f1i",number:1,boxes:[]}]}]},
    {id:"c45",sectorId:"sec5",number:45,bays:[{id:"c45b1e",number:1,side:"Esquerdo",label:"Porcelanatos",floors:[{id:"f1j",number:1,boxes:[]}]}]},
  ]
};

const C={bg:"#071e26",border:"rgba(255,255,255,0.1)",accent:"#1dd1a1",accentDim:"rgba(29,209,161,0.13)",text:"#e4f5f0",muted:"#6aada0",dim:"#3f7068",danger:"#ff6b6b",modalBg:"#0b2533"};

const css=`
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#071e26;color:#e4f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;}
input,select{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#e4f5f0;font-size:14px;width:100%;outline:none;}
input::placeholder{color:#3f7068;}select option{background:#0b2533;}
input:focus,select:focus{border-color:#1dd1a1;}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}
button{cursor:pointer;}
::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px;}
.ch:active{background:rgba(255,255,255,0.1)!important;}
@media(hover:hover){.ch:hover{background:rgba(255,255,255,0.08)!important;}}
.floor-drop-active{border-color:#1dd1a1!important;background:rgba(29,209,161,0.07)!important;}
@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.fin{animation:fadeIn .15s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.su{animation:slideUp .2s ease;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
.blink{animation:blink 1.4s ease-in-out infinite;}
@keyframes toastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.toast{animation:toastIn .2s ease;}
`;

async function persist(d){try{localStorage.setItem("aereo-v7", JSON.stringify(d));}catch(e){}}
async function loadPersisted(){try{const r=localStorage.getItem("aereo-v7");return r?JSON.parse(r):null;}catch(e){return null;}}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function handleLogin(){
    if(!email||!password){setError("Preencha email e senha.");return;}
    setLoading(true);setError("");
    try{
      await signIn(email,password);
      onLogin();
    }catch(e){
      setError(e.message||"Erro ao fazer login.");
    }finally{setLoading(false);}
  }

  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}},
    React.createElement("div",{style:{fontSize:48,marginBottom:12}},"📦"),
    React.createElement("div",{style:{fontWeight:800,fontSize:22,marginBottom:4,color:C.text}},"Estoque Aéreo"),
    React.createElement("div",{style:{fontSize:12,color:C.muted,marginBottom:32}},"Faça login para continuar"),
    React.createElement("div",{style:{width:"100%",maxWidth:340}},
      error&&React.createElement("div",{style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.danger}},error),
      React.createElement(Lbl,null,"Email"),
      React.createElement("input",{type:"email",value:email,onChange:e=>setEmail(e.target.value),placeholder:"seu@email.com",style:{marginBottom:12}}),
      React.createElement(Lbl,null,"Senha"),
      React.createElement("input",{type:"password",value:password,onChange:e=>setPassword(e.target.value),placeholder:"••••••••",style:{marginBottom:20},onKeyDown:e=>{if(e.key==="Enter")handleLogin();}}),
      React.createElement("button",{onClick:handleLogin,disabled:loading,style:{background:loading?"rgba(29,209,161,0.5)":C.accent,color:"#071e26",border:"none",borderRadius:10,padding:14,fontWeight:800,fontSize:15,width:"100%",cursor:loading?"not-allowed":"pointer"}},
        loading?"Entrando...":"Entrar"
      )
    )
  );
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Lbl({children,req}){return React.createElement("label",{style:{fontSize:12,color:C.muted,fontWeight:600,display:"block",marginBottom:4}},children,req&&React.createElement("span",{style:{color:C.accent}}," *"));}
function Gap({h=12}){return React.createElement("div",{style:{height:h}});}
function Tag({children,color=C.accent,bg=C.accentDim}){return React.createElement("span",{style:{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}},children);}
function NumInput({value,onChange,placeholder,readOnly,style={}}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(e.target.value.replace(/\D/g,"")),placeholder,readOnly,style});}
function DateInput({value,onChange,placeholder="dd/mm/aaaa"}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(fmtDate(e.target.value)),placeholder});}
function DecInput({value,onChange,placeholder}){return React.createElement("input",{value,inputMode:"decimal",onChange:e=>onChange(e.target.value.replace(/[^0-9.,]/g,"")),placeholder});}

function Row({children}){
  const arr=Array.isArray(children)?children.filter(Boolean):[children];
  return React.createElement("div",{style:{display:"grid",gridTemplateColumns:`repeat(${arr.length},1fr)`,gap:10}},children);
}
function SaveBtn({onClick,label="💾 Salvar"}){
  return React.createElement("button",{onClick,style:{background:C.accent,color:"#071e26",border:"none",borderRadius:10,padding:12,fontWeight:800,fontSize:14,width:"100%",marginTop:8}},label);
}

function Modal({onClose,title,children,wide}){
  return React.createElement("div",{onClick:e=>{if(e.target===e.currentTarget)onClose();},style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}},
    React.createElement("div",{className:"su",style:{background:C.modalBg,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:wide?600:420,maxHeight:"92vh",overflowY:"auto"}},
      React.createElement("div",{style:{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 16px"}}),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
        React.createElement("span",{style:{fontWeight:700,fontSize:16}},title),
        React.createElement("button",{onClick:onClose,style:{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:13}},"✕")
      ),
      children
    )
  );
}

function ConfirmModal({msg,onConfirm,onCancel}){
  return React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.87)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}},
    React.createElement("div",{className:"su",style:{background:C.modalBg,border:"1px solid rgba(255,107,107,0.3)",borderRadius:16,padding:24,width:"100%",maxWidth:320,textAlign:"center"}},
      React.createElement("div",{style:{fontSize:32,marginBottom:10}},"⚠️"),
      React.createElement("div",{style:{fontSize:15,fontWeight:600,marginBottom:6,color:C.text}},msg),
      React.createElement("div",{style:{fontSize:12,color:C.muted,marginBottom:20}},"Você poderá desfazer nos próximos 5 segundos."),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        React.createElement("button",{onClick:onCancel,style:{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:11,fontWeight:600,fontSize:14}},"Cancelar"),
        React.createElement("button",{onClick:onConfirm,style:{background:"rgba(255,107,107,0.15)",border:"1px solid rgba(255,107,107,0.3)",color:C.danger,borderRadius:10,padding:11,fontWeight:700,fontSize:14}},"Excluir")
      )
    )
  );
}

function UndoToast({msg,onUndo,onDismiss}){
  return React.createElement("div",{className:"toast",style:{position:"fixed",bottom:24,left:16,right:16,maxWidth:380,margin:"0 auto",background:"#1a3a4a",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,zIndex:500,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}},
    React.createElement("span",{style:{fontSize:16}},"🗑"),
    React.createElement("span",{style:{flex:1,fontSize:13,color:C.text}},msg),
    React.createElement("button",{onClick:onUndo,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.3)",color:C.accent,borderRadius:8,padding:"5px 12px",fontWeight:700,fontSize:12,flexShrink:0}},"Desfazer"),
    React.createElement("button",{onClick:onDismiss,style:{background:"none",border:"none",color:C.dim,fontSize:16,padding:"0 2px",flexShrink:0}},"✕")
  );
}

// ─── STACK COLUMN: displays a pile of boxes with fan-on-hover effect ──────────
function StackColumn({group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId,onDropOnStack}){
  const [hovered,setHovered]=useState(-1);
  // Stack order: index 0 = bottom of pile, last index = top (front)
  // We reverse so top card is rendered last (on top visually)
  const STEP=34;
  const isSingle=group.length===1;
  // reversed: index 0 is TOP card, last is BOTTOM
  const reversed=[...group]; // index 0 = bottom of pile = front/priority
  const colHeight=isSingle?null:72+(group.length-1)*STEP+24;

  return React.createElement("div",{
    style:{position:"relative",width:112,flexShrink:0,height:colHeight||undefined,marginRight:4},
    onDragOver:e=>{e.preventDefault();e.stopPropagation();},
    onDrop:e=>{e.preventDefault();e.stopPropagation();if(dragRef.current&&group[0])onDropOnStack(group[group.length-1].id,floorId);}
  },
    reversed.map((box,i)=>{
      const vi=getValidity(box.validade);
      const isTop=i===0; // first in reversed = top of pile
      const isHov=hovered===i;
      // baseOffset: top card at 0, each card behind goes down by STEP
      const baseOffset=isSingle?0:i*STEP;
      // hover: only THIS card rises, others stay put
      const liftOffset=isHov?-12:0;
      return React.createElement("div",{
        key:box.id,
        draggable:true,
        onDragStart:()=>{dragRef.current={box,fromFloorId:floorId};setDraggingId(box.id);},
        onDragEnd:()=>{dragRef.current=null;setDraggingId(null);},
        onMouseEnter:()=>setHovered(i),
        onMouseLeave:()=>setHovered(-1),
        onTouchStart:()=>setHovered(i),
        onTouchEnd:()=>setTimeout(()=>setHovered(-1),1200),
        onClick:e=>{e.stopPropagation();onClickBox(box);},
        style:{
          position:isSingle?"relative":"absolute",
          top:isSingle?undefined:baseOffset,
          left:0,width:"100%",
          background:isHov?"rgba(25,80,100,0.99)":isTop?"rgba(12,58,76,0.97)":"rgba(7,38,54,0.95)",
          border:"1px solid "+(vi&&vi.days<=90?vi.color+"cc":isHov?"rgba(29,209,161,0.7)":isTop?"rgba(29,209,161,0.45)":"rgba(29,209,161,0.25)"),
          borderRadius:10,padding:"7px 8px 6px",
          cursor:"grab",overflow:"hidden",
          opacity:1,
          transform:"translateY("+liftOffset+"px)",
          transition:"transform 0.18s ease, background 0.15s, box-shadow 0.18s",
          zIndex:isHov?100:reversed.length-i,
          boxShadow:isHov?"0 10px 24px rgba(0,0,0,0.8)":isTop?"0 4px 12px rgba(0,0,0,0.5)":"0 1px 4px rgba(0,0,0,0.4)",
          userSelect:"none",
        }
      },
        React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}},
          React.createElement("div",{style:{fontSize:36,opacity:0.05,lineHeight:1}},mascot)
        ),
        // SKU always visible and prominent
        React.createElement("div",{style:{position:"relative",fontWeight:800,fontSize:11,color:"#e4f5f0",wordBreak:"break-all",marginBottom:3}},box.sku),
        isTop?(
          // Top card: full layout with divider, qty, name, date
          React.createElement(React.Fragment,null,
            !isSingle&&React.createElement("div",{style:{borderTop:"1px dashed rgba(29,209,161,0.2)",marginBottom:4}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:7,color:"#5a9d90"}},"QTD."),
                React.createElement("div",{style:{fontSize:15,fontWeight:800,color:C.accent,lineHeight:1}},box.qty)
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                box.updatedBy&&React.createElement("div",{style:{fontSize:7,color:"#5a9d90"}},box.updatedBy),
                box.date&&React.createElement("div",{style:{fontSize:7,color:"#4a8878"}},box.date),
                vi&&React.createElement("div",{style:{fontSize:7,color:vi.color,fontWeight:700}},"●")
              )
            )
          )
        ):(
          // Cards behind: compact — SKU already shown above, just qty on the right
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("div",{style:{fontSize:7,color:"#5a9d90"}},"QTD."),
            React.createElement("div",{style:{fontSize:12,fontWeight:800,color:C.accent}},box.qty)
          )
        ),
        React.createElement("div",{style:{position:"absolute",bottom:0,left:0,right:0,height:2,background:vi?vi.color+"55":"rgba(29,209,161,0.18)",borderRadius:"0 0 10px 10px"}})
      );
    })
  );
}

// ─── FLOOR ROW: horizontal scroll with stacks ─────────────────────────────────
function FloorRow({floor,mascot,products,corridors,onClickBox,onUpdateFloor,dragRef,draggingId,setDraggingId}){
  const [dragOver,setDragOver]=useState(false);
  const groups=getStackGroups(floor.boxes);

  function dropOnFloor(){
    const dr=dragRef.current;
    if(!dr)return;
    // unstacks the box and drops it standalone on this floor
    const box={...dr.box,stackId:null,stackOrder:0};
    let newBoxes;
    if(dr.fromFloorId===floor.id){
      newBoxes=floor.boxes.map(b=>b.id===box.id?box:b);
    } else {
      newBoxes=[...floor.boxes,box];
      // caller handles removing from source floor
    }
    onUpdateFloor(floor.id,newBoxes,dr.fromFloorId,dr.box.id);
    dragRef.current=null;setDragOver(false);
  }

  function dropOnStack(targetBoxId,fid){
    const dr=dragRef.current;
    if(!dr||dr.box.id===targetBoxId)return;
    const targetBox=floor.boxes.find(b=>b.id===targetBoxId);
    if(!targetBox)return;
    const existingStackBoxes=targetBox.stackId?floor.boxes.filter(b=>b.stackId===targetBox.stackId):[];
    if(existingStackBoxes.length>=10){alert("Máximo de 10 caixas por pilha!");return;}
    const stackId=targetBox.stackId||genId();
    const maxOrder=existingStackBoxes.reduce((m,b)=>Math.max(m,b.stackOrder||0),0);
    let newBoxes=floor.boxes.filter(b=>b.id!==dr.box.id);
    if(!targetBox.stackId) newBoxes=newBoxes.map(b=>b.id===targetBoxId?{...b,stackId,stackOrder:0}:b);
    const newBox={...dr.box,stackId,stackOrder:maxOrder+1};
    // if coming from same floor add it; otherwise it'll be added via onUpdateFloor
    if(dr.fromFloorId===floor.id) newBoxes=[...newBoxes,newBox];
    onUpdateFloor(floor.id,dr.fromFloorId===floor.id?newBoxes:[...newBoxes,newBox],dr.fromFloorId,dr.box.id,{...newBox});
    dragRef.current=null;
  }

  const scrollRef=useRef(null);
  const touchStartX=useRef(0);
  const touchScrollLeft=useRef(0);
  const isDraggingScroll=useRef(false);

  function onTouchStart(e){
    if(dragRef.current)return; // don't hijack box drag
    touchStartX.current=e.touches[0].clientX;
    touchScrollLeft.current=(scrollRef.current?scrollRef.current.scrollLeft:0)||0;
    isDraggingScroll.current=false;
  }
  function onTouchMove(e){
    if(dragRef.current)return;
    const dx=touchStartX.current-e.touches[0].clientX;
    if(Math.abs(dx)>6){isDraggingScroll.current=true;}
    if(isDraggingScroll.current&&scrollRef.current){
      scrollRef.current.scrollLeft=touchScrollLeft.current+dx;
    }
  }

  return React.createElement("div",{
    ref:scrollRef,
    onDragOver:e=>{e.preventDefault();setDragOver(true);},
    onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false);},
    onDrop:e=>{e.preventDefault();dropOnFloor();},
    onTouchStart,onTouchMove,
    className:dragOver?"floor-drop-active":"",
    style:{
      display:"flex",overflowX:"auto",gap:10,
      padding:"8px 4px 12px",minHeight:88,alignItems:"flex-end",
      transition:"border-color .15s,background .15s",
      WebkitOverflowScrolling:"touch",
      cursor:"grab",
    }
  },
    floor.boxes.length===0&&React.createElement("span",{style:{fontSize:11,color:C.dim,alignSelf:"center",paddingLeft:4}},"Vazio — toque em + para adicionar"),
    groups.map((group,gi)=>React.createElement(StackColumn,{
      key:group[0].id+gi,
      group,mascot,products,
      onClickBox,
      dragRef,draggingId,setDraggingId,
      floorId:floor.id,
      onDropOnStack:dropOnStack,
    }))
  );
}

// ─── BOX DETAIL MODAL ─────────────────────────────────────────────────────────
function BoxDetailModal({box,product,floorNumber,bay,corridor,onEdit,onClose,allLocations}){
  const vi=getValidity(box.validade);
  const otherLocs=(allLocations||[]).filter(l=>l.box.id!==box.id);
  const rows=[
    {l:"Descrição",v:product&&product.desc},
    {l:"Família",v:product&&product.familia},
    {l:"Fornecedor",v:product&&product.fornecedor},
    {l:"Unidade",v:product&&product.um},
    {l:"Preço",v:product&&product.preco?`R$ ${parsePrice(product.preco).toFixed(2)}`:"—"},
    {l:"EAN",v:product&&product.ean||"—"},
    {l:"Situação",v:product&&product.situacao||"—"},
    {l:"Enfrentamento",v:product&&product.dtaInicio&&product&&product.dtaFim?`${product.dtaInicio} → ${product.dtaFim}`:"—"},
  ];
  return React.createElement(Modal,{onClose,title:`📦 SKU ${box.sku}`},
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}},
      [{icon:"📦",label:"Qtd.",val:String(box.qty),color:null},{icon:"📍",label:"Local",val:`C${corridor.number} B${bay.number} A${floorNumber}`,color:null},{icon:"📅",label:"Validade",val:box.validade||"—",color:vi&&vi.color}]
        .map((s,i)=>React.createElement("div",{key:i,style:{background:"rgba(255,255,255,0.05)",border:`1px solid ${s.color||C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:18,marginBottom:4}},s.icon),
          React.createElement("div",{style:{fontSize:9,color:C.muted,marginBottom:2}},s.label),
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:s.color||C.text,wordBreak:"break-all"}},s.val)
        ))
    ),
    vi&&vi.days<=90&&React.createElement("div",{style:{background:vi.color+"15",border:`1px solid ${vi.color}44`,borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}},
      React.createElement("span",{style:{fontSize:16}},vi.days<0?"💀":vi.days<=30?"🚨":"⚠️"),
      React.createElement("span",{style:{fontSize:12,color:vi.color,fontWeight:700}},`${vi.label}: ${vi.days<0?`Vencido há ${Math.abs(vi.days)} dias`:`${vi.days} dias restantes`}`)
    ),
    otherLocs.length>0&&React.createElement("div",{style:{background:"rgba(255,211,102,0.08)",border:"1px solid rgba(255,211,102,0.3)",borderRadius:10,padding:10,marginBottom:12}},
      React.createElement("div",{style:{fontSize:11,color:"#ffd166",fontWeight:700,marginBottom:8}},"⚠️ Mesmo SKU em outros locais:"),
      otherLocs.map((l,i)=>React.createElement("div",{key:i,style:{fontSize:11,color:C.text,padding:"4px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.06)":"none"}},
        `📍 C${l.cor.number} · Bay ${l.bay.number} ${l.bay.side.slice(0,3)}. · Andar ${l.fl.number} · Qtd: `,
        React.createElement("span",{style:{color:C.accent,fontWeight:700}},l.box.qty)
      ))
    ),
    React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10,letterSpacing:"0.05em"}},"📋 DADOS DO PRODUTO"),
      product
        ?React.createElement("div",{style:{display:"grid",gap:8}},rows.map((row,i)=>React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",gap:8}},
            React.createElement("span",{style:{fontSize:11,color:C.muted,flexShrink:0}},row.l),
            React.createElement("span",{style:{fontSize:11,color:C.text,fontWeight:600,textAlign:"right",wordBreak:"break-word"}},row.v||"—")
          )))
        :React.createElement("div",{style:{textAlign:"center",padding:"10px 0"}},
            React.createElement("div",{style:{fontSize:22,marginBottom:6}},"📭"),
            React.createElement("div",{style:{fontSize:12,color:C.muted}},"Produto não cadastrado.")
          )
    ),
    React.createElement("button",{onClick:onEdit,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:10,padding:11,fontWeight:700,fontSize:13,width:"100%"}},"✏️ Editar Caixa")
  );
}

// ─── BOX EDIT MODAL ───────────────────────────────────────────────────────────
function BoxEditModal({modal,products,onSave,onClose,onDelete}){
  const isEdit=modal.type==="edit";
  const [form,setForm]=useState(isEdit?{...modal.box}:{sku:"",qty:"",updatedBy:"",date:todayFull(),validade:"",stackId:null,stackOrder:0});
  const [valdMode,setValdMode]=useState("direta");
  const [fabDate,setFabDate]=useState("");
  const [meses,setMeses]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const product=products[form.sku];
  useEffect(()=>{if(valdMode==="calcular"&&fabDate.length===10&&meses){const v=calcVenc(fabDate,meses);if(v)set("validade",v);}},[fabDate,meses,valdMode]);
  function submit(){if(!form.sku.trim()){alert("SKU é obrigatório!");return;}if(!form.qty||isNaN(Number(form.qty))){alert("Quantidade inválida!");return;}onSave({...form,qty:Number(form.qty)});}
  return React.createElement(Modal,{onClose,title:isEdit?"✏️ Editar Caixa":"📦 Nova Caixa"},
    isEdit&&React.createElement("button",{onClick:onDelete,style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:8,fontSize:12,width:"100%",marginBottom:14}},"🗑 Excluir esta caixa"),
    React.createElement(Lbl,{req:true},"SKU"),
    React.createElement(NumInput,{value:form.sku,onChange:v=>set("sku",v),placeholder:"Somente números"}),
    product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.accent,background:C.accentDim,borderRadius:8,padding:"6px 10px"}},`✓ ${product.desc||"Produto cadastrado"}`),
    form.sku&&!product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.dim,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}},"SKU não cadastrado."),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,{req:true},"Quantidade"),React.createElement(NumInput,{value:form.qty,onChange:v=>set("qty",v),placeholder:"0"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Nome"),React.createElement("input",{value:form.updatedBy,onChange:e=>set("updatedBy",e.target.value),placeholder:""}))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Validade"),
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:8}},
      ["direta","calcular"].map(m=>React.createElement("button",{key:m,onClick:()=>setValdMode(m),style:{flex:1,background:valdMode===m?C.accentDim:"rgba(255,255,255,0.05)",border:`1px solid ${valdMode===m?"rgba(29,209,161,0.4)":C.border}`,color:valdMode===m?C.accent:C.muted,borderRadius:8,padding:7,fontSize:12,fontWeight:600}},m==="direta"?"📅 Data direta":"🔢 Calcular"))
    ),
    valdMode==="direta"&&React.createElement(DateInput,{value:form.validade,onChange:v=>set("validade",v)}),
    valdMode==="calcular"&&React.createElement(React.Fragment,null,
      React.createElement(Row,null,
        React.createElement("div",null,React.createElement(Lbl,null,"Data fabricação"),React.createElement(DateInput,{value:fabDate,onChange:setFabDate})),
        React.createElement("div",null,React.createElement(Lbl,null,"Meses"),React.createElement(NumInput,{value:meses,onChange:setMeses,placeholder:"12"}))
      ),
      form.validade&&React.createElement("div",{style:{marginTop:8,fontSize:12,color:C.accent,background:C.accentDim,borderRadius:8,padding:"7px 10px",textAlign:"center"}},`📅 Vencimento: ${form.validade}`)
    ),
    React.createElement(SaveBtn,{onClick:submit})
  );
}

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
function ProductModal({product,onSave,onClose,onDelete}){
  const isEdit=!!product;
  const [form,setForm]=useState(isEdit?{...product}:{sku:"",desc:"",familia:"",fornecedor:"",um:"UN",preco:"",dtaInicio:"",dtaFim:"",ean:"",situacao:"NN"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function submit(){if(!form.sku.trim()){alert("SKU é obrigatório!");return;}onSave(form);}
  const ums=["UN","CX","KG","M","M²","L","PC","RL","BD","SC"];
  return React.createElement(Modal,{onClose,title:isEdit?"✏️ Editar Produto":"➕ Cadastrar Produto",wide:true},
    isEdit&&React.createElement("button",{onClick:onDelete,style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:8,fontSize:12,width:"100%",marginBottom:14}},"🗑 Excluir produto"),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,{req:true},"SKU / Material"),React.createElement(NumInput,{value:form.sku,onChange:v=>set("sku",v),placeholder:"Somente números",readOnly:isEdit,style:isEdit?{opacity:0.6}:{}})),
      React.createElement("div",null,React.createElement(Lbl,null,"Unidade (UM)"),React.createElement("select",{value:form.um,onChange:e=>set("um",e.target.value)},ums.map(u=>React.createElement("option",{key:u,value:u},u))))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Descrição"),
    React.createElement("input",{value:form.desc,onChange:e=>set("desc",e.target.value),placeholder:"Ex: Mang. Multi Uso 3/8x4.0..."}),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Família / Setor"),React.createElement("input",{value:form.familia,onChange:e=>set("familia",e.target.value),placeholder:"Ex: Hidráulica"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Fornecedor"),React.createElement("input",{value:form.fornecedor,onChange:e=>set("fornecedor",e.target.value),placeholder:"Ex: Krona"}))
    ),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Preço (R$)"),React.createElement(DecInput,{value:form.preco,onChange:v=>set("preco",v),placeholder:"0,00"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Situação"),React.createElement("input",{value:"NN",readOnly:true,style:{opacity:0.6,cursor:"default"}}))
    ),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Início Enfrentamento"),React.createElement(DateInput,{value:form.dtaInicio,onChange:v=>set("dtaInicio",v)})),
      React.createElement("div",null,React.createElement(Lbl,null,"Fim Enfrentamento"),React.createElement(DateInput,{value:form.dtaFim,onChange:v=>set("dtaFim",v)}))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"EAN / GTIN"),
    React.createElement(NumInput,{value:form.ean,onChange:v=>set("ean",v),placeholder:"Somente números"}),
    React.createElement(SaveBtn,{onClick:submit})
  );
}

// ─── PRODUCTS SCREEN ──────────────────────────────────────────────────────────
function ProductsScreen({products,onBack,onSaveProduct,onDeleteProduct,onConfirmDelete}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=Object.values(products).filter(p=>!search||p.sku.includes(search)||p.desc&&p.desc.toLowerCase().includes(search.toLowerCase())||p.fornecedor&&p.fornecedor.toLowerCase().includes(search.toLowerCase()));
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"🗂 Catálogo de Produtos"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},`${Object.keys(products).length} produtos`)
      ),
      React.createElement("button",{onClick:()=>setModal({product:null}),style:{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,flexShrink:0}},"+ Novo")
    ),
    React.createElement("div",{style:{padding:"12px 14px"}},
      React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Buscar por SKU, descrição ou fornecedor..."}),
      React.createElement(Gap,null),
      list.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"30px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:32,marginBottom:8}},"📭"),
        React.createElement("div",{style:{fontSize:13}},search?"Nenhum produto encontrado.":"Nenhum produto cadastrado.")
      ),
      list.map(p=>React.createElement("div",{key:p.sku,onClick:()=>setModal({product:p}),className:"ch fin",style:{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:8,cursor:"pointer"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}},
          React.createElement(Tag,null,p.sku),
          p.um&&React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.muted},p.um)
        ),
        p.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4,lineHeight:1.4}},p.desc),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
          p.familia&&React.createElement("span",{style:{fontSize:10,color:C.dim}},p.familia),
          p.fornecedor&&React.createElement("span",{style:{fontSize:10,color:C.dim}},`· ${p.fornecedor}`),
          p.preco&&React.createElement("span",{style:{fontSize:10,color:C.dim}},`· R$ ${parsePrice(p.preco).toFixed(2)}`)
        )
      ))
    ),
    modal&&React.createElement(ProductModal,{
      product:modal.product,
      onSave:p=>{onSaveProduct(p);setModal(null);},
      onClose:()=>setModal(null),
      onDelete:modal.product?()=>onConfirmDelete(`Excluir produto ${modal.product.sku}?`,()=>{onDeleteProduct(modal.product.sku);setModal(null);}):undefined,
    })
  );
}

// ─── VALIDITY SCREEN ──────────────────────────────────────────────────────────
function ValidityScreen({data,onBack,onNavigate}){
  const items=getAllExpiring(data);
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"⏰ Alertas de Validade"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},`${items.length} item(s) a vencer em 90 dias`)
      )
    ),
    React.createElement("div",{style:{padding:"12px 14px"}},
      items.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:40,marginBottom:12}},"✅"),
        React.createElement("div",{style:{fontSize:14}},"Nenhuma validade próxima!")
      ),
      items.map((item,i)=>React.createElement("div",{key:i,className:"ch fin",onClick:()=>onNavigate({corridorId:item.cor.id,bayId:item.bay.id,boxId:item.box.id}),
        style:{background:"rgba(255,255,255,0.05)",border:`1px solid ${item.v.color}44`,borderRadius:12,padding:12,marginBottom:8,cursor:"pointer",position:"relative",overflow:"hidden"}},
        React.createElement("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:3,background:item.v.color,borderRadius:"12px 0 0 12px"}}),
        React.createElement("div",{style:{paddingLeft:8}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}},
            React.createElement(Tag,null,item.box.sku),
            React.createElement("span",{style:{fontSize:11,color:item.v.color,fontWeight:700}},`${item.v.label} · ${item.v.days<0?`Vencido há ${Math.abs(item.v.days)}d`:`${item.v.days} dias`}`)
          ),
          item.product&&product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},item.product.desc),
          React.createElement("div",{style:{fontSize:10,color:C.dim}},`📍 C${item.cor.number} · Bay ${item.bay.number} · Andar ${item.fl.number} · Qtd: ${item.box.qty}`),
          React.createElement("div",{style:{fontSize:10,color:item.v.color,marginTop:4}},`📅 ${item.box.validade} → Ir para o local ›`)
        )
      ))
    )
  );
}

// ─── SEARCH OVERLAY ───────────────────────────────────────────────────────────
function SearchOverlay({data,onClose,onNavigate}){
  const [query,setQuery]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{setTimeout(()=>inputRef.current&&inputRef.current.focus(),100);},[]);
  const products=data.products||{};
  const allBoxSkus=[...new Set((data.corridors||[]).flatMap(c=>c.bays.flatMap(b=>b.floors.flatMap(f=>f.boxes.map(bx=>bx.sku)))))];
  const term=query.trim();
  const results=term.length>=2?(()=>{
    const matchedSkus=new Set();
    allBoxSkus.forEach(sku=>{if(sku.includes(term))matchedSkus.add(sku);});
    Object.values(products).forEach(p=>{if(p.desc&&p.desc.toLowerCase().includes(term.toLowerCase())||p.familia&&p.familia.toLowerCase().includes(term.toLowerCase()))matchedSkus.add(p.sku);});
    return[...matchedSkus].map(sku=>({sku,product:products[sku],locations:findBySku(sku,data.corridors)})).filter(r=>r.locations.length>0);
  })():[];
  const suggestions=term.length>=2&&term.length<7?allBoxSkus.filter(s=>s.startsWith(term)&&s!==term).slice(0,5):[];
  return React.createElement("div",{style:{position:"fixed",inset:0,background:C.bg,zIndex:300,display:"flex",flexDirection:"column"}},
    React.createElement("div",{style:{padding:16,display:"flex",gap:10,alignItems:"center",borderBottom:`1px solid ${C.border}`,flexShrink:0}},
      React.createElement("div",{style:{flex:1,position:"relative"}},
        React.createElement("input",{ref:inputRef,value:query,onChange:e=>setQuery(e.target.value),placeholder:"SKU ou nome do produto...",style:{paddingLeft:36}}),
        React.createElement("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}},"🔍"),
        query&&React.createElement("button",{onClick:()=>setQuery(""),style:{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.dim,fontSize:16,lineHeight:1}},"✕")
      ),
      React.createElement("button",{onClick:onClose,style:{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"8px 14px",fontSize:13,flexShrink:0}},"Fechar")
    ),
    suggestions.length>0&&React.createElement("div",{style:{padding:"8px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",gap:6,flexWrap:"wrap"}},
      suggestions.map(s=>React.createElement("button",{key:s,onClick:()=>setQuery(s),style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.2)",color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600}},s))
    ),
    React.createElement("div",{style:{flex:1,overflowY:"auto",padding:14}},
      term.length>=2&&results.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"🔍"),
        React.createElement("div",null,`Nenhum resultado para "${term}"`)
      ),
      term.length<2&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.dim}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"💡"),
        React.createElement("div",{style:{fontSize:13}},"Digite o SKU ou nome do produto")
      ),
      results.map((r,i)=>React.createElement("div",{key:i,className:"fin",style:{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
          React.createElement(Tag,null,r.sku),
          React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.dim},`${r.locations.length} local(is)`)
        ),
        r.product&&product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},r.product.desc),
        r.product&&product.fornecedor&&React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:8}},r.product.fornecedor),
        r.locations.map((l,j)=>React.createElement("button",{key:j,onClick:()=>{onNavigate({corridorId:l.cor.id,bayId:l.bay.id,boxId:l.box.id});onClose();},className:"ch",
          style:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"rgba(29,209,161,0.06)",border:"1px solid rgba(29,209,161,0.15)",borderRadius:8,padding:"8px 10px",marginBottom:4,textAlign:"left"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:C.text,fontWeight:600}},`📍 C${l.cor.number} · Bay ${l.bay.number} (${l.bay.side.slice(0,3)}.) · Andar ${l.fl.number}`),
            React.createElement("div",{style:{fontSize:10,color:C.muted,marginTop:2}},`Qtd: ${l.box.qty}${l.box.updatedBy?` · ${l.box.updatedBy}`:""} · ${l.box.date}`)
          ),
          React.createElement("span",{style:{color:C.accent,fontSize:18,marginLeft:8}},"›")
        ))
      ))
    )
  );
}

// ─── BAY SCREEN ───────────────────────────────────────────────────────────────
function BayScreen({bay,corridor,products,corridors,onBack,onUpdateBay,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [modal,setModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const dragRef=useRef(null);
  const [draggingId,setDraggingId]=useState(null);
  const floors=[...bay.floors].sort((a,b)=>b.number-a.number);
  const totalBoxes=bay.floors.reduce((s,f)=>s+f.boxes.length,0);

  function updateBayFloors(newFloors){onUpdateBay({...bay,floors:renumberFloors(newFloors)});}

  // Called by FloorRow when a drop happens
  function handleFloorUpdate(toFloorId,newToBoxes,fromFloorId,draggedBoxId,stackedBox){
    const newFloors=bay.floors.map(f=>{
      if(f.id===toFloorId) return{...f,boxes:newToBoxes};
      if(f.id===fromFloorId&&fromFloorId!==toFloorId){
        return{...f,boxes:f.boxes.filter(b=>b.id!==draggedBoxId)};
      }
      return f;
    });
    updateBayFloors(newFloors);
  }

  function handleSave(form){
    const box=modal.type==="edit"?{...modal.box,...form}:{...form,id:genId()};
    const newFloors=bay.floors.map(f=>{
      if(modal.type==="add"&&f.id===modal.floorId) return{...f,boxes:[...f.boxes,box]};
      if(modal.type==="edit"&&f.id===modal.floorId) return{...f,boxes:f.boxes.map(b=>b.id===box.id?box:b)};
      return f;
    });
    updateBayFloors(newFloors);
    setModal(null);setDetailModal(null);
  }

  function doDeleteBox(){
    onRegisterUndo("Caixa excluída");
    const boxId=modal.box.id;
    updateBayFloors(bay.floors.map(f=>f.id===modal.floorId?{...f,boxes:f.boxes.filter(b=>b.id!==boxId)}:f));
    db.deleteBox(boxId).catch(console.error);
    setModal(null);setDetailModal(null);
  }

  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:100,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},corridor.mascot||"📦"),
    React.createElement("div",{style:{padding:"14px 14px 10px",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{style:{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},`${corridor.mascot||""} Aéreo — Bay ${bay.number}`),
        React.createElement("div",{style:{fontSize:10,color:C.muted}},`${bay.side} · ${bay.label} · C${corridor.number}`)
      ),
      React.createElement(Tag,null,`${floors.length} and.`),
      React.createElement(Tag,null,`${totalBoxes} cx.`)
    ),
    React.createElement("div",{style:{padding:"12px 12px 80px"}},
      floors.map(floor=>React.createElement("div",{key:floor.id,style:{background:"rgba(0,0,0,0.25)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 10px 4px",marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
          React.createElement("span",{style:{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}},`ANDAR ${floor.number}`),
          React.createElement("div",{style:{display:"flex",gap:6}},
            React.createElement("button",{onClick:()=>setModal({type:"add",floorId:floor.id}),style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:7,padding:"2px 11px",fontSize:19,lineHeight:"1.2"}},"+"),
            React.createElement("button",{onClick:()=>{if(floor.boxes.length>0){alert("Remova as caixas antes.");return;}onRegisterUndo("Andar excluído");updateBayFloors(bay.floors.filter(f=>f.id!==floor.id));},style:{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:7,padding:"2px 8px",fontSize:12}},"✕")
          )
        ),
        React.createElement(FloorRow,{
          floor,mascot:corridor.mascot||"📦",products,corridors,
          onClickBox:box=>setDetailModal({box,floorId:floor.id,floorNumber:floor.number}),
          onUpdateFloor:handleFloorUpdate,
          dragRef,draggingId,setDraggingId,
        })
      )),
      React.createElement("button",{onClick:()=>{const nf=renumberFloors([...bay.floors,{id:genId(),number:999,boxes:[]}]);onUpdateBay({...bay,floors:nf});},style:{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:12,padding:11,width:"100%",fontSize:13,marginTop:4}},
        "+ Adicionar Andar"
      )
    ),
    detailModal&&!modal&&React.createElement(BoxDetailModal,{
      box:detailModal.box,product:products[detailModal.box.sku],
      floorNumber:detailModal.floorNumber,bay,corridor,
      allLocations:findBySku(detailModal.box.sku,corridors),
      onEdit:()=>setModal({type:"edit",floorId:detailModal.floorId,box:detailModal.box}),
      onClose:()=>setDetailModal(null),
    }),
    modal&&React.createElement(BoxEditModal,{
      modal,products,onSave:handleSave,
      onClose:()=>setModal(null),
      onDelete:()=>onConfirmDelete("Excluir esta caixa?",doDeleteBox),
    })
  );
}

// ─── BAY MODAL ────────────────────────────────────────────────────────────────
function BayModal({bay,side,onSave,onClose}){
  const [label,setLabel]=useState(bay&&bay.label||"");
  return React.createElement(Modal,{onClose,title:`${bay?"✏️ Editar":"➕ Novo"} Bay — ${side}`},
    React.createElement(Lbl,{req:true},"Nome / Rótulo"),
    React.createElement("input",{value:label,onChange:e=>setLabel(e.target.value),autoFocus:true}),
    React.createElement(SaveBtn,{onClick:()=>{if(!label.trim()){alert("Nome obrigatório!");return;}onSave(label.trim());}})
  );
}
function CorridorModal({corridor,onSave,onClose}){
  const [number,setNumber]=useState(corridor&&corridor.number||"");
  return React.createElement(Modal,{onClose,title:corridor?"✏️ Editar Corredor":"➕ Novo Corredor"},
    React.createElement(Lbl,{req:true},"Número do Corredor"),
    React.createElement(NumInput,{value:String(number),onChange:v=>setNumber(v),placeholder:"Ex: 41"}),
    React.createElement(SaveBtn,{onClick:()=>{if(!number){alert("Número obrigatório!");return;}onSave(Number(number));}})
  );
}
function SectorModal({sector,onSave,onClose}){
  const [name,setName]=useState(sector&&sector.name||"");
  const [mascot,setMascot]=useState(sector&&sector.mascot||"📦");
  const emojis=["📦","🎨","🦆","🔧","⚡","🏠","🔩","💡","🪣","🧱","🪟","🔌","🛁","🚿","🪛","🔨","🪚","🧰","🏗️","🪴","🎯","🛠️","🧲","🪝"];
  return React.createElement(Modal,{onClose,title:sector?"✏️ Editar Setor":"➕ Novo Setor"},
    React.createElement(Lbl,{req:true},"Nome do Setor"),
    React.createElement("input",{value:name,onChange:e=>setName(e.target.value),placeholder:"Ex: Hidráulica",autoFocus:true}),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Ícone"),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}},
      emojis.map(e=>React.createElement("button",{key:e,onClick:()=>setMascot(e),style:{background:mascot===e?C.accentDim:"rgba(255,255,255,0.06)",border:`1px solid ${mascot===e?"rgba(29,209,161,0.4)":C.border}`,borderRadius:8,padding:"6px 10px",fontSize:20}},e))
    ),
    React.createElement(SaveBtn,{onClick:()=>{if(!name.trim()){alert("Nome obrigatório!");return;}onSave({name:name.trim(),mascot});}})
  );
}

// ─── CORRIDOR SCREEN ──────────────────────────────────────────────────────────
function CorridorScreen({corridor,products,corridors,onBack,onUpdateCorridor,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [selectedBay,setSelectedBay]=useState(highlightBayId||null);
  const [bayModal,setBayModal]=useState(null);
  if(selectedBay){
    const bay=corridor.bays.find(b=>b.id===selectedBay);
    if(!bay){setSelectedBay(null);return null;}
    return React.createElement(BayScreen,{bay,corridor,products,corridors,onBack:()=>setSelectedBay(null),
      highlightBoxId,onConfirmDelete,onRegisterUndo,
      onUpdateBay:updated=>onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===updated.id?updated:b)})});
  }
  function getNextNum(side){const nums=corridor.bays.filter(b=>b.side===side).map(b=>b.number);return nums.length===0?1:Math.max(...nums)+1;}
  function handleBaySave(label){
    if(bayModal.bay) onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===bayModal.bay.id?{...b,label}:b)});
    else onUpdateCorridor({...corridor,bays:[...corridor.bays,{id:genId(),number:getNextNum(bayModal.side),side:bayModal.side,label,floors:[{id:genId(),number:1,boxes:[]}]}]});
    setBayModal(null);
  }
  const leftBays=corridor.bays.filter(b=>b.side==="Esquerdo").sort((a,b)=>a.number-b.number);
  const rightBays=corridor.bays.filter(b=>b.side==="Direito").sort((a,b)=>a.number-b.number);
  function BayCard({bay}){
    const total=bay.floors.reduce((s,f)=>s+f.boxes.length,0);
    return React.createElement("div",{className:"fin",style:{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}},
      React.createElement("div",{style:{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}},corridor.mascot||"📦"),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}},
        React.createElement(Tag,null,`Bay ${bay.number}`),
        React.createElement("div",{style:{display:"flex",gap:4}},
          React.createElement("button",{onClick:e=>{e.stopPropagation();setBayModal({side:bay.side,bay});},style:{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}},"✏️"),
          React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete(`Excluir Bay ${bay.number}?`,()=>{
            if(bay.floors.reduce((s,f)=>s+f.boxes.length,0)>0){alert("Remova todas as caixas antes.");return;}
            onRegisterUndo(`Bay ${bay.number} excluído`);
            onUpdateCorridor({...corridor,bays:corridor.bays.filter(b=>b.id!==bay.id)});
          });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}},"🗑")
        )
      ),
      React.createElement("div",{onClick:()=>setSelectedBay(bay.id),className:"ch",style:{padding:"10px 10px 12px",cursor:"pointer"}},
        React.createElement("div",{style:{fontWeight:600,fontSize:13,marginBottom:8,color:C.text}},bay.label),
        React.createElement(Tag,null,`${total} cx · ${bay.floors.length} and. ›`)
      )
    );
  }
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},corridor.mascot||"📦"),
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",null,
        React.createElement("div",{style:{fontWeight:700,fontSize:17}},`${corridor.mascot||""} Corredor ${corridor.number}`)
      )
    ),
    React.createElement("div",{style:{padding:14}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}},
        React.createElement("span",{style:{fontSize:10,color:C.accent,fontWeight:700}},"◉ ESQUERDO"),
        React.createElement("span",{style:{fontSize:10,color:C.accent,fontWeight:700,textAlign:"right"}},"DIREITO ◉")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
        React.createElement("div",null,leftBays.map(b=>React.createElement(BayCard,{key:b.id,bay:b})),React.createElement("button",{onClick:()=>setBayModal({side:"Esquerdo",bay:null}),style:{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:9,width:"100%",fontSize:12,marginBottom:8}},"+ Bay Esq.")),
        React.createElement("div",null,rightBays.map(b=>React.createElement(BayCard,{key:b.id,bay:b})),React.createElement("button",{onClick:()=>setBayModal({side:"Direito",bay:null}),style:{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:9,width:"100%",fontSize:12,marginBottom:8}},"+ Bay Dir."))
      )
    ),
    bayModal&&React.createElement(BayModal,{bay:bayModal.bay,side:bayModal.side,onSave:handleBaySave,onClose:()=>setBayModal(null)})
  );
}

// ─── SECTOR SCREEN ────────────────────────────────────────────────────────────
function SectorScreen({sector,corridors,products,allCorridors,onBack,onUpdateCorridor,onAddCorridor,onDeleteCorridor,highlightCorridorId,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [selectedCorridorId,setSelectedCorridorId]=useState(highlightCorridorId||null);
  const [corridorModal,setCorridorModal]=useState(null);
  if(selectedCorridorId){
    const cor=corridors.find(c=>c.id===selectedCorridorId);
    if(!cor){setSelectedCorridorId(null);return null;}
    return React.createElement(CorridorScreen,{corridor:cor,products,corridors:allCorridors,onBack:()=>setSelectedCorridorId(null),
      highlightBayId,highlightBoxId,onUpdateCorridor,onConfirmDelete,onRegisterUndo});
  }
  function handleCorridorSave(number){
    if(corridorModal.corridor) onUpdateCorridor({...corridorModal.corridor,number,mascot:sector.mascot});
    else onAddCorridor({id:genId(),sectorId:sector.id,number,mascot:sector.mascot,bays:[]});
    setCorridorModal(null);
  }
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},sector.mascot),
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:17}},`${sector.mascot} ${sector.name}`),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},`${corridors.length} corredor(es)`)
      ),
      React.createElement("button",{onClick:()=>setCorridorModal({corridor:null}),style:{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12}},"+ Corredor")
    ),
    React.createElement("div",{style:{padding:14}},
      corridors.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:40,marginBottom:12}},sector.mascot),
        React.createElement("div",{style:{fontSize:13}},"Nenhum corredor.\nToque em + Corredor.")
      ),
      [...corridors].sort((a,b)=>a.number-b.number).map(cor=>{
        const totalBoxes=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
        return React.createElement("div",{key:cor.id,className:"fin",style:{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}},
          React.createElement("div",{style:{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}},sector.mascot),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}},
            React.createElement(Tag,null,`Corredor ${cor.number}`),
            React.createElement("div",{style:{display:"flex",gap:4}},
              React.createElement("button",{onClick:e=>{e.stopPropagation();setCorridorModal({corridor:cor});},style:{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}},"✏️"),
              React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete(`Excluir Corredor ${cor.number}?`,()=>{
                const total=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
                if(total>0){alert("Remova todas as caixas antes.");return;}
                onRegisterUndo(`Corredor ${cor.number} excluído`);
                onDeleteCorridor(cor.id);
              });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}},"🗑")
            )
          ),
          React.createElement("div",{onClick:()=>setSelectedCorridorId(cor.id),className:"ch",style:{padding:"10px 10px 12px",cursor:"pointer"}},
            React.createElement("div",{style:{fontWeight:600,fontSize:14,marginBottom:6,color:C.text}},`Corredor ${cor.number}`),
            React.createElement(Tag,null,`${cor.bays.length} bays · ${totalBoxes} caixas ›`)
          )
        );
      })
    ),
    corridorModal&&React.createElement(CorridorModal,{corridor:corridorModal.corridor,onSave:handleCorridorSave,onClose:()=>setCorridorModal(null)})
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({data,onSelectSector,onOpenProducts,onOpenValidity,onOpenSearch,onAddSector,onEditSector,onDeleteSector,onConfirmDelete,onRegisterUndo,isAdmin,profile,onLogout}){
  const [sectorModal,setSectorModal]=useState(null);
  const expiringItems=getAllExpiring(data);
  const hasExpiring=expiringItems.length>0;
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},"📦"),
    React.createElement("div",{style:{padding:"22px 16px 14px",borderBottom:`1px solid ${C.border}`}},
      React.createElement("div",{style:{fontWeight:800,fontSize:22,marginBottom:4}},"📦 Estoque Aéreo"),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
        React.createElement("div",{style:{fontSize:12,color:C.muted}},profile?"Olá, "+(profile.name||"")+(profile.role==="admin"?" 👑":""):"Toque para explorar"),
        onLogout&&React.createElement("button",{onClick:onLogout,style:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer"}},"Sair")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,marginBottom:14}},
        React.createElement("button",{onClick:onOpenProducts,style:{flex:1,background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}},"🗂 Produtos"),
        React.createElement("button",{onClick:onOpenValidity,className:hasExpiring?"blink":"",style:{flex:1,background:hasExpiring?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.06)",border:`1px solid ${hasExpiring?"rgba(255,107,107,0.3)":C.border}`,color:hasExpiring?C.danger:C.muted,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}},`${hasExpiring?"⚠️ ":"⏰ "}Validades${hasExpiring?` (${expiringItems.length})`:""}`)
      ),
      React.createElement("button",{onClick:onOpenSearch,style:{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.dim,fontSize:14,width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:8}},
        React.createElement("span",null,"🔍")," Buscar por SKU ou nome..."
      )
    ),
    React.createElement("div",{style:{padding:"16px 16px 60px"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",{style:{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}},"SETORES"),
        React.createElement("button",{onClick:()=>setSectorModal({sector:null}),style:{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"4px 10px",fontSize:11}},"+ Setor")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        (data.sectors||[]).map(sector=>{
          const secCors=(data.corridors||[]).filter(c=>c.sectorId===sector.id);
          const totalBoxes=secCors.reduce((s,c)=>s+c.bays.reduce((s2,b)=>s2+b.floors.reduce((s3,f)=>s3+f.boxes.length,0),0),0);
          return React.createElement("div",{key:sector.id,className:"fin",style:{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",position:"relative"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",padding:"6px 8px 0",gap:4,position:"relative",zIndex:1}},
              React.createElement("button",{onClick:e=>{e.stopPropagation();setSectorModal({sector});},style:{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"2px 6px",fontSize:10}},"✏️"),
              React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete(`Excluir setor "${sector.name}"?`,()=>{
                if((data.corridors||[]).some(c=>c.sectorId===sector.id)){alert("Remova todos os corredores deste setor antes.");return;}
                onRegisterUndo(`Setor "${sector.name}" excluído`);
                onDeleteSector(sector.id);
              });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"2px 6px",fontSize:10}},"🗑")
            ),
            React.createElement("div",{onClick:()=>onSelectSector(sector.id),className:"ch",style:{padding:"4px 14px 16px",cursor:"pointer",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:40,marginBottom:8,lineHeight:1}},sector.mascot),
              React.createElement("div",{style:{fontWeight:700,fontSize:13,marginBottom:4,color:C.text,lineHeight:1.3}},sector.name),
              React.createElement("div",{style:{fontSize:10,color:C.dim}},`${secCors.length} corr. · ${totalBoxes} cx.`)
            )
          );
        })
      )
    ),
    sectorModal&&React.createElement(SectorModal,{
      sector:sectorModal.sector,
      onSave:({name,mascot})=>{
        if(sectorModal.sector) onEditSector({...sectorModal.sector,name,mascot});
        else onAddSector({id:genId(),name,mascot});
        setSectorModal(null);
      },
      onClose:()=>setSectorModal(null),
    })
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [data,setData]=useState(null);
  const [screenStack,setScreenStack]=useState([{type:"home"}]);
  const [showSearch,setShowSearch]=useState(false);
  const [confirmState,setConfirmState]=useState(null);
  const [undoState,setUndoState]=useState(null);
  const undoTimerRef=useRef(null);
  const dataRef=useRef(null);
  const [session,setSession]=useState(getSession);
  const [profile,setProfile]=useState(null);
  const [loadingData,setLoadingData]=useState(false);
  const isAdmin=profile&&profile.role==="admin";

  // On login, load from Supabase; fallback to local
  async function initData(){
    setLoadingData(true);
    try{
      const remote=await loadFromSupabase();
      setData(remote);
    }catch(e){
      console.warn("Supabase load failed, using local:", e);
      const local=await loadPersisted();
      setData(local||INITIAL);
    }finally{setLoadingData(false);}
  }

  useEffect(()=>{
    if(session){
      getProfile().then(p=>setProfile(p)).catch(()=>{});
      initData();
    }
  },[session]);

  useEffect(()=>{if(data){persist(data);dataRef.current=data;}},[data]);

  const screen=screenStack[screenStack.length-1];
  const nav=s=>setScreenStack(st=>[...st,s]);
  const back=()=>setScreenStack(st=>st.length>1?st.slice(0,-1):st);

  function registerUndo(msg){
    const snapshot=dataRef.current;
    if(!snapshot)return;
    if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
    setUndoState({msg,snapshot});
    undoTimerRef.current=setTimeout(()=>setUndoState(null),5000);
  }
  function doUndo(){if(undoState){setData(undoState.snapshot);setUndoState(null);if(undoTimerRef.current)clearTimeout(undoTimerRef.current);}}
  function confirmDelete(msg,onConfirm){setConfirmState({msg,onConfirm});}

  // ── helpers to sync local state + Supabase ──
  function updateCorridor(updated){
    setData(d=>({...d,corridors:d.corridors.map(c=>c.id===updated.id?updated:c)}));
    syncCorridor(updated).catch(console.error);
  }
  function addCorridor(cor){
    setData(d=>({...d,corridors:[...d.corridors,cor]}));
    db.upsertCorridor({id:cor.id,sector_id:cor.sectorId,number:cor.number}).catch(console.error);
    (cor.bays||[]).forEach(b=>{
      db.upsertBay({id:b.id,corridor_id:cor.id,number:b.number,side:b.side,label:b.label}).catch(console.error);
      (b.floors||[]).forEach(f=>db.upsertFloor({id:f.id,bay_id:b.id,number:f.number}).catch(console.error));
    });
  }
  function deleteCorridor(id){
    setData(d=>({...d,corridors:d.corridors.filter(c=>c.id!==id)}));
    db.deleteCorridor(id).catch(console.error);
  }
  function saveProduct(p){
    setData(d=>({...d,products:{...d.products,[p.sku]:p}}));
    db.upsertProduct({sku:p.sku,description:p.desc,familia:p.familia,fornecedor:p.fornecedor,um:p.um,preco:parsePrice(p.preco)||null,dta_inicio:p.dtaInicio||null,dta_fim:p.dtaFim||null,ean:p.ean||null,situacao:p.situacao||"NN"}).catch(console.error);
  }
  function deleteProduct(sku){
    setData(d=>{const p={...d.products};delete p[sku];return{...d,products:p};});
    db.deleteProduct(sku).catch(console.error);
  }
  function addSector(s){
    setData(d=>({...d,sectors:[...(d.sectors||[]),s]}));
    db.upsertSector({id:s.id,name:s.name,mascot:s.mascot}).catch(console.error);
  }
  function editSector(s){
    setData(d=>({...d,sectors:(d.sectors||[]).map(x=>x.id===s.id?s:x)}));
    db.upsertSector({id:s.id,name:s.name,mascot:s.mascot}).catch(console.error);
  }
  function deleteSector(id){
    setData(d=>({...d,sectors:(d.sectors||[]).filter(s=>s.id!==id)}));
    db.deleteSector(id).catch(console.error);
  }

  async function syncCorridor(cor){
    await db.upsertCorridor({id:cor.id,sector_id:cor.sectorId,number:cor.number});
    for(const bay of cor.bays||[]){
      await db.upsertBay({id:bay.id,corridor_id:cor.id,number:bay.number,side:bay.side,label:bay.label});
      for(const floor of bay.floors||[]){
        await db.upsertFloor({id:floor.id,bay_id:bay.id,number:floor.number});
        for(const box of floor.boxes||[]){
          await db.upsertBox({id:box.id,floor_id:floor.id,sku:box.sku,qty:box.qty,updated_by:box.updatedBy||null,date:box.date||null,validade:box.validade||null,stack_id:box.stackId||null,stack_order:box.stackOrder||0});
        }
      }
    }
  }

  function handleNavigate({corridorId,bayId,boxId}){
    const cor=data.corridors.find(c=>c.id===corridorId);
    setScreenStack([{type:"home"},{type:"sector",sectorId:cor&&cor.sectorId},{type:"bay",corridorId,bayId,highlightBoxId:boxId}]);
  }

  if(!session) return React.createElement(LoginScreen,{onLogin:()=>setSession(getSession())});
  if(loadingData||!data) return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:15,gap:12}},
    React.createElement("div",{style:{fontSize:32}},"📦"),
    React.createElement("div",null,"Carregando dados...")
  );

  const sharedProps={onConfirmDelete:confirmDelete,onRegisterUndo:registerUndo,isAdmin};

  const getMascot=sectorId=>{const s=(data.sectors||[]).find(s=>s.id===sectorId);return s?s.mascot:"📦";};
  const getAllCors=()=>data.corridors.map(c=>({...c,mascot:getMascot(c.sectorId)}));

  return React.createElement(React.Fragment,null,
    React.createElement("style",null,css),
    screen.type==="home"&&React.createElement(HomeScreen,{data,onSelectSector:id=>nav({type:"sector",sectorId:id}),onOpenProducts:()=>nav({type:"products"}),onOpenValidity:()=>nav({type:"validity"}),onOpenSearch:()=>setShowSearch(true),onAddSector:addSector,onEditSector:editSector,onDeleteSector:deleteSector,profile,onLogout:async()=>{await signOut();setSession(null);setProfile(null);setData(null);setScreenStack([{type:"home"}]);},  ...sharedProps}),
    screen.type==="sector"&&(()=>{
      const sector=(data.sectors||[]).find(s=>s.id===screen.sectorId);
      if(!sector) return React.createElement("div",{style:{padding:20,color:C.danger}},"Setor não encontrado. ",React.createElement("button",{onClick:back,style:{color:C.accent,background:"none",border:"none"}},"Voltar"));
      const corridors=data.corridors.filter(c=>c.sectorId===sector.id).map(c=>({...c,mascot:sector.mascot}));
      return React.createElement(SectorScreen,{sector,corridors,products:data.products,allCorridors:getAllCors(),onBack:back,onUpdateCorridor:updateCorridor,onAddCorridor:addCorridor,onDeleteCorridor:deleteCorridor,...sharedProps});
    })(),
    screen.type==="bay"&&(()=>{
      const cor=data.corridors.find(c=>c.id===screen.corridorId);
      if(!cor) return React.createElement("div",{style:{padding:20,color:C.danger}},"Não encontrado. ",React.createElement("button",{onClick:back,style:{color:C.accent,background:"none",border:"none"}},"Voltar"));
      const corridor={...cor,mascot:getMascot(cor.sectorId)};
      const bay=corridor.bays.find(b=>b.id===screen.bayId);
      if(!bay) return React.createElement("div",{style:{padding:20,color:C.danger}},"Bay não encontrado. ",React.createElement("button",{onClick:back,style:{color:C.accent,background:"none",border:"none"}},"Voltar"));
      return React.createElement(BayScreen,{bay,corridor,products:data.products,corridors:getAllCors(),highlightBoxId:screen.highlightBoxId,onBack:back,onUpdateBay:updated=>updateCorridor({...cor,bays:cor.bays.map(b=>b.id===updated.id?updated:b)}),...sharedProps});
    })(),
    screen.type==="products"&&React.createElement(ProductsScreen,{products:data.products,onBack:back,onSaveProduct:saveProduct,onDeleteProduct:sku=>{registerUndo("Produto excluído");deleteProduct(sku);},...sharedProps}),
    screen.type==="validity"&&React.createElement(ValidityScreen,{data,onBack:back,onNavigate:handleNavigate}),
    showSearch&&React.createElement(SearchOverlay,{data,onClose:()=>setShowSearch(false),onNavigate:v=>{handleNavigate(v);setShowSearch(false);}}),
    confirmState&&React.createElement(ConfirmModal,{msg:confirmState.msg,onConfirm:()=>{confirmState.onConfirm();setConfirmState(null);},onCancel:()=>setConfirmState(null)}),
    undoState&&React.createElement(UndoToast,{msg:undoState.msg,onUndo:doUndo,onDismiss:()=>{setUndoState(null);if(undoTimerRef.current)clearTimeout(undoTimerRef.current);}})
  );
}

import React, { useState, useEffect, useRef } from "react";

// --- SUPABASE -----------------------------------------------------------------
const SUPA_URL = "https://crhknonvxsvxaxvwfdjs.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaGtub252eHN2eGF4dndmZGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODMzMjAsImV4cCI6MjA5NTE1OTMyMH0.UdfXAFt4ZeM3uAmQG2oZhpUO6K3mwffg0Lfg_USlHWM";

async function sbFetch(path, options) {
  options = options || {};
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

async function resetPassword(email) {
  const res = await fetch(SUPA_URL + "/auth/v1/recover", {
    method: "POST",
    headers: {"apikey": SUPA_KEY, "Content-Type": "application/json"},
    body: JSON.stringify({email}),
  });
  if(!res.ok) { const d = await res.json(); throw new Error(d.error_description || d.msg || "Erro ao enviar email"); }
  return true;
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
const todayFull = () => { const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); };
const fmtDate = raw => { const d=raw.replace(/\D/g,"").slice(0,8); if(d.length<=2)return d; if(d.length<=4)return d.slice(0,2)+"/"+d.slice(2); return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4); };
const calcVenc = (fab,m) => { const p=fab.split("/"); if(p.length!==3)return""; const d=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(d))return""; d.setMonth(d.getMonth()+Number(m)); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); };
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
  products:{},
  corridors:[],
};

function DuckIcon({size}){
  var s = size || 40;
  return React.createElement("svg",{width:s,height:s,viewBox:"0 0 200 200",xmlns:"http://www.w3.org/2000/svg"},
    React.createElement("defs",null,
      React.createElement("radialGradient",{id:"duckBody",cx:"40%",cy:"35%",r:"60%"},
        React.createElement("stop",{offset:"0%",stopColor:"#FFF176"}),
        React.createElement("stop",{offset:"55%",stopColor:"#FFD600"}),
        React.createElement("stop",{offset:"100%",stopColor:"#E8A000"})
      ),
      React.createElement("radialGradient",{id:"duckHead",cx:"35%",cy:"28%",r:"55%"},
        React.createElement("stop",{offset:"0%",stopColor:"#FFFDE0"}),
        React.createElement("stop",{offset:"50%",stopColor:"#FFD600"}),
        React.createElement("stop",{offset:"100%",stopColor:"#E8A000"})
      ),
      React.createElement("radialGradient",{id:"duckShine",cx:"30%",cy:"25%",r:"50%"},
        React.createElement("stop",{offset:"0%",stopColor:"white",stopOpacity:"0.7"}),
        React.createElement("stop",{offset:"100%",stopColor:"white",stopOpacity:"0"})
      )
    ),
    React.createElement("path",{d:"M15 158 Q35 148 60 155 Q85 162 110 154 Q135 147 160 155 Q178 160 185 156",stroke:"#4DB8E8",strokeWidth:"3",fill:"none",strokeLinecap:"round",opacity:"0.9"}),
    React.createElement("path",{d:"M10 166 Q35 157 65 163 Q95 169 120 162 Q148 155 170 163 Q182 168 190 164",stroke:"#2196C8",strokeWidth:"2.5",fill:"none",strokeLinecap:"round",opacity:"0.8"}),
    React.createElement("path",{d:"M10 172 Q40 164 70 170 Q100 176 130 169 Q158 163 185 170",stroke:"#1A7AAA",strokeWidth:"2",fill:"none",strokeLinecap:"round",opacity:"0.7"}),
    React.createElement("path",{d:"M38 157 Q70 148 105 149 Q140 148 163 157 Q168 175 105 179 Q42 178 38 157Z",fill:"#2196C8",opacity:"0.25"}),
    React.createElement("path",{d:"M42 142 Q36 118 44 100 Q52 82 70 76 Q84 71 100 72 Q124 72 142 86 Q160 100 161 122 Q162 144 148 155 Q128 165 100 165 Q65 165 50 154 Q43 148 42 142Z",fill:"url(#duckBody)",stroke:"#C07800",strokeWidth:"2.5"}),
    React.createElement("ellipse",{cx:"80",cy:"105",rx:"22",ry:"14",fill:"url(#duckShine)",transform:"rotate(-20 80 105)"}),
    React.createElement("path",{d:"M88 120 Q108 110 135 116 Q152 123 150 138 Q132 148 110 145 Q88 140 86 130 Q85 124 88 120Z",fill:"#FFCA00",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("ellipse",{cx:"118",cy:"130",rx:"18",ry:"9",fill:"url(#duckShine)",transform:"rotate(-10 118 130)"}),
    React.createElement("path",{d:"M154 115 Q172 103 175 116 Q172 130 160 132Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("path",{d:"M158 108 Q178 95 180 110 Q177 124 164 125Z",fill:"#FFE040",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M72 78 Q68 62 73 50 Q80 43 90 46 Q98 49 96 63 Q94 75 86 79Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("circle",{cx:"80",cy:"42",r:"33",fill:"url(#duckHead)",stroke:"#C07800",strokeWidth:"2.5"}),
    React.createElement("ellipse",{cx:"67",cy:"27",rx:"14",ry:"9",fill:"white",opacity:"0.35",transform:"rotate(-25 67 27)"}),
    React.createElement("circle",{cx:"68",cy:"37",r:"10",fill:"white",stroke:"#333",strokeWidth:"1.5"}),
    React.createElement("circle",{cx:"67",cy:"37",r:"6.5",fill:"#111"}),
    React.createElement("circle",{cx:"63",cy:"33",r:"3.5",fill:"white"}),
    React.createElement("circle",{cx:"71",cy:"42",r:"1.5",fill:"white",opacity:"0.6"}),
    React.createElement("path",{d:"M59 32 Q68 27 78 32",stroke:"#A06000",strokeWidth:"1.8",fill:"none",strokeLinecap:"round"}),
    React.createElement("path",{d:"M46 44 Q34 41 28 48 Q30 57 46 55 L57 48Z",fill:"#FF6800",stroke:"#CC4400",strokeWidth:"2"}),
    React.createElement("path",{d:"M46 55 Q34 54 30 57 Q33 63 46 60 L55 54Z",fill:"#FF5500",stroke:"#CC4400",strokeWidth:"1.5"}),
    React.createElement("ellipse",{cx:"38",cy:"46",rx:"5",ry:"2.5",fill:"white",opacity:"0.3",transform:"rotate(-10 38 46)"}),
    React.createElement("path",{d:"M80 10 Q74 0 82 -2 Q90 0 87 10Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M87 9 Q82 -1 90 -3 Q98 -1 94 9Z",fill:"#FFE040",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M93 11 Q89 1 97 0 Q104 2 100 11Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M40 154 Q30 144 32 137 Q35 144 42 152Z",fill:"#4DB8E8",opacity:"0.7"}),
    React.createElement("path",{d:"M160 153 Q170 143 168 136 Q165 144 158 152Z",fill:"#4DB8E8",opacity:"0.6"}),
    React.createElement("path",{d:"M56 160 Q50 152 46 156 Q49 161 57 165Z",fill:"white",opacity:"0.5"}),
    React.createElement("path",{d:"M145 159 Q151 151 154 155 Q151 161 144 164Z",fill:"white",opacity:"0.4"})
  );
}

const C={bg:"#071e26",border:"rgba(255,255,255,0.1)",accent:"#1dd1a1",accentDim:"rgba(29,209,161,0.13)",text:"#e4f5f0",muted:"#6aada0",dim:"#3f7068",danger:"#ff6b6b",modalBg:"#0b2533"};

const css="*{box-sizing:border-box;margin:0;padding:0;} body{background:#071e26;color:#e4f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;} input,select{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#e4f5f0;font-size:14px;width:100%;outline:none;} input::placeholder{color:#3f7068;}select option{background:#0b2533;} input:focus,select:focus{border-color:#1dd1a1;} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;} input[type=number]{-moz-appearance:textfield;} button{cursor:pointer;} ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px;} .ch:active{background:rgba(255,255,255,0.1)!important;} @media(hover:hover){.ch:hover{background:rgba(255,255,255,0.08)!important;}} .floor-drop-active{border-color:#1dd1a1!important;background:rgba(29,209,161,0.07)!important;} @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}} .fin{animation:fadeIn .15s ease;} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} .su{animation:slideUp .2s ease;} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} .blink{animation:blink 1.4s ease-in-out infinite;} @keyframes toastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} .toast{animation:toastIn .2s ease;}";

async function persist(d){try{await window.storage.set("aereo-v7",JSON.stringify(d));}catch(e){}}
async function loadPersisted(){try{const r=await window.storage.get("aereo-v7");return r?JSON.parse(r.value):null;}catch(e){return null;}}

// --- LOGIN SCREEN (ATUALIZADO: olhinho + recuperar senha + backup) ------------
function LoginScreen({onLogin}){
  var [email,setEmail]=useState("");
  var [password,setPassword]=useState("");
  var [showPassword,setShowPassword]=useState(false);
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [focused,setFocused]=useState("");
  var [resetMode,setResetMode]=useState(false);
  var [resetEmail,setResetEmail]=useState("");
  var [resetLoading,setResetLoading]=useState(false);
  var [resetMsg,setResetMsg]=useState("");

  async function handleLogin(){
    if(!email||!password){setError("Preencha email e senha.");return;}
    setLoading(true);setError("");
    try{ await signIn(email,password); onLogin(); }
    catch(e){ setError(e.message||"Email ou senha incorretos."); }
    finally{ setLoading(false); }
  }

  async function handleReset(){
    if(!resetEmail){setResetMsg("Digite seu email.");return;}
    setResetLoading(true);setResetMsg("");
    try{
      await resetPassword(resetEmail);
      setResetMsg("✓ Email enviado! Verifique sua caixa de entrada.");
    }catch(e){ setResetMsg(e.message||"Erro ao enviar email."); }
    finally{ setResetLoading(false); }
  }

  async function handleBackup(){
    try{
      const local=await loadPersisted();
      if(!local){alert("Nenhum dado local encontrado para backup.");return;}
      const json=JSON.stringify(local,null,2);
      const blob=new Blob([json],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download="backup_estoque_"+todayFull().replace(/\//g,"-")+".json";
      a.click();
      URL.revokeObjectURL(url);
    }catch(e){alert("Erro no backup: "+e.message);}
  }

  var loginCSS="@keyframes floatDuck{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}"+
    "@keyframes ripple{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(2.2);opacity:0}}"+
    "@keyframes fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}"+
    ".login-duck{animation:floatDuck 3s ease-in-out infinite;}"+
    ".login-ripple{animation:ripple 2.5s ease-out infinite;}"+
    ".login-ripple2{animation:ripple 2.5s ease-out infinite 0.8s;}"+
    ".login-ripple3{animation:ripple 2.5s ease-out infinite 1.6s;}"+
    ".login-card{animation:fadeSlideUp 0.4s ease;}";

  return React.createElement("div",{style:{
    background:"linear-gradient(160deg,#051820 0%,#071e26 40%,#0a2d38 100%)",
    minHeight:"100vh",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"
  }},
    React.createElement("style",null,loginCSS),
    React.createElement("div",{style:{position:"absolute",inset:0,pointerEvents:"none"}},
      React.createElement("div",{style:{position:"absolute",top:"10%",left:"5%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,209,161,0.06) 0%,transparent 70%)"}}),
      React.createElement("div",{style:{position:"absolute",bottom:"15%",right:"8%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,209,161,0.04) 0%,transparent 70%)"}})
    ),
    React.createElement("div",{style:{position:"relative",marginBottom:32,display:"flex",flexDirection:"column",alignItems:"center"}},
      React.createElement("div",{style:{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:80,height:20}},
        React.createElement("div",{className:"login-ripple",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.4)"}}),
        React.createElement("div",{className:"login-ripple2",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.3)"}}),
        React.createElement("div",{className:"login-ripple3",style:{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,209,161,0.2)"}})
      ),
      React.createElement("div",{className:"login-duck"},React.createElement(DuckIcon,{size:90}))
    ),
    React.createElement("div",{className:"login-card",style:{textAlign:"center",marginBottom:32}},
      React.createElement("div",{style:{fontSize:13,color:"#1dd1a1",fontWeight:700,letterSpacing:"0.15em",marginBottom:8,textTransform:"uppercase"}},"Estoque Aéreo"),
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#e4f5f0",lineHeight:1.2,marginBottom:6}},"Bem Vindo,"),
      React.createElement("div",{style:{fontSize:26,fontWeight:800,color:"#1dd1a1",lineHeight:1.2}},"Operador! 👋"),
      React.createElement("div",{style:{fontSize:13,color:"#3f7068",marginTop:10}},"Faça login para continuar")
    ),
    React.createElement("div",{className:"login-card",style:{
      width:"100%",maxWidth:360,background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:24,backdropFilter:"blur(10px)",
    }},
      !resetMode?(
        React.createElement(React.Fragment,null,
          error&&React.createElement("div",{style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#ff6b6b",textAlign:"center"}},error),
          React.createElement("div",{style:{marginBottom:14}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"EMAIL"),
            React.createElement("input",{
              type:"email",value:email,
              onChange:function(e){setEmail(e.target.value);setError("");},
              onFocus:function(){setFocused("email");},onBlur:function(){setFocused("");},
              onKeyDown:function(e){if(e.key==="Enter")handleLogin();},
              placeholder:"seu@email.com",
              style:{background:focused==="email"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="email"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",transition:"all 0.2s"}
            })
          ),
          React.createElement("div",{style:{marginBottom:8}},
            React.createElement("label",{style:{fontSize:11,color:"#6aada0",fontWeight:700,letterSpacing:"0.08em",display:"block",marginBottom:6}},"SENHA"),
            React.createElement("div",{style:{position:"relative"}},
              React.createElement("input",{
                type:showPassword?"text":"password",value:password,
                onChange:function(e){setPassword(e.target.value);setError("");},
                onFocus:function(){setFocused("password");},onBlur:function(){setFocused("");},
                onKeyDown:function(e){if(e.key==="Enter")handleLogin();},
                placeholder:"••••••••",
                style:{background:focused==="password"?"rgba(29,209,161,0.06)":"rgba(255,255,255,0.05)",border:"1px solid "+(focused==="password"?"rgba(29,209,161,0.5)":"rgba(255,255,255,0.1)"),borderRadius:12,padding:"12px 40px 12px 16px",color:"#e4f5f0",fontSize:14,width:"100%",outline:"none",transition:"all 0.2s"}
              }),
              React.createElement("button",{
                type:"button",onClick:function(){setShowPassword(!showPassword);},
                style:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#6aada0",fontSize:16,cursor:"pointer",padding:0,lineHeight:1}
              },showPassword?"🙈":"👁️")
            )
          ),
          React.createElement("button",{
            onClick:function(){setResetMode(true);setError("");},
            style:{background:"none",border:"none",color:"#3f7068",fontSize:11,textAlign:"right",width:"100%",marginBottom:16,cursor:"pointer"}
          },"Esqueci minha senha"),
          React.createElement("button",{
            onClick:handleLogin,disabled:loading,
            style:{background:loading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:15,width:"100%",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px rgba(29,209,161,0.3)",transition:"all 0.2s",letterSpacing:"0.02em"}
          },loading?"Entrando...":"Entrar")
        )
      ):(
        React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14}},
            React.createElement("button",{onClick:function(){setResetMode(false);setResetMsg("");},style:{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer",padding:0}},"←"),
            React.createElement("span",{style:{fontWeight:700,fontSize:14,color:C.text}},"Recuperar senha")
          ),
          resetMsg&&React.createElement("div",{style:{background:resetMsg.includes("✓")?"rgba(29,209,161,0.12)":"rgba(255,107,107,0.12)",border:"1px solid "+(resetMsg.includes("✓")?"rgba(29,209,161,0.3)":"rgba(255,107,107,0.3)"),borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:resetMsg.includes("✓")?"#1dd1a1":"#ff6b6b",textAlign:"center"}},resetMsg),
          React.createElement("div",{style:{fontSize:12,color:C.muted,marginBottom:10}},"Digite seu email para receber o link de redefinição:"),
          React.createElement("input",{
            type:"email",value:resetEmail,
            onChange:function(e){setResetEmail(e.target.value);setResetMsg("");},
            placeholder:"seu@email.com",
            style:{marginBottom:12}
          }),
          React.createElement("button",{
            onClick:handleReset,disabled:resetLoading,
            style:{background:resetLoading?"rgba(29,209,161,0.4)":"linear-gradient(135deg,#1dd1a1,#17a880)",color:"#071e26",border:"none",borderRadius:12,padding:"13px",fontWeight:800,fontSize:14,width:"100%",cursor:resetLoading?"not-allowed":"pointer"}
          },resetLoading?"Enviando...":"Enviar link de recuperação")
        )
      ),
      React.createElement("button",{
        onClick:handleBackup,
        style:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#3f7068",borderRadius:10,padding:"8px 12px",fontSize:11,width:"100%",marginTop:14,cursor:"pointer"}
      },"💾 Backup local")
    ),
    React.createElement("div",{style:{marginTop:24,fontSize:11,color:"#2a5a50",textAlign:"center"}},"Estoque Aéreo v1.1")
  );
}

function Lbl({children,req}){return React.createElement("label",{style:{fontSize:12,color:C.muted,fontWeight:600,display:"block",marginBottom:4}},children,req&&React.createElement("span",{style:{color:C.accent}}," *"));}
function Gap({h=12}){return React.createElement("div",{style:{height:h}});}
function Tag({children,color=C.accent,bg=C.accentDim}){return React.createElement("span",{style:{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}},children);}
function NumInput({value,onChange,placeholder,readOnly,style}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(e.target.value.replace(/\D/g,"")),placeholder,readOnly,style});}
function DateInput({value,onChange,placeholder="dd/mm/aaaa"}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(fmtDate(e.target.value)),placeholder});}
function DecInput({value,onChange,placeholder}){return React.createElement("input",{value,inputMode:"decimal",onChange:e=>onChange(e.target.value.replace(/[^0-9.,]/g,"")),placeholder});}
function Row({children}){const arr=Array.isArray(children)?children.filter(Boolean):[children];return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat("+arr.length+",1fr)",gap:10}},children);}
function SaveBtn({onClick,label="💾 Salvar"}){return React.createElement("button",{onClick,style:{background:C.accent,color:"#071e26",border:"none",borderRadius:10,padding:12,fontWeight:800,fontSize:14,width:"100%",marginTop:8}},label);}

function Modal({onClose,title,children,wide}){
  return React.createElement("div",{onClick:e=>{if(e.target===e.currentTarget)onClose();},style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}},
    React.createElement("div",{className:"su",style:{background:C.modalBg,border:"1px solid "+C.border,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:wide?600:420,maxHeight:"92vh",overflowY:"auto"}},
      React.createElement("div",{style:{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 16px"}}),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
        React.createElement("span",{style:{fontWeight:700,fontSize:16}},title),
        React.createElement("button",{onClick:onClose,style:{background:"rgba(255,255,255,0.07)",border:"1px solid "+C.border,color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:13}},"✕")
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
        React.createElement("button",{onClick:onCancel,style:{background:"rgba(255,255,255,0.08)",border:"1px solid "+C.border,color:C.muted,borderRadius:10,padding:11,fontWeight:600,fontSize:14}},"Cancelar"),
        React.createElement("button",{onClick:onConfirm,style:{background:"rgba(255,107,107,0.15)",border:"1px solid rgba(255,107,107,0.3)",color:C.danger,borderRadius:10,padding:11,fontWeight:700,fontSize:14}},"Excluir")
      )
    )
  );
}

function UndoToast({msg,onUndo,onDismiss}){
  return React.createElement("div",{className:"toast",style:{position:"fixed",bottom:24,left:16,right:16,maxWidth:380,margin:"0 auto",background:"#1a3a4a",border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,zIndex:500,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}},
    React.createElement("span",{style:{fontSize:16}},"🗑"),
    React.createElement("span",{style:{flex:1,fontSize:13,color:C.text}},msg),
    React.createElement("button",{onClick:onUndo,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.3)",color:C.accent,borderRadius:8,padding:"5px 12px",fontWeight:700,fontSize:12,flexShrink:0}},"Desfazer"),
    React.createElement("button",{onClick:onDismiss,style:{background:"none",border:"none",color:C.dim,fontSize:16,padding:"0 2px",flexShrink:0}},"✕")
  );
}

function StackColumn({group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId,onDropOnStack}){
  const [hovered,setHovered]=useState(-1);
  const CARD_H=90;
  const PEEK=32;
  const isSingle=group.length===1;
  const colHeight=isSingle?CARD_H:CARD_H+(group.length-1)*PEEK;
  return React.createElement("div",{
    style:{position:"relative",width:116,flexShrink:0,height:colHeight,marginRight:6},
    onDragOver:function(e){e.preventDefault();},
    onDrop:function(e){e.preventDefault();e.stopPropagation();if(dragRef.current)onDropOnStack(group[0].id,floorId);}
  },
    [...group].reverse().map((box,ri)=>{
      const i=group.length-1-ri;
      const vi=getValidity(box.validade);
      const isFront=i===0;
      const isHov=hovered===i;
      const topOffset=(group.length-1-i)*PEEK;
      const liftOffset=isHov?-10:0;
      return React.createElement("div",{
        key:box.id,draggable:true,
        onDragStart:function(e){dragRef.current={box,fromFloorId:floorId};setDraggingId(box.id);e.dataTransfer.effectAllowed="move";},
        onDragEnd:function(){dragRef.current=null;setDraggingId(null);},
        onDragOver:function(e){e.preventDefault();e.dataTransfer.dropEffect="move";},
        onMouseEnter:function(){setHovered(i);},
        onMouseLeave:function(){setHovered(-1);},
        onTouchStart:function(e){
          setHovered(i);
          var t=e.touches[0];
          dragRef.current={box,fromFloorId:floorId,touchStartX:t.clientX,touchStartY:t.clientY,isDragging:false};
          setDraggingId(box.id);
        },
        onTouchMove:function(e){
          var dr=dragRef.current;
          if(!dr||!dr.box) return;
          var t=e.touches[0];
          var dx=Math.abs(t.clientX-(dr.touchStartX||0));
          var dy=Math.abs(t.clientY-(dr.touchStartY||0));
          if(dx>8||dy>8){ dr.isDragging=true; e.preventDefault(); }
        },
        onTouchEnd:function(e){
          setHovered(-1);
          var dr=dragRef.current;
          if(!dr||!dr.isDragging){ dragRef.current=null; setDraggingId(null); return; }
          var t=e.changedTouches[0];
          var el=document.elementFromPoint(t.clientX,t.clientY);
          var slot=el;
          var slotIdx=-1;
          while(slot&&slot!==document.body){
            if(slot.dataset&&slot.dataset.slotidx!=null){slotIdx=parseInt(slot.dataset.slotidx);break;}
            slot=slot.parentElement;
          }
          if(slotIdx>=0){ onDropOnStack(null,floorId,slotIdx); }
          else { dragRef.current=null;setDraggingId(null); }
        },
        onClick:function(e){e.stopPropagation();onClickBox(box);},
        style:{
          position:"absolute",top:topOffset,left:0,width:"100%",height:CARD_H,
          background:isHov?"rgba(25,80,100,0.99)":isFront?"rgba(12,58,78,0.98)":"rgba(8,42,58,0.96)",
          border:"1px solid "+(vi&&vi.days<=90?vi.color+"cc":isFront?"rgba(29,209,161,0.5)":"rgba(29,209,161,0.28)"),
          borderRadius:10,padding:"8px 9px",cursor:"grab",overflow:"hidden",
          transform:"translateY("+liftOffset+"px)",
          transition:"transform 0.18s ease, box-shadow 0.18s",
          zIndex:isHov?100:group.length-i,
          boxShadow:isHov?"0 8px 20px rgba(0,0,0,0.8)":isFront?"0 4px 14px rgba(0,0,0,0.6)":"0 2px 6px rgba(0,0,0,0.5)",
          userSelect:"none",
        }
      },
        React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}},
          React.createElement("div",{style:{fontSize:34,opacity:0.05,lineHeight:1}},mascot)
        ),
        isFront?(
          React.createElement(React.Fragment,null,
            React.createElement("div",{style:{position:"relative",fontWeight:800,fontSize:12,color:"#e4f5f0",wordBreak:"break-all",marginBottom:6}},box.sku),
            React.createElement("div",{style:{borderTop:"1px dashed rgba(29,209,161,0.2)",marginBottom:6}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:8,color:"#5a9d90",marginBottom:1}},"QTD."),
                React.createElement("div",{style:{fontSize:16,fontWeight:800,color:"#1dd1a1",lineHeight:1}},box.qty)
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                box.updatedBy&&React.createElement("div",{style:{fontSize:8,color:"#5a9d90"}},box.updatedBy),
                box.date&&React.createElement("div",{style:{fontSize:8,color:"#4a8878"}},box.date),
                vi&&React.createElement("div",{style:{fontSize:8,color:vi.color,fontWeight:700}},"●")
              )
            )
          )
        ):(
          React.createElement("div",{style:{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
            React.createElement("div",{style:{fontWeight:700,fontSize:11,color:"#c8e8e0",wordBreak:"break-all",flex:1,marginRight:6}},box.sku),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:3,flexShrink:0}},
              React.createElement("div",{style:{fontSize:8,color:"#5a9d90"}},"QTD"),
              React.createElement("div",{style:{fontSize:12,fontWeight:800,color:"#1dd1a1"}},box.qty)
            )
          )
        ),
        React.createElement("div",{style:{position:"absolute",bottom:0,left:0,right:0,height:2,background:vi?vi.color+"44":"rgba(29,209,161,0.15)",borderRadius:"0 0 10px 10px"}})
      );
    })
  );
}

function FloorRow({floor,mascot,products,onClickBox,onUpdateFloor,dragRef,draggingId,setDraggingId}){
  var MAX_SLOTS=10,SLOT_W=124,SLOT_H=100,GAP=8;
  function buildSlots(boxes){
    var slots=[];for(var i=0;i<MAX_SLOTS;i++)slots.push(null);
    var stacks={},order=[],seen={};
    boxes.forEach(function(b){var key=b.stackId||b.id;if(!seen[key]){seen[key]=true;order.push(key);}if(!stacks[key])stacks[key]=[];stacks[key].push(b);});
    order.forEach(function(key,idx){
      var group=stacks[key].sort(function(a,b){return(a.stackOrder||0)-(b.stackOrder||0);});
      var slotIdx=group[0].slotIndex!=null?group[0].slotIndex:idx;
      if(slotIdx>=MAX_SLOTS)slotIdx=MAX_SLOTS-1;
      while(slotIdx<MAX_SLOTS&&slots[slotIdx]!==null)slotIdx++;
      if(slotIdx<MAX_SLOTS)slots[slotIdx]=group;
    });
    return slots;
  }
  var slots=buildSlots(floor.boxes);
  var [dragOverSlot,setDragOverSlot]=useState(-1);
  var scrollRef=useRef(null),touchStartX=useRef(0),touchScrollLeft=useRef(0),touchDragging=useRef(false);
  function onTouchStart(e){if(dragRef.current)return;touchStartX.current=e.touches[0].clientX;touchScrollLeft.current=scrollRef.current?scrollRef.current.scrollLeft:0;touchDragging.current=false;}
  function onTouchMove(e){if(dragRef.current)return;var dx=touchStartX.current-e.touches[0].clientX;if(Math.abs(dx)>6)touchDragging.current=true;if(touchDragging.current&&scrollRef.current)scrollRef.current.scrollLeft=touchScrollLeft.current+dx;}
  function dropOnSlot(slotIdx){
    var dr=dragRef.current;if(!dr)return;
    dragRef.current=null;setDragOverSlot(-1);
    var existingInSlot=slots[slotIdx],draggedBox=dr.box;
    if(existingInSlot){
      var topBox=existingInSlot[existingInSlot.length-1];
      var stackId=topBox.stackId||(draggedBox.id+"_stk");
      var maxOrder=existingInSlot.reduce(function(m,b){return Math.max(m,b.stackOrder||0);},0);
      if(existingInSlot.length>=10){alert("Máximo de 10 caixas por pilha!");return;}
      var newBox=Object.assign({},draggedBox,{stackId:stackId,stackOrder:maxOrder+1,slotIndex:slotIdx});
      var newBoxes=floor.boxes.filter(function(b){return b.id!==draggedBox.id;});
      newBoxes=newBoxes.map(function(b){if(existingInSlot.find(function(x){return x.id===b.id;}))return Object.assign({},b,{stackId:stackId,slotIndex:slotIdx});return b;});
      newBoxes.push(newBox);
      onUpdateFloor(floor.id,newBoxes,dr.fromFloorId,draggedBox.id,newBox);
    }else{
      var newBox2=Object.assign({},draggedBox,{stackId:null,stackOrder:0,slotIndex:slotIdx});
      var newBoxes2;
      if(dr.fromFloorId===floor.id){newBoxes2=floor.boxes.map(function(b){return b.id===draggedBox.id?newBox2:b;});}
      else{newBoxes2=floor.boxes.concat([newBox2]);}
      onUpdateFloor(floor.id,newBoxes2,dr.fromFloorId,draggedBox.id,newBox2);
    }
  }
  return React.createElement("div",{ref:scrollRef,onTouchStart:onTouchStart,onTouchMove:onTouchMove,style:{display:"flex",overflowX:"auto",gap:GAP,padding:"8px 4px 14px",minHeight:SLOT_H+22,WebkitOverflowScrolling:"touch"}},
    slots.map(function(group,slotIdx){
      var isOver=dragOverSlot===slotIdx;
      return React.createElement("div",{
        key:slotIdx,"data-slotidx":slotIdx,
        onDragOver:function(e){e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverSlot(slotIdx);},
        onDragLeave:function(e){if(!e.currentTarget.contains(e.relatedTarget))setDragOverSlot(-1);},
        onDrop:function(e){e.preventDefault();e.stopPropagation();dropOnSlot(slotIdx);},
        style:{flexShrink:0,width:SLOT_W,height:group?(90+(group.length-1)*32):SLOT_H,minHeight:SLOT_H,border:isOver?"2px dashed #1dd1a1":(group?"none":"1px dashed rgba(255,255,255,0.07)"),borderRadius:12,background:isOver?"rgba(29,209,161,0.06)":"transparent",position:"relative",transition:"border-color 0.15s, background 0.15s"}
      },
        group&&React.createElement(StackColumn,{group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId:floor.id,onDropOnStack:function(targetBoxId,fid,touchSlotIdx){dropOnSlot(touchSlotIdx!=null?touchSlotIdx:slotIdx);}}),
        !group&&isOver&&React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#1dd1a1",fontWeight:600}},"Soltar aqui")
      );
    })
  );
}

function BoxDetailModal({box,product,floorNumber,bay,corridor,onEdit,onClose,allLocations}){
  const vi=getValidity(box.validade);
  const otherLocs=(allLocations||[]).filter(l=>l.box.id!==box.id);
  const rows=[
    {l:"Descrição",v:product&&product.desc},{l:"Família",v:product&&product.familia},
    {l:"Fornecedor",v:product&&product.fornecedor},{l:"Unidade",v:product&&product.um},
    {l:"Preço",v:product&&product.preco?"R$ "+parsePrice(product.preco).toFixed(2):"-"},
    {l:"EAN",v:product&&product.ean||"-"},{l:"Situação",v:product&&product.situacao||"-"},
    {l:"Enfrentamento",v:product&&product.dtaInicio&&product.dtaFim?product.dtaInicio+" → "+product.dtaFim:"-"},
  ];
  return React.createElement(Modal,{onClose,title:"📦 SKU "+box.sku},
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}},
      [{icon:"📦",label:"Qtd.",val:String(box.qty),color:null},{icon:"📍",label:"Local",val:"C"+corridor.number+" B"+bay.number+" A"+floorNumber,color:null},{icon:"📅",label:"Validade",val:box.validade||"-",color:vi&&vi.color}]
        .map((s,i)=>React.createElement("div",{key:i,style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+(s.color||C.border),borderRadius:10,padding:"10px 8px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:18,marginBottom:4}},s.icon),
          React.createElement("div",{style:{fontSize:9,color:C.muted,marginBottom:2}},s.label),
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:s.color||C.text,wordBreak:"break-all"}},s.val)
        ))
    ),
    vi&&vi.days<=90&&React.createElement("div",{style:{background:vi.color+"15",border:"1px solid "+vi.color+"44",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}},
      React.createElement("span",{style:{fontSize:16}},vi.days<0?"💀":vi.days<=30?"🚨":"⚠️"),
      React.createElement("span",{style:{fontSize:12,color:vi.color,fontWeight:700}},vi.days<0?"Vencido há "+Math.abs(vi.days)+" dias":vi.days+" dias restantes")
    ),
    otherLocs.length>0&&React.createElement("div",{style:{background:"rgba(255,211,102,0.08)",border:"1px solid rgba(255,211,102,0.3)",borderRadius:10,padding:10,marginBottom:12}},
      React.createElement("div",{style:{fontSize:11,color:"#ffd166",fontWeight:700,marginBottom:8}},"⚠️ Mesmo SKU em outros locais:"),
      otherLocs.map((l,i)=>React.createElement("div",{key:i,style:{fontSize:11,color:C.text,padding:"4px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.06)":"none"}},
        "📍 C"+l.cor.number+" · Bay "+l.bay.number+" "+l.bay.side.slice(0,3)+". · Andar "+l.fl.number+" · Qtd: ",
        React.createElement("span",{style:{color:C.accent,fontWeight:700}},l.box.qty)
      ))
    ),
    React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10,letterSpacing:"0.05em"}},"📋 DADOS DO PRODUTO"),
      product?React.createElement("div",{style:{display:"grid",gap:8}},rows.map((row,i)=>React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",gap:8}},
        React.createElement("span",{style:{fontSize:11,color:C.muted,flexShrink:0}},row.l),
        React.createElement("span",{style:{fontSize:11,color:C.text,fontWeight:600,textAlign:"right",wordBreak:"break-word"}},row.v||"-")
      ))):React.createElement("div",{style:{textAlign:"center",padding:"10px 0"}},
        React.createElement("div",{style:{fontSize:22,marginBottom:6}},"📭"),
        React.createElement("div",{style:{fontSize:12,color:C.muted}},"Produto não cadastrado.")
      )
    ),
    React.createElement("button",{onClick:onEdit,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:10,padding:11,fontWeight:700,fontSize:13,width:"100%"}},"✏️ Editar Caixa")
  );
}

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
    product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.accent,background:C.accentDim,borderRadius:8,padding:"6px 10px"}},"✓ "+(product.desc||"Produto cadastrado")),
    form.sku&&!product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.dim,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}},"SKU não cadastrado."),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,{req:true},"Quantidade"),React.createElement(NumInput,{value:form.qty,onChange:v=>set("qty",v),placeholder:"0"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Nome"),React.createElement("input",{value:form.updatedBy,onChange:e=>set("updatedBy",e.target.value),placeholder:""}))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Validade"),
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:8}},
      ["direta","calcular"].map(m=>React.createElement("button",{key:m,onClick:()=>setValdMode(m),style:{flex:1,background:valdMode===m?C.accentDim:"rgba(255,255,255,0.05)",border:"1px solid "+(valdMode===m?"rgba(29,209,161,0.4)":C.border),color:valdMode===m?C.accent:C.muted,borderRadius:8,padding:7,fontSize:12,fontWeight:600}},m==="direta"?"📅 Data direta":"🔢 Calcular"))
    ),
    valdMode==="direta"&&React.createElement(DateInput,{value:form.validade,onChange:v=>set("validade",v)}),
    valdMode==="calcular"&&React.createElement(React.Fragment,null,
      React.createElement(Row,null,
        React.createElement("div",null,React.createElement(Lbl,null,"Data fabricação"),React.createElement(DateInput,{value:fabDate,onChange:setFabDate})),
        React.createElement("div",null,React.createElement(Lbl,null,"Meses"),React.createElement(NumInput,{value:meses,onChange:setMeses,placeholder:"12"}))
      ),
      form.validade&&React.createElement("div",{style:{marginTop:8,fontSize:12,color:C.accent,background:C.accentDim,borderRadius:8,padding:"7px 10px",textAlign:"center"}},"📅 Vencimento: "+form.validade)
    ),
    React.createElement(SaveBtn,{onClick:submit})
  );
}

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

function ProductsScreen({products,onBack,onSaveProduct,onDeleteProduct,onConfirmDelete}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=Object.values(products).filter(p=>!search||p.sku.includes(search)||p.desc&&p.desc.toLowerCase().includes(search.toLowerCase())||p.fornecedor&&p.fornecedor.toLowerCase().includes(search.toLowerCase()));
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"🗂 Catálogo de Produtos"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},Object.keys(products).length+" produtos")
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
      list.map(p=>React.createElement("div",{key:p.sku,onClick:()=>setModal({product:p}),className:"ch fin",style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8,cursor:"pointer"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}},
          React.createElement(Tag,null,p.sku),
          p.um&&React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.muted},p.um)
        ),
        p.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4,lineHeight:1.4}},p.desc),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
          p.familia&&React.createElement("span",{style:{fontSize:10,color:C.dim}},p.familia),
          p.fornecedor&&React.createElement("span",{style:{fontSize:10,color:C.dim}},"· "+p.fornecedor),
          p.preco&&React.createElement("span",{style:{fontSize:10,color:C.dim}},"· R$ "+parsePrice(p.preco).toFixed(2))
        )
      ))
    ),
    modal&&React.createElement(ProductModal,{
      product:modal.product,
      onSave:p=>{onSaveProduct(p);setModal(null);},
      onClose:()=>setModal(null),
      onDelete:modal.product?()=>onConfirmDelete("Excluir produto "+modal.product.sku+"?",()=>{onDeleteProduct(modal.product.sku);setModal(null);}):undefined,
    })
  );
}

function ValidityScreen({data,onBack,onNavigate}){
  const items=getAllExpiring(data);
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"⏰ Alertas de Validade"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},items.length+" item(s) a vencer em 90 dias")
      )
    ),
    React.createElement("div",{style:{padding:"12px 14px"}},
      items.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:40,marginBottom:12}},"✅"),
        React.createElement("div",{style:{fontSize:14}},"Nenhuma validade próxima!")
      ),
      items.map((item,i)=>React.createElement("div",{key:i,className:"ch fin",onClick:()=>onNavigate({corridorId:item.cor.id,bayId:item.bay.id,boxId:item.box.id}),
        style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+item.v.color+"44",borderRadius:12,padding:12,marginBottom:8,cursor:"pointer",position:"relative",overflow:"hidden"}},
        React.createElement("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:3,background:item.v.color,borderRadius:"12px 0 0 12px"}}),
        React.createElement("div",{style:{paddingLeft:8}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}},
            React.createElement(Tag,null,item.box.sku),
            React.createElement("span",{style:{fontSize:11,color:item.v.color,fontWeight:700}},item.v.label+" · "+(item.v.days<0?"Vencido há "+Math.abs(item.v.days)+"d":item.v.days+" dias"))
          ),
          item.product&&item.product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},item.product.desc),
          React.createElement("div",{style:{fontSize:10,color:C.dim}},"📍 C"+item.cor.number+" · Bay "+item.bay.number+" · Andar "+item.fl.number+" · Qtd: "+item.box.qty),
          React.createElement("div",{style:{fontSize:10,color:item.v.color,marginTop:4}},"📅 "+item.box.validade+" → Ir para o local ›")
        )
      ))
    )
  );
}

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
    React.createElement("div",{style:{padding:16,display:"flex",gap:10,alignItems:"center",borderBottom:"1px solid "+C.border,flexShrink:0}},
      React.createElement("div",{style:{flex:1,position:"relative"}},
        React.createElement("input",{ref:inputRef,value:query,onChange:e=>setQuery(e.target.value),placeholder:"SKU ou nome do produto...",style:{paddingLeft:36}}),
        React.createElement("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}},"🔍"),
        query&&React.createElement("button",{onClick:()=>setQuery(""),style:{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.dim,fontSize:16,lineHeight:1}},"✕")
      ),
      React.createElement("button",{onClick:onClose,style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:8,padding:"8px 14px",fontSize:13,flexShrink:0}},"Fechar")
    ),
    suggestions.length>0&&React.createElement("div",{style:{padding:"8px 14px",borderBottom:"1px solid "+C.border,flexShrink:0,display:"flex",gap:6,flexWrap:"wrap"}},
      suggestions.map(s=>React.createElement("button",{key:s,onClick:()=>setQuery(s),style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.2)",color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600}},s))
    ),
    React.createElement("div",{style:{flex:1,overflowY:"auto",padding:14}},
      term.length>=2&&results.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"🔍"),
        React.createElement("div",null,"Nenhum resultado para \""+term+"\"")
      ),
      term.length<2&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.dim}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"💡"),
        React.createElement("div",{style:{fontSize:13}},"Digite o SKU ou nome do produto")
      ),
      results.map((r,i)=>React.createElement("div",{key:i,className:"fin",style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
          React.createElement(Tag,null,r.sku),
          React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.dim},r.locations.length+" local(is)")
        ),
        r.product&&r.product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},r.product.desc),
        r.product&&r.product.fornecedor&&React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:8}},r.product.fornecedor),
        r.locations.map((l,j)=>React.createElement("button",{key:j,onClick:()=>{onNavigate({corridorId:l.cor.id,bayId:l.bay.id,boxId:l.box.id});onClose();},className:"ch",
          style:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"rgba(29,209,161,0.06)",border:"1px solid rgba(29,209,161,0.15)",borderRadius:8,padding:"8px 10px",marginBottom:4,textAlign:"left"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:C.text,fontWeight:600}},"📍 C"+l.cor.number+" · Bay "+l.bay.number+" ("+l.bay.side.slice(0,3)+".) · Andar "+l.fl.number),
            React.createElement("div",{style:{fontSize:10,color:C.muted,marginTop:2}},"Qtd: "+l.box.qty+(l.box.updatedBy?" · "+l.box.updatedBy:"")+" · "+l.box.date)
          ),
          React.createElement("span",{style:{color:C.accent,fontSize:18,marginLeft:8}},"›")
        ))
      ))
    )
  );
}

function BayScreen({bay,corridor,products,corridors,onBack,onUpdateBay,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [modal,setModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const dragRef=useRef(null);
  const [draggingId,setDraggingId]=useState(null);
  const floors=[...bay.floors].sort((a,b)=>b.number-a.number);
  const totalBoxes=bay.floors.reduce((s,f)=>s+f.boxes.length,0);
  function updateBayFloors(newFloors){onUpdateBay({...bay,floors:renumberFloors(newFloors)});}
  function handleFloorUpdate(toFloorId,newToBoxes,fromFloorId,draggedBoxId,stackedBox){
    const newFloors=bay.floors.map(f=>{
      if(f.id===toFloorId) return{...f,boxes:newToBoxes};
      if(f.id===fromFloorId&&fromFloorId!==toFloorId) return{...f,boxes:f.boxes.filter(b=>b.id!==draggedBoxId)};
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
    React.createElement("div",{style:{padding:"14px 14px 10px",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{style:{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},(corridor.mascot||"")+" Aéreo - Bay "+bay.number),
        React.createElement("div",{style:{fontSize:10,color:C.muted}},bay.side+" · "+bay.label+" · C"+corridor.number)
      ),
      React.createElement(Tag,null,floors.length+" and."),
      React.createElement(Tag,null,totalBoxes+" cx.")
    ),
    React.createElement("div",{style:{padding:"12px 12px 80px"}},
      floors.map(floor=>React.createElement("div",{key:floor.id,style:{background:"rgba(0,0,0,0.25)",border:"1px solid "+C.border,borderRadius:12,padding:"10px 10px 4px",marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
          React.createElement("span",{style:{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}},"ANDAR "+floor.number),
          React.createElement("div",{style:{display:"flex",gap:6}},
            React.createElement("button",{onClick:()=>setModal({type:"add",floorId:floor.id}),style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:7,padding:"2px 11px",fontSize:19,lineHeight:"1.2"}},"+"),
            React.createElement("button",{onClick:()=>{if(floor.boxes.length>0){alert("Remova as caixas antes.");return;}onRegisterUndo("Andar excluído");updateBayFloors(bay.floors.filter(f=>f.id!==floor.id));},style:{background:"none",border:"1px solid "+C.border,color:C.dim,borderRadius:7,padding:"2px 8px",fontSize:12}},"✕")
          )
        ),
        React.createElement(FloorRow,{floor,mascot:corridor.mascot||"📦",products,onClickBox:box=>setDetailModal({box,floorId:floor.id,floorNumber:floor.number}),onUpdateFloor:handleFloorUpdate,dragRef,draggingId,setDraggingId})
      )),
      React.createElement("button",{onClick:()=>{const nf=renumberFloors([...bay.floors,{id:genId(),number:999,boxes:[]}]);onUpdateBay({...bay,floors:nf});},style:{background:"none",border:"1px dashed "+C.border,color:C.muted,borderRadius:12,padding:11,width:"100%",fontSize:13,marginTop:4}},"+ Adicionar Andar")
    ),
    detailModal&&!modal&&React.createElement(BoxDetailModal,{
      box:detailModal.box,product:products[detailModal.box.sku],
      floorNumber:detailModal.floorNumber,bay,corridor,
      allLocations:findBySku(detailModal.box.sku,corridors),
      onEdit:()=>setModal({type:"edit",floorId:detailModal.floorId,box:detailModal.box}),
      onClose:()=>setDetailModal(null),
    }),
    modal&&React.createElement(BoxEditModal,{modal,products,onSave:handleSave,onClose:()=>setModal(null),onDelete:()=>onConfirmDelete("Excluir esta caixa?",doDeleteBox)})
  );
}

function BayModal({bay,side,onSave,onClose}){
  const [label,setLabel]=useState(bay&&bay.label||"");
  return React.createElement(Modal,{onClose,title:(bay?"✏️ Editar":"➕ Novo")+" Bay - "+side},
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
      emojis.map(e=>React.createElement("button",{key:e,onClick:()=>setMascot(e),style:{background:mascot===e?C.accentDim:"rgba(255,255,255,0.06)",border:"1px solid "+(mascot===e?"rgba(29,209,161,0.4)":C.border),borderRadius:8,padding:"6px 10px",fontSize:20}},e))
    ),
    React.createElement(SaveBtn,{onClick:()=>{if(!name.trim()){alert("Nome obrigatório!");return;}onSave({name:name.trim(),mascot});}})
  );
}

function CorridorScreen({corridor,products,corridors,onBack,onUpdateCorridor,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [selectedBay,setSelectedBay]=useState(highlightBayId||null);
  const [bayModal,setBayModal]=useState(null);
  if(selectedBay){
    const bay=corridor.bays.find(b=>b.id===selectedBay);
    if(!bay){setSelectedBay(null);return null;}
    return React.createElement(BayScreen,{bay,corridor,products,corridors,onBack:()=>setSelectedBay(null),highlightBoxId,onConfirmDelete,onRegisterUndo,
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
    return React.createElement("div",{className:"fin",style:{background:"rgba(255,255,255,0.06)",border:"1px solid "+C.border,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}},
      React.createElement("div",{style:{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}},corridor.mascot||"📦"),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}},
        React.createElement(Tag,null,"Bay "+bay.number),
        React.createElement("div",{style:{display:"flex",gap:4}},
          React.createElement("button",{onClick:e=>{e.stopPropagation();setBayModal({side:bay.side,bay});},style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}},"✏️"),
          React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete("Excluir Bay "+bay.number+"?",()=>{
            if(bay.floors.reduce((s,f)=>s+f.boxes.length,0)>0){alert("Remova todas as caixas antes.");return;}
            onRegisterUndo("Bay "+bay.number+" excluído");
            onUpdateCorridor({...corridor,bays:corridor.bays.filter(b=>b.id!==bay.id)});
          });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}},"🗑")
        )
      ),
      React.createElement("div",{onClick:()=>setSelectedBay(bay.id),className:"ch",style:{padding:"10px 10px 12px",cursor:"pointer"}},
        React.createElement("div",{style:{fontWeight:600,fontSize:13,marginBottom:8,color:C.text}},bay.label),
        React.createElement(Tag,null,total+" cx · "+bay.floors.length+" and. ›")
      )
    );
  }
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},corridor.mascot||"📦"),
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",null,React.createElement("div",{style:{fontWeight:700,fontSize:17}},(corridor.mascot||"")+" Corredor "+corridor.number))
    ),
    React.createElement("div",{style:{padding:14}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}},
        React.createElement("span",{style:{fontSize:10,color:C.accent,fontWeight:700}},"◉ ESQUERDO"),
        React.createElement("span",{style:{fontSize:10,color:C.accent,fontWeight:700,textAlign:"right"}},"DIREITO ◉")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
        React.createElement("div",null,leftBays.map(b=>React.createElement(BayCard,{key:b.id,bay:b})),React.createElement("button",{onClick:()=>setBayModal({side:"Esquerdo",bay:null}),style:{background:"none",border:"1px dashed "+C.border,color:C.muted,borderRadius:10,padding:9,width:"100%",fontSize:12,marginBottom:8}},"+ Bay Esq.")),
        React.createElement("div",null,rightBays.map(b=>React.createElement(BayCard,{key:b.id,bay:b})),React.createElement("button",{onClick:()=>setBayModal({side:"Direito",bay:null}),style:{background:"none",border:"1px dashed "+C.border,color:C.muted,borderRadius:10,padding:9,width:"100%",fontSize:12,marginBottom:8}},"+ Bay Dir."))
      )
    ),
    bayModal&&React.createElement(BayModal,{bay:bayModal.bay,side:bayModal.side,onSave:handleBaySave,onClose:()=>setBayModal(null)})
  );
}

function SectorScreen({sector,corridors,products,allCorridors,onBack,onUpdateCorridor,onAddCorridor,onDeleteCorridor,highlightCorridorId,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [selectedCorridorId,setSelectedCorridorId]=useState(highlightCorridorId||null);
  const [corridorModal,setCorridorModal]=useState(null);
  if(selectedCorridorId){
    const cor=corridors.find(c=>c.id===selectedCorridorId);
    if(!cor){setSelectedCorridorId(null);return null;}
    return React.createElement(CorridorScreen,{corridor:cor,products,corridors:allCorridors,onBack:()=>setSelectedCorridorId(null),highlightBayId,highlightBoxId,onUpdateCorridor,onConfirmDelete,onRegisterUndo});
  }
  function handleCorridorSave(number){
    if(corridorModal.corridor) onUpdateCorridor({...corridorModal.corridor,number,mascot:sector.mascot});
    else onAddCorridor({id:genId(),sectorId:sector.id,number,mascot:sector.mascot,bays:[]});
    setCorridorModal(null);
  }
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,opacity:0.06,pointerEvents:"none",zIndex:0}},
      sector.name==="Hidráulica"?React.createElement(DuckIcon,{size:90}):React.createElement("div",{style:{fontSize:90,lineHeight:1}},sector.mascot)
    ),
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:17}},sector.mascot+" "+sector.name),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},corridors.length+" corredor(es)")
      ),
      React.createElement("button",{onClick:()=>setCorridorModal({corridor:null}),style:{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12}},"+ Corredor")
    ),
    React.createElement("div",{style:{padding:14}},
      corridors.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:40,marginBottom:12}},sector.mascot),
        React.createElement("div",{style:{fontSize:13}},"Nenhum corredor. Toque em + Corredor.")
      ),
      [...corridors].sort((a,b)=>a.number-b.number).map(cor=>{
        const totalBoxes=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
        return React.createElement("div",{key:cor.id,className:"fin",style:{background:"rgba(255,255,255,0.06)",border:"1px solid "+C.border,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}},
          React.createElement("div",{style:{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}},sector.mascot),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}},
            React.createElement(Tag,null,"Corredor "+cor.number),
            React.createElement("div",{style:{display:"flex",gap:4}},
              React.createElement("button",{onClick:e=>{e.stopPropagation();setCorridorModal({corridor:cor});},style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}},"✏️"),
              React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete("Excluir Corredor "+cor.number+"?",()=>{
                const total=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
                if(total>0){alert("Remova todas as caixas antes.");return;}
                onRegisterUndo("Corredor "+cor.number+" excluído");
                onDeleteCorridor(cor.id);
              });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}},"🗑")
            )
          ),
          React.createElement("div",{onClick:()=>setSelectedCorridorId(cor.id),className:"ch",style:{padding:"10px 10px 12px",cursor:"pointer"}},
            React.createElement("div",{style:{fontWeight:600,fontSize:14,marginBottom:6,color:C.text}},"Corredor "+cor.number),
            React.createElement(Tag,null,cor.bays.length+" bays · "+totalBoxes+" caixas ›")
          )
        );
      })
    ),
    corridorModal&&React.createElement(CorridorModal,{corridor:corridorModal.corridor,onSave:handleCorridorSave,onClose:()=>setCorridorModal(null)})
  );
}

function HomeScreen({data,onSelectSector,onOpenProducts,onOpenValidity,onOpenSearch,onAddSector,onEditSector,onDeleteSector,onConfirmDelete,onRegisterUndo,isAdmin,profile,onLogout}){
  const [sectorModal,setSectorModal]=useState(null);
  const expiringItems=getAllExpiring(data);
  const hasExpiring=expiringItems.length>0;
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},"📦"),
    React.createElement("div",{style:{padding:"22px 16px 14px",borderBottom:"1px solid "+C.border}},
      React.createElement("div",{style:{fontWeight:800,fontSize:22,marginBottom:4}},"📦 Estoque Aéreo"),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
        React.createElement("div",{style:{fontSize:12,color:C.muted}},profile?"Olá, "+(profile.name||"")+(profile.role==="admin"?" 👑":""):"Toque para explorar"),
        onLogout&&React.createElement("button",{onClick:onLogout,style:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer"}},"Sair")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,marginBottom:14}},
        React.createElement("button",{onClick:onOpenProducts,style:{flex:1,background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}},"🗂 Produtos"),
        React.createElement("button",{onClick:onOpenValidity,className:hasExpiring?"blink":"",style:{flex:1,background:hasExpiring?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.06)",border:"1px solid "+(hasExpiring?"rgba(255,107,107,0.3)":C.border),color:hasExpiring?C.danger:C.muted,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}},hasExpiring?"⚠️ Validades ("+expiringItems.length+")":"⏰ Validades")
      ),
      React.createElement("button",{onClick:onOpenSearch,style:{background:"rgba(255,255,255,0.08)",border:"1px solid "+C.border,borderRadius:10,padding:"11px 14px",color:C.dim,fontSize:14,width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:8}},
        React.createElement("span",null,"🔍")," Buscar por SKU ou nome..."
      )
    ),
    React.createElement("div",{style:{padding:"16px 16px 60px"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",{style:{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}},"SETORES"),
        React.createElement("button",{onClick:()=>setSectorModal({sector:null}),style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:8,padding:"4px 10px",fontSize:11}},"+ Setor")
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        (data.sectors||[]).map(sector=>{
          const secCors=(data.corridors||[]).filter(c=>c.sectorId===sector.id);
          const totalBoxes=secCors.reduce((s,c)=>s+c.bays.reduce((s2,b)=>s2+b.floors.reduce((s3,f)=>s3+f.boxes.length,0),0),0);
          return React.createElement("div",{key:sector.id,className:"fin",style:{background:"rgba(255,255,255,0.06)",border:"1px solid "+C.border,borderRadius:14,overflow:"hidden",position:"relative"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",padding:"6px 8px 0",gap:4,position:"relative",zIndex:1}},
              React.createElement("button",{onClick:e=>{e.stopPropagation();setSectorModal({sector});},style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:6,padding:"2px 6px",fontSize:10}},"✏️"),
              React.createElement("button",{onClick:e=>{e.stopPropagation();onConfirmDelete("Excluir setor \""+sector.name+"\"?",()=>{
                if((data.corridors||[]).some(c=>c.sectorId===sector.id)){alert("Remova todos os corredores deste setor antes.");return;}
                onRegisterUndo("Setor \""+sector.name+"\" excluído");
                onDeleteSector(sector.id);
              });},style:{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"2px 6px",fontSize:10}},"🗑")
            ),
            React.createElement("div",{onClick:()=>onSelectSector(sector.id),className:"ch",style:{padding:"4px 14px 16px",cursor:"pointer",textAlign:"center"}},
              React.createElement("div",{style:{width:48,height:48,marginBottom:8}},sector.name==="Hidráulica"?React.createElement(DuckIcon,{size:48}):React.createElement("div",{style:{fontSize:40,lineHeight:1}},sector.mascot)),
              React.createElement("div",{style:{fontWeight:700,fontSize:13,marginBottom:4,color:C.text,lineHeight:1.3}},sector.name),
              React.createElement("div",{style:{fontSize:10,color:C.dim}},secCors.length+" corr. · "+totalBoxes+" cx.")
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

  async function initData(){
    setLoadingData(true);
    try{ const remote=await loadFromSupabase(); setData(remote); }
    catch(e){ console.warn("Supabase load failed, using local:",e); const local=await loadPersisted(); setData(local||INITIAL); }
    finally{ setLoadingData(false); }
  }

  useEffect(()=>{
    if(session){ getProfile().then(p=>setProfile(p)).catch(()=>{}); initData(); }
  },[session]);

  useEffect(()=>{if(data){persist(data);dataRef.current=data;}},[data]);

  const screen=screenStack[screenStack.length-1];
  const nav=s=>setScreenStack(st=>[...st,s]);
  const back=()=>setScreenStack(st=>st.length>1?st.slice(0,-1):st);

  function registerUndo(msg){
    const snapshot=dataRef.current; if(!snapshot)return;
    if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
    setUndoState({msg,snapshot});
    undoTimerRef.current=setTimeout(()=>setUndoState(null),5000);
  }
  function doUndo(){if(undoState){setData(undoState.snapshot);setUndoState(null);if(undoTimerRef.current)clearTimeout(undoTimerRef.current);}}
  function confirmDelete(msg,onConfirm){setConfirmState({msg,onConfirm});}

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
    const bays=cor.bays||[];
    return Promise.all(bays.map(async function(bay){
      await db.upsertBay({id:bay.id,corridor_id:cor.id,number:bay.number,side:bay.side,label:bay.label});
      const floors=bay.floors||[];
      return Promise.all(floors.map(async function(floor){
        await db.upsertFloor({id:floor.id,bay_id:bay.id,number:floor.number});
        const boxes=floor.boxes||[];
        return Promise.all(boxes.map(function(box){
          return db.upsertBox({id:box.id,floor_id:floor.id,sku:box.sku,qty:box.qty,updated_by:box.updatedBy||null,date:box.date||null,validade:box.validade||null,stack_id:box.stackId||null,stack_order:box.stackOrder||0});
        }));
      }));
    }));
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
    screen.type==="home"&&React.createElement(HomeScreen,{data,onSelectSector:id=>nav({type:"sector",sectorId:id}),onOpenProducts:()=>nav({type:"products"}),onOpenValidity:()=>nav({type:"validity"}),onOpenSearch:()=>setShowSearch(true),onAddSector:addSector,onEditSector:editSector,onDeleteSector:deleteSector,profile,onLogout:async()=>{await signOut();setSession(null);setProfile(null);setData(null);setScreenStack([{type:"home"}]);}, ...sharedProps}),
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

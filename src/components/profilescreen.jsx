import React, { useState, useEffect } from "react";
import { C, Gap } from "./shared.jsx";
import { getMyRequests, createRequest } from "../services/supabase.jsx";

const TYPE_LABELS = {name:"Nome",sector:"Setor",role:"Role"};
const ROLE_LABELS = {"looker":"Looker","operator":"Operator","pro-operator":"Pro-Operator"};

export default function ProfileScreen({onBack, profile, sectors}){
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [msg,setMsg]=useState("");

  const [newName,setNewName]=useState("");
  const [newSectorId,setNewSectorId]=useState("");
  const [newRole,setNewRole]=useState("");

  async function reload(){
    setLoading(true);
    try{ setRequests(await getMyRequests()); }
    catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ reload(); },[]);

  const hasPending = type => requests.some(r=>r.type===type);

  async function handleRequest(type, currentValue, requestedValue){
    if(!requestedValue||requestedValue===currentValue){setMsg("O novo valor deve ser diferente do atual.");return;}
    if(hasPending(type)){setMsg("Você já tem um pedido de "+TYPE_LABELS[type]+" pendente.");return;}
    setSending(true);setMsg("");
    try{
      await createRequest(type, currentValue, requestedValue);
      setMsg("✓ Pedido enviado! Aguarde a aprovação do Endministrator.");
      setNewName("");setNewSectorId("");setNewRole("");
      await reload();
    }catch(e){ setMsg(e.message||"Erro ao enviar pedido."); }
    finally{ setSending(false); }
  }

  const currentSectorName = () => {
    const s=(sectors||[]).find(x=>x.id===profile.sector_id);
    return s?s.name:"—";
  };

  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",null,
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"⚙️ Meu Perfil"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},"Solicite mudanças ao Endministrator")
      )
    ),
    React.createElement("div",{style:{padding:14}},
      React.createElement("div",{style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:14,marginBottom:16}},
        React.createElement("div",{style:{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10}},"SEUS DADOS ATUAIS"),
        [{l:"Nome",v:profile.name},{l:"Setor",v:currentSectorName()},{l:"Role",v:ROLE_LABELS[profile.role]||profile.role}]
          .map((row,i)=>React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.06)":"none"}},
            React.createElement("span",{style:{fontSize:12,color:C.muted}},row.l),
            React.createElement("span",{style:{fontSize:12,color:C.text,fontWeight:600}},row.v)
          ))
      ),

      msg&&React.createElement("div",{style:{background:msg.includes("✓")?"rgba(29,209,161,0.12)":"rgba(255,107,107,0.12)",border:"1px solid "+(msg.includes("✓")?"rgba(29,209,161,0.3)":"rgba(255,107,107,0.3)"),borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:msg.includes("✓")?C.accent:C.danger}},msg),

      React.createElement("div",{style:{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}},"SOLICITAR MUDANÇA"),

      React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasPending("name")?0:8}},
          React.createElement("span",{style:{fontSize:13,fontWeight:600,color:C.text}},"Nome"),
          hasPending("name")&&React.createElement("span",{style:{fontSize:10,color:"#ffd166",fontWeight:700}},"⏳ Pendente")
        ),
        !hasPending("name")&&React.createElement(React.Fragment,null,
          React.createElement("input",{value:newName,onChange:e=>setNewName(e.target.value),placeholder:"Novo nome",style:{marginBottom:8}}),
          React.createElement("button",{onClick:()=>handleRequest("name",profile.name,newName),disabled:sending||!newName,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:8,padding:"7px 14px",fontWeight:700,fontSize:12,width:"100%"}},"Solicitar mudança de nome")
        )
      ),

      React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasPending("sector")?0:8}},
          React.createElement("span",{style:{fontSize:13,fontWeight:600,color:C.text}},"Setor"),
          hasPending("sector")&&React.createElement("span",{style:{fontSize:10,color:"#ffd166",fontWeight:700}},"⏳ Pendente")
        ),
        !hasPending("sector")&&React.createElement(React.Fragment,null,
          React.createElement("select",{value:newSectorId,onChange:e=>setNewSectorId(e.target.value),style:{marginBottom:8}},
            React.createElement("option",{value:""},"Selecione um setor..."),
            (sectors||[]).filter(s=>s.id!==profile.sector_id).map(s=>React.createElement("option",{key:s.id,value:s.id},(s.mascot?s.mascot+" ":"")+s.name))
          ),
          React.createElement("button",{onClick:()=>handleRequest("sector",profile.sector_id||"",newSectorId),disabled:sending||!newSectorId,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:8,padding:"7px 14px",fontWeight:700,fontSize:12,width:"100%"}},"Solicitar mudança de setor")
        )
      ),

      React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasPending("role")?0:8}},
          React.createElement("span",{style:{fontSize:13,fontWeight:600,color:C.text}},"Role"),
          hasPending("role")&&React.createElement("span",{style:{fontSize:10,color:"#ffd166",fontWeight:700}},"⏳ Pendente")
        ),
        !hasPending("role")&&React.createElement(React.Fragment,null,
          React.createElement("select",{value:newRole,onChange:e=>setNewRole(e.target.value),style:{marginBottom:8}},
            React.createElement("option",{value:""},"Selecione uma role..."),
            Object.entries(ROLE_LABELS).filter(([r])=>r!==profile.role).map(([r,l])=>React.createElement("option",{key:r,value:r},l))
          ),
          React.createElement("button",{onClick:()=>handleRequest("role",profile.role,newRole),disabled:sending||!newRole,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:8,padding:"7px 14px",fontWeight:700,fontSize:12,width:"100%"}},"Solicitar mudança de role")
        )
      ),

      loading&&React.createElement("div",{style:{textAlign:"center",padding:"10px 0",color:C.muted,fontSize:12}},"Verificando pedidos...")
    )
  );
}

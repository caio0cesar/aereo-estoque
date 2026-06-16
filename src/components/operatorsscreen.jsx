import React, { useState, useEffect } from "react";
import { C, Tag, Gap } from "./shared.jsx";
import { supabase } from "../services/supabase.jsx";

const ROLES = ["looker","operator","pro-operator"];
const ROLE_LABELS = {"looker":"Looker","operator":"Operator","pro-operator":"Pro-Operator","endministrator":"Endministrator"};

async function loadUsers() {
  const { data, error } = await supabase.from("profiles").select("*");
  if(error) throw error;
  return data||[];
}
async function loadSectors() {
  const { data } = await supabase.from("sectors").select("id,name");
  return data||[];
}
async function loadRequests() {
  const { data, error } = await supabase.from("change_requests").select("*").eq("status","pending").order("created_at");
  if(error) throw error;
  return data||[];
}
async function updateProfile(userId, updates) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if(error) throw error;
}
async function updateRequest(id, status) {
  const { error } = await supabase.from("change_requests").update({status}).eq("id", id);
  if(error) throw error;
}

export default function OperatorsScreen({onBack, sectors}){
  const [users,setUsers]=useState([]);
  const [allSectors,setAllSectors]=useState(sectors||[]);
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editingUser,setEditingUser]=useState(null);
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("users"); // "users" | "requests"

  async function reload(){
    setLoading(true);
    try{
      const [u,r,s]=await Promise.all([loadUsers(),loadRequests(),loadSectors()]);
      setUsers(u); setRequests(r); setAllSectors(s);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  useEffect(()=>{reload();},[]);

  async function handleSaveUser(){
    if(!editingUser) return;
    setSaving(true);
    try{
      await updateProfile(editingUser.id,{
        name:editingUser.name,
        role:editingUser.role,
        sector_id:editingUser.sector_id||null,
      });
      setEditingUser(null);
      await reload();
    }catch(e){alert("Erro: "+e.message);}
    finally{setSaving(false);}
  }

  async function handleApprove(req){
    setSaving(true);
    try{
      const updates = {};
      if(req.type==="name") updates.name=req.requested_value;
      if(req.type==="sector") updates.sector_id=req.requested_value;
      if(req.type==="role") updates.role=req.requested_value;
      await updateProfile(req.user_id, updates);
      await updateRequest(req.id, "approved");
      await reload();
    }catch(e){alert("Erro ao aprovar: "+e.message);}
    finally{setSaving(false);}
  }

  async function handleReject(req){
    setSaving(true);
    try{
      await updateRequest(req.id, "rejected");
      await reload();
    }catch(e){alert("Erro ao rejeitar: "+e.message);}
    finally{setSaving(false);}
  }

  const getSectorName = id => {
    const s=allSectors.find(x=>x.id===id);
    return s?s.name:"—";
  };

  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"👥 Operators"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},users.length+" usuário(s) · "+requests.length+" pedido(s) pendente(s)")
      )
    ),
    React.createElement("div",{style:{display:"flex",gap:0,borderBottom:"1px solid "+C.border}},
      ["users","requests"].map(t=>React.createElement("button",{key:t,onClick:()=>setTab(t),style:{flex:1,background:"none",border:"none",borderBottom:"2px solid "+(tab===t?C.accent:"transparent"),color:tab===t?C.accent:C.muted,padding:"10px 0",fontWeight:700,fontSize:13,cursor:"pointer"}},
        t==="users"?"Usuários":"Pedidos"+(requests.length>0?" ("+requests.length+")":"")
      ))
    ),
    loading?React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},"Carregando..."):
    tab==="users"?(
      React.createElement("div",{style:{padding:14}},
        users.map(u=>React.createElement("div",{key:u.id,style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:14,color:C.text}},u.name),
              React.createElement("div",{style:{fontSize:11,color:C.muted,marginTop:2}},getSectorName(u.sector_id))
            ),
            React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center"}},
              React.createElement(Tag,{color:u.role==="endministrator"?"#ffd166":u.role==="pro-operator"?"#a29bfe":u.role==="operator"?C.accent:C.dim},ROLE_LABELS[u.role]||u.role),
              React.createElement("button",{onClick:()=>setEditingUser({...u}),style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}},"✏️")
            )
          )
        ))
      )
    ):(
      React.createElement("div",{style:{padding:14}},
        requests.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
          React.createElement("div",{style:{fontSize:32,marginBottom:8}},"✅"),
          React.createElement("div",null,"Nenhum pedido pendente!")
        ),
        requests.map(req=>{
          const user=users.find(u=>u.id===req.user_id);
          const typeLabel=req.type==="name"?"Nome":req.type==="sector"?"Setor":"Role";
          const reqValue=req.type==="sector"?getSectorName(req.requested_value):(ROLE_LABELS[req.requested_value]||req.requested_value);
          const curValue=req.type==="sector"?getSectorName(req.current_value):(ROLE_LABELS[req.current_value]||req.current_value);
          return React.createElement("div",{key:req.id,style:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,211,102,0.25)",borderRadius:12,padding:12,marginBottom:8}},
            React.createElement("div",{style:{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}},user?user.name:"Usuário desconhecido"),
            React.createElement("div",{style:{fontSize:12,color:C.muted,marginBottom:8}},
              "Pedido de mudança de ",
              React.createElement("span",{style:{color:C.text,fontWeight:600}},typeLabel),": ",
              React.createElement("span",{style:{color:C.dim}},curValue),
              " → ",
              React.createElement("span",{style:{color:C.accent,fontWeight:700}},reqValue)
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
              React.createElement("button",{onClick:()=>handleApprove(req),disabled:saving,style:{background:"rgba(29,209,161,0.12)",border:"1px solid rgba(29,209,161,0.3)",color:C.accent,borderRadius:8,padding:"8px",fontWeight:700,fontSize:12}},"✓ Aprovar"),
              React.createElement("button",{onClick:()=>handleReject(req),disabled:saving,style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.3)",color:C.danger,borderRadius:8,padding:"8px",fontWeight:700,fontSize:12}},"✕ Rejeitar")
            )
          );
        })
      )
    ),
    editingUser&&React.createElement("div",{onClick:e=>{if(e.target===e.currentTarget)setEditingUser(null);},style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}},
      React.createElement("div",{className:"su",style:{background:C.modalBg,border:"1px solid "+C.border,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:420}},
        React.createElement("div",{style:{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 16px"}}),
        React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:16}},"✏️ Editar "+editingUser.name),
        React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:4}},"NOME"),
        React.createElement("input",{value:editingUser.name,onChange:e=>setEditingUser(u=>({...u,name:e.target.value})),style:{marginBottom:12}}),
        React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:4}},"SETOR"),
        React.createElement("select",{value:editingUser.sector_id||"",onChange:e=>setEditingUser(u=>({...u,sector_id:e.target.value||null})),style:{marginBottom:12}},
          React.createElement("option",{value:""},"Sem setor"),
          allSectors.map(s=>React.createElement("option",{key:s.id,value:s.id},s.name))
        ),
        React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:4}},"ROLE"),
        React.createElement("select",{value:editingUser.role,onChange:e=>setEditingUser(u=>({...u,role:e.target.value})),style:{marginBottom:16}},
          ROLES.map(r=>React.createElement("option",{key:r,value:r},ROLE_LABELS[r]))
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
          React.createElement("button",{onClick:()=>setEditingUser(null),style:{background:"rgba(255,255,255,0.08)",border:"1px solid "+C.border,color:C.muted,borderRadius:10,padding:12,fontWeight:600}},"Cancelar"),
          React.createElement("button",{onClick:handleSaveUser,disabled:saving,style:{background:C.accent,border:"none",color:"#071e26",borderRadius:10,padding:12,fontWeight:800}},saving?"Salvando...":"Salvar")
        )
      )
    )
  );
}

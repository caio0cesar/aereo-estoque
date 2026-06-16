import React, { useState, useEffect, useRef } from "react";
import { css, ConfirmModal, UndoToast } from "./components/shared.jsx";
import LoginScreen from "./components/loginscreen.jsx";
import { HomeScreen, SectorScreen, BayScreen } from "./components/navscreens.jsx";
import { ProductsScreen, ValidityScreen, SearchOverlay } from "./components/screens.jsx";
import OperatorsScreen from "./components/operatorsscreen.jsx";
import { supabase, signOut, getProfile, loadFromSupabase, db } from "./services/supabase.jsx";
import { genId, parsePrice, renumberFloors, toISO } from "./utils/dates.jsx";

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

async function persist(d){try{localStorage.setItem("aereo-v7",JSON.stringify(d));}catch(e){}}
async function loadPersisted(){try{const r=localStorage.getItem("aereo-v7");return r?JSON.parse(r):null;}catch(e){return null;}}

export default function App(){
  const [data,setData]=useState(null);
  const [screenStack,setScreenStack]=useState([{type:"home"}]);
  const [showSearch,setShowSearch]=useState(false);
  const [confirmState,setConfirmState]=useState(null);
  const [undoState,setUndoState]=useState(null);
  const undoTimerRef=useRef(null);
  const dataRef=useRef(null);
  const [session,setSession]=useState(undefined); // undefined = verificando sessão
  const [profile,setProfile]=useState(null);
  const [loadingData,setLoadingData]=useState(false);

  async function initData(){
    setLoadingData(true);
    try{ setData(await loadFromSupabase()); }
    catch(e){ console.warn("Supabase falhou, usando local:",e); setData(await loadPersisted()||INITIAL); }
    finally{ setLoadingData(false); }
  }

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession)=>{
      setSession(newSession);
    });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(session){ getProfile().then(setProfile).catch(()=>{}); initData(); } },[session]);
  useEffect(()=>{ if(data){ persist(data); dataRef.current=data; } },[data]);

  const screen=screenStack[screenStack.length-1];
  const nav=s=>setScreenStack(st=>[...st,s]);
  const back=()=>setScreenStack(st=>st.length>1?st.slice(0,-1):st);

  async function handleBackup(){
    try{
      const local=await loadPersisted();
      if(!local){alert("Nenhum dado local para backup.");return;}
      const blob=new Blob([JSON.stringify(local,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const today=new Date(); const dd=String(today.getDate()).padStart(2,"0"),mm=String(today.getMonth()+1).padStart(2,"0"),yyyy=today.getFullYear();
      a.href=url; a.download="backup_estoque_"+dd+"-"+mm+"-"+yyyy+".json"; a.click();
      URL.revokeObjectURL(url);
    }catch(e){alert("Erro no backup: "+e.message);}
  }

  function registerUndo(msg, dbDeleteFn){
    const snapshot=dataRef.current; if(!snapshot) return;
    if(undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState({msg,snapshot});
    undoTimerRef.current=setTimeout(()=>{
      setUndoState(null);
      if(dbDeleteFn) dbDeleteFn().catch(console.error);
    },5000);
  }
  function doUndo(){ if(undoState){ setData(undoState.snapshot); setUndoState(null); clearTimeout(undoTimerRef.current); } }
  function confirmDelete(msg,onConfirm){ setConfirmState({msg,onConfirm}); }

  function updateCorridor(updated){
    setData(d=>({...d,corridors:d.corridors.map(c=>c.id===updated.id?updated:c)}));
    syncBoxesOnly(updated).catch(console.error);
  }
  function updateCorridorStructure(updated){
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
  function deleteCorridor(id){ setData(d=>({...d,corridors:d.corridors.filter(c=>c.id!==id)})); db.deleteCorridor(id).catch(console.error); }
  function saveProduct(p){
    setData(d=>({...d,products:{...d.products,[p.sku]:p}}));
    db.upsertProduct({sku:p.sku,description:p.desc,familia:p.familia,fornecedor:p.fornecedor,um:p.um,preco:parsePrice(p.preco)||null,dta_inicio:p.dtaInicio||null,dta_fim:p.dtaFim||null,ean:p.ean||null,situacao:p.situacao||"NN"}).catch(console.error);
  }
  function deleteProduct(sku){ setData(d=>{const p={...d.products};delete p[sku];return{...d,products:p};}); db.deleteProduct(sku).catch(console.error); }
  function addSector(s){ setData(d=>({...d,sectors:[...(d.sectors||[]),s]})); db.upsertSector({id:s.id,name:s.name,mascot:s.mascot}).catch(console.error); }
  function editSector(s){ setData(d=>({...d,sectors:(d.sectors||[]).map(x=>x.id===s.id?s:x)})); db.upsertSector({id:s.id,name:s.name,mascot:s.mascot}).catch(console.error); }
  function deleteSector(id){ setData(d=>({...d,sectors:(d.sectors||[]).filter(s=>s.id!==id)})); db.deleteSector(id).catch(console.error); }

  async function syncBoxesOnly(cor){
    return Promise.all((cor.bays||[]).map(bay =>
      Promise.all((bay.floors||[]).map(floor =>
        Promise.all((floor.boxes||[]).map(box =>
          db.upsertBox({id:box.id,floor_id:floor.id,sku:box.sku,qty:box.qty,updated_by:box.updatedBy||null,date:toISO(box.date)||null,validade:toISO(box.validade)||null,stack_id:box.stackId||null,stack_order:box.stackOrder||0,slot_index:box.slotIndex!=null?box.slotIndex:null})
        ))
      ))
    ));
  }

  async function syncCorridor(cor){
    await db.upsertCorridor({id:cor.id,sector_id:cor.sectorId,number:cor.number});
    return Promise.all((cor.bays||[]).map(async bay=>{
      await db.upsertBay({id:bay.id,corridor_id:cor.id,number:bay.number,side:bay.side,label:bay.label});
      return Promise.all((bay.floors||[]).map(async floor=>{
        await db.upsertFloor({id:floor.id,bay_id:bay.id,number:floor.number});
        return Promise.all((floor.boxes||[]).map(box=>
          db.upsertBox({id:box.id,floor_id:floor.id,sku:box.sku,qty:box.qty,updated_by:box.updatedBy||null,date:toISO(box.date)||null,validade:toISO(box.validade)||null,stack_id:box.stackId||null,stack_order:box.stackOrder||0,slot_index:box.slotIndex!=null?box.slotIndex:null})
        ));
      }));
    }));
  }

  function handleNavigate({corridorId,bayId,boxId}){
    const cor=data.corridors.find(c=>c.id===corridorId);
    setScreenStack([{type:"home"},{type:"sector",sectorId:cor&&cor.sectorId},{type:"bay",corridorId,bayId,highlightBoxId:boxId}]);
  }

  if(session===undefined) return React.createElement("div",{style:{background:"#071e26",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#6aada0",fontSize:15,gap:12}},
    React.createElement("div",{style:{fontSize:32}},"📦"),
    React.createElement("div",null,"Verificando sessão...")
  );
  if(!session) return React.createElement(LoginScreen,{onLogin:()=>{}});
  if(loadingData||!data) return React.createElement("div",{style:{background:"#071e26",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#6aada0",fontSize:15,gap:12}},
    React.createElement("div",{style:{fontSize:32}},"📦"),
    React.createElement("div",null,"Carregando dados...")
  );

  const sharedProps={onConfirmDelete:confirmDelete,onRegisterUndo:registerUndo};
  const getMascot=id=>{const s=(data.sectors||[]).find(s=>s.id===id);return s?s.mascot:"📦";};
  const getAllCors=()=>data.corridors.map(c=>({...c,mascot:getMascot(c.sectorId)}));

  return React.createElement(React.Fragment,null,
    React.createElement("style",null,css),
    screen.type==="home"&&React.createElement(HomeScreen,{data,
      onSelectSector:id=>nav({type:"sector",sectorId:id}),
      onOpenProducts:()=>nav({type:"products"}),
      onOpenValidity:()=>nav({type:"validity"}),
      onOpenOperators:()=>nav({type:"operators"}),
      onAddSector:addSector,onEditSector:editSector,onDeleteSector:deleteSector,
      onBackup:handleBackup,
      profile,onLogout:async()=>{await signOut();setProfile(null);setData(null);setScreenStack([{type:"home"}]);},
      ...sharedProps
    }),
    screen.type==="sector"&&(()=>{
      const sector=(data.sectors||[]).find(s=>s.id===screen.sectorId);
      if(!sector) return React.createElement("div",{style:{padding:20,color:"#ff6b6b"}},"Setor não encontrado. ",React.createElement("button",{onClick:back,style:{color:"#1dd1a1",background:"none",border:"none"}},"Voltar"));
      return React.createElement(SectorScreen,{sector,corridors:data.corridors.filter(c=>c.sectorId===sector.id).map(c=>({...c,mascot:sector.mascot})),products:data.products,allCorridors:getAllCors(),onBack:back,onUpdateCorridor:updateCorridorStructure,onSyncBoxes:updateCorridor,onAddCorridor:addCorridor,onDeleteCorridor:deleteCorridor,profile,...sharedProps});
    })(),
    screen.type==="bay"&&(()=>{
      const cor=data.corridors.find(c=>c.id===screen.corridorId);
      if(!cor) return React.createElement("div",{style:{padding:20,color:"#ff6b6b"}},"Não encontrado. ",React.createElement("button",{onClick:back,style:{color:"#1dd1a1",background:"none",border:"none"}},"Voltar"));
      const bay={...cor,mascot:getMascot(cor.sectorId)}.bays.find(b=>b.id===screen.bayId);
      if(!bay) return React.createElement("div",{style:{padding:20,color:"#ff6b6b"}},"Bay não encontrado. ",React.createElement("button",{onClick:back,style:{color:"#1dd1a1",background:"none",border:"none"}},"Voltar"));
      return React.createElement(BayScreen,{bay,corridor:{...cor,mascot:getMascot(cor.sectorId)},products:data.products,corridors:getAllCors(),highlightBoxId:screen.highlightBoxId,onBack:back,profile,
        onUpdateBay:updated=>updateCorridor({...cor,bays:cor.bays.map(b=>b.id===updated.id?updated:b)}),
        onUpdateBayStructure:updated=>updateCorridorStructure({...cor,bays:cor.bays.map(b=>b.id===updated.id?updated:b)}),
        ...sharedProps});
    })(),
    screen.type==="operators"&&React.createElement(OperatorsScreen,{onBack:back,sectors:data.sectors}),React.createElement(ProductsScreen,{products:data.products,onBack:back,onSaveProduct:saveProduct,profile,onDeleteProduct:sku=>{
      setData(d=>{const p={...d.products};delete p[sku];return{...d,products:p};});
      registerUndo("Produto excluído", ()=>db.deleteProduct(sku));
    },...sharedProps}),
    screen.type==="validity"&&React.createElement(ValidityScreen,{data,onBack:back,onNavigate:handleNavigate}),
    showSearch&&React.createElement(SearchOverlay,{data,onClose:()=>setShowSearch(false),onNavigate:v=>{handleNavigate(v);setShowSearch(false);}}),
    confirmState&&React.createElement(ConfirmModal,{msg:confirmState.msg,onConfirm:()=>{confirmState.onConfirm();setConfirmState(null);},onCancel:()=>setConfirmState(null)}),
    undoState&&React.createElement(UndoToast,{msg:undoState.msg,onUndo:doUndo,onDismiss:()=>{setUndoState(null);clearTimeout(undoTimerRef.current);}})
  );
}

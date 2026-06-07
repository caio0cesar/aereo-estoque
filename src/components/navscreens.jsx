import React, { useState, useRef } from "react";
import { C, Tag, Modal, Lbl, NumInput, SaveBtn, ConfirmModal, DuckIcon } from "./shared.jsx";
import FloorRow from "./FloorRow.jsx";
import { BoxDetailModal, BoxEditModal } from "./boxmodal.jsx";
import { getAllExpiring } from "../utils/validity.jsx";
import { genId, todayFull, renumberFloors, findBySku } from "../utils/dates.jsx";
import { db } from "../services/supabase.jsx";

// --- Modais simples ---
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
    React.createElement("div",{style:{height:12}}),
    React.createElement(Lbl,null,"Ícone"),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}},
      emojis.map(e=>React.createElement("button",{key:e,onClick:()=>setMascot(e),style:{background:mascot===e?C.accentDim:"rgba(255,255,255,0.06)",border:"1px solid "+(mascot===e?"rgba(29,209,161,0.4)":C.border),borderRadius:8,padding:"6px 10px",fontSize:20}},e))
    ),
    React.createElement(SaveBtn,{onClick:()=>{if(!name.trim()){alert("Nome obrigatório!");return;}onSave({name:name.trim(),mascot});}})
  );
}

// --- BayScreen ---
export function BayScreen({bay,corridor,products,corridors,onBack,onUpdateBay,highlightBoxId,onConfirmDelete,onRegisterUndo}){
  const [modal,setModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const dragRef=useRef(null);
  const [draggingId,setDraggingId]=useState(null);
  const floors=[...bay.floors].sort((a,b)=>b.number-a.number);
  const totalBoxes=bay.floors.reduce((s,f)=>s+f.boxes.length,0);

  function updateBayFloors(newFloors){onUpdateBay({...bay,floors:renumberFloors(newFloors)});}

  function handleFloorUpdate(toFloorId,newToBoxes,fromFloorId,draggedBoxId){
    updateBayFloors(bay.floors.map(f=>{
      if(f.id===toFloorId) return{...f,boxes:newToBoxes};
      if(f.id===fromFloorId&&fromFloorId!==toFloorId) return{...f,boxes:f.boxes.filter(b=>b.id!==draggedBoxId)};
      return f;
    }));
  }

  function handleSave(form){
    const box=modal.type==="edit"?{...modal.box,...form}:{...form,id:genId()};
    updateBayFloors(bay.floors.map(f=>{
      if(modal.type==="add"&&f.id===modal.floorId) return{...f,boxes:[...f.boxes,box]};
      if(modal.type==="edit"&&f.id===modal.floorId) return{...f,boxes:f.boxes.map(b=>b.id===box.id?box:b)};
      return f;
    }));
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

// --- CorridorScreen ---
export function CorridorScreen({corridor,products,corridors,onBack,onUpdateCorridor,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
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

// --- SectorScreen ---
export function SectorScreen({sector,corridors,products,allCorridors,onBack,onUpdateCorridor,onAddCorridor,onDeleteCorridor,highlightCorridorId,highlightBayId,highlightBoxId,onConfirmDelete,onRegisterUndo}){
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

// --- HomeScreen ---
export function HomeScreen({data,onSelectSector,onOpenProducts,onOpenValidity,onOpenSearch,onAddSector,onEditSector,onDeleteSector,onConfirmDelete,onRegisterUndo,profile,onLogout}){
  const [sectorModal,setSectorModal]=useState(null);
  const expiringItems=getAllExpiring(data);
  const hasExpiring=expiringItems.length>0;
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh",position:"relative"}},
    React.createElement("div",{style:{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}},"📦"),
    React.createElement("div",{style:{padding:"22px 16px 14px",borderBottom:"1px solid "+C.border}},
      React.createElement("div",{style:{fontWeight:800,fontSize:22,marginBottom:4}},"📦 Estoque Aéreo"),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
        React.createElement("div",{style:{fontSize:12,color:C.muted}},profile?"Olá, "+(profile.name||"")+(profile.role==="admin"?" 👑":""):"Toque para explorar"),
        onLogout&&React.createElement("button",{onClick:onLogout,style:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:11}},"Sair")
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

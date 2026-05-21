import { useState, useEffect, useRef, useCallback } from "react";

const genId = () => Math.random().toString(36).slice(2,9);
const todayFull = () => { const d=new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const fmtDate = raw => { const d=raw.replace(/\D/g,"").slice(0,8); if(d.length<=2)return d; if(d.length<=4)return d.slice(0,2)+"/"+d.slice(2); return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4); };
const calcVenc = (fab,m) => { const p=fab.split("/"); if(p.length!==3)return""; const d=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(d))return""; d.setMonth(d.getMonth()+Number(m)); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const parsePrice = v => parseFloat(String(v).replace(",","."))||0;
const renumberFloors = floors => [...floors].sort((a,b)=>a.number-b.number).map((f,i)=>({...f,number:i+1}));

function getValidity(dateStr) {
  if(!dateStr||dateStr.length<10)return null;
  const p=dateStr.split("/"); if(p.length!==3||p[2].length<4)return null;
  const exp=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(exp))return null;
  const now=new Date(); now.setHours(0,0,0,0);
  const days=Math.floor((exp-now)/86400000);
  if(days>90)return{days,color:"#1dd1a1",label:"OK"};
  if(days>60)return{days,color:"#ffd166",label:"Atenção"};
  if(days>30)return{days,color:"#ff9f43",label:"Urgente"};
  return{days,color:"#ff6b6b",label:days<0?"Vencido":"Crítico"};
}
function getAllExpiring(data) {
  const res=[];
  (data.corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{
    if(!box.validade)return;
    const v=getValidity(box.validade);
    if(v&&v.days<=90)res.push({box,fl,bay,cor,v,product:(data.products||{})[box.sku]});
  }))));
  return res.sort((a,b)=>a.v.days-b.v.days);
}
function findBySku(sku,corridors) {
  const res=[];
  (corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{
    if(box.sku===sku)res.push({box,fl,bay,cor});
  }))));
  return res;
}
function groupByStack(boxes) {
  const stacks={};
  const standalone=[];
  boxes.forEach(b=>{ if(b.stackId){if(!stacks[b.stackId])stacks[b.stackId]=[];stacks[b.stackId].push(b);}else standalone.push([b]); });
  const stackGroups=Object.values(stacks).map(g=>[...g].sort((a,b_)=>(a.stackOrder||0)-(b_.stackOrder||0)));
  const result=[];
  const seen=new Set();
  boxes.forEach(b=>{
    if(!b.stackId){result.push([b]);seen.add(b.id);}
    else if(!seen.has(b.id)){const g=stacks[b.stackId];g.forEach(x=>seen.add(x.id));result.push([...g].sort((a,b_)=>(a.stackOrder||0)-(b_.stackOrder||0)));}
  });
  return result;
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
        {id:"f3a",number:3,boxes:[{id:"bx1",sku:"1026780",qty:8,updatedBy:"Caio",date:"05/05/2025",validade:"",stackId:null,stackOrder:0}]},
        {id:"f2a",number:2,boxes:[{id:"bx2",sku:"1024276",qty:10,updatedBy:"Caio",date:"11/05/2025",validade:"",stackId:null,stackOrder:0}]},
        {id:"f1a",number:1,boxes:[]}
      ]},
      {id:"c41b1d",number:1,side:"Direito",label:"Rolos e Pincéis",floors:[{id:"f2b",number:2,boxes:[]},{id:"f1b",number:1,boxes:[]}]},
      {id:"c41b2e",number:2,side:"Esquerdo",label:"Tintas Acrílica",floors:[{id:"f2c",number:2,boxes:[]},{id:"f1c",number:1,boxes:[]}]},
      {id:"c41b2d",number:2,side:"Direito",label:"Lixas",floors:[{id:"f1d",number:1,boxes:[]}]},
    ]},
    {id:"c44",sectorId:"sec2",number:44,bays:[
      {id:"c44b1e",number:1,side:"Esquerdo",label:"Bases e Registros",floors:[
        {id:"f3b",number:3,boxes:[]},
        {id:"f2d",number:2,boxes:[{id:"bx3",sku:"1024256",qty:20,updatedBy:"Caio",date:"11/03/2025",validade:"",stackId:null,stackOrder:0}]},
        {id:"f1e",number:1,boxes:[
          {id:"bx4",sku:"1024274",qty:6,updatedBy:"Caio",date:"22/03/2025",validade:"",stackId:null,stackOrder:0},
          {id:"bx5",sku:"1798178",qty:58,updatedBy:"Caio",date:"22/03/2025",validade:"",stackId:null,stackOrder:0}
        ]}
      ]},
      {id:"c44b1d",number:1,side:"Direito",label:"Canos e Tubos",floors:[{id:"f2e",number:2,boxes:[]},{id:"f1f",number:1,boxes:[]}]},
    ]},
    {id:"c42",sectorId:"sec3",number:42,bays:[{id:"c42b1e",number:1,side:"Esquerdo",label:"Chaves e Alicates",floors:[{id:"f1h",number:1,boxes:[]}]}]},
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
  ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
  .ch:active{background:rgba(255,255,255,0.10)!important;}
  @media(hover:hover){.ch:hover{background:rgba(255,255,255,0.08)!important;}}
  .floor-drop{border-color:#1dd1a1!important;background:rgba(29,209,161,0.07)!important;}
  .box-drop-target{outline:2px dashed #1dd1a1;outline-offset:2px;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .fin{animation:fadeIn .16s ease;}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .su{animation:slideUp .2s ease;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
  .blink{animation:blink 1.4s ease-in-out infinite;}
  @keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .toast{animation:toastIn .2s ease;}
`;

async function persist(d){try{localStorage.setItem("aereo-v6", JSON.stringify(d));}catch(_){}}
async function loadPersisted(){try{const r=localStorage.getItem("aereo-v6");return r?JSON.parse(r):null;}catch(_){return null;}}
function getViewMode(){try{return localStorage.getItem("aereo-view")||"horizontal";}catch{return"horizontal";}}
function setViewModeLS(v){try{localStorage.setItem("aereo-view",v);}catch{}}

function Lbl({children,req}){return <label style={{fontSize:12,color:C.muted,fontWeight:600,display:"block",marginBottom:4}}>{children}{req&&<span style={{color:C.accent}}> *</span>}</label>;}
function Gap({h=12}){return <div style={{height:h}}/>;}
function Row({children,gap=10}){const arr=Array.isArray(children)?children.filter(Boolean):[children];return <div style={{display:"grid",gridTemplateColumns:`repeat(${arr.length},1fr)`,gap}}>{children}</div>;}
function SaveBtn({onClick,label="💾 Salvar"}){return <button onClick={onClick} style={{background:C.accent,color:"#071e26",border:"none",borderRadius:10,padding:"12px",fontWeight:800,fontSize:14,width:"100%",marginTop:8}}>{label}</button>;}
function Tag({children,color=C.accent,bg=C.accentDim}){return <span style={{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;}
function NumInput({value,onChange,placeholder,readOnly,style={}}){return <input value={value} inputMode="numeric" onChange={e=>onChange(e.target.value.replace(/\D/g,""))} placeholder={placeholder} readOnly={readOnly} style={style}/>;}
function DateInput({value,onChange,placeholder="dd/mm/aaaa"}){return <input value={value} inputMode="numeric" onChange={e=>onChange(fmtDate(e.target.value))} placeholder={placeholder}/>;}
function DecimalInput({value,onChange,placeholder}){return <input value={value} inputMode="decimal" onChange={e=>onChange(e.target.value.replace(/[^0-9.,]/g,""))} placeholder={placeholder}/>;}

function Modal({onClose,title,children,wide}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
      <div className="su" style={{background:C.modalBg,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:wide?600:420,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontWeight:700,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:13}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({msg,onConfirm,onCancel}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
      <div className="su" style={{background:C.modalBg,border:"1px solid rgba(255,107,107,0.3)",borderRadius:16,padding:24,width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8,color:C.text}}>{msg}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Esta ação pode ser desfeita nos próximos 5 segundos.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onCancel} style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"11px",fontWeight:600,fontSize:14}}>Cancelar</button>
          <button onClick={onConfirm} style={{background:"rgba(255,107,107,0.15)",border:"1px solid rgba(255,107,107,0.3)",color:C.danger,borderRadius:10,padding:"11px",fontWeight:700,fontSize:14}}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

function UndoToast({msg,onUndo,onDismiss}){
  return(
    <div className="toast" style={{position:"fixed",bottom:24,right:16,left:16,maxWidth:380,margin:"0 auto",background:"#1a3a4a",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,zIndex:400,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
      <span style={{fontSize:16}}>🗑</span>
      <span style={{flex:1,fontSize:13,color:C.text}}>{msg}</span>
      <button onClick={onUndo} style={{background:C.accentDim,border:`1px solid rgba(29,209,161,0.3)`,color:C.accent,borderRadius:8,padding:"5px 12px",fontWeight:700,fontSize:12,flexShrink:0}}>Desfazer</button>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:C.dim,fontSize:16,padding:"0 2px",flexShrink:0}}>✕</button>
    </div>
  );
}

// ─── BOX CARD COMPACT (for stacked mode) ─────────────────────────────────────
function BoxCardCompact({box,mascot,product,isTop,onClick,onDragStart,onDragEnd,isDragging,isDropTarget,hoveredInStack,onMouseEnter,onMouseLeave,onTouchStart,onTouchEnd,stackIndex,totalInStack}){
  const vi=getValidity(box.validade);
  const rise=hoveredInStack?-18:0;
  return(
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={e=>{e.stopPropagation();onClick();}}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className={isDropTarget?"box-drop-target":""}
      style={{
        position:"relative",width:105,flexShrink:0,
        background:hoveredInStack?"rgba(20,70,90,0.98)":"rgba(10,50,68,0.92)",
        border:`1px solid ${vi&&vi.days<=90?vi.color+"88":"rgba(29,209,161,0.28)"}`,
        borderRadius:9,padding:"6px 8px 5px",cursor:"grab",overflow:"hidden",
        opacity:isDragging?0.2:1,
        transform:`translateY(${rise}px)`,
        transition:"transform 0.18s ease,opacity .15s,background .15s",
        zIndex:hoveredInStack?10:totalInStack-stackIndex,
        boxShadow:hoveredInStack?"0 6px 18px rgba(0,0,0,0.6)":"0 2px 6px rgba(0,0,0,0.4)",
      }}>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{fontSize:32,opacity:0.05,lineHeight:1,userSelect:"none"}}>{mascot}</div>
      </div>
      <div style={{position:"relative",fontWeight:800,fontSize:11,color:C.text,wordBreak:"break-all",lineHeight:1.2}}>{box.sku}</div>
      <div style={{position:"relative",borderTop:"1px dashed rgba(29,209,161,0.15)",margin:"4px 0"}}/>
      <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:7,color:C.dim}}>QTD.</div>
          <div style={{fontSize:14,fontWeight:800,color:C.accent,lineHeight:1}}>{box.qty}</div>
        </div>
        {vi&&<div style={{fontSize:7,color:vi.color,fontWeight:700,textAlign:"right"}}>●</div>}
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:vi?vi.color+"55":"rgba(29,209,161,0.2)",borderRadius:"0 0 9px 9px"}}/>
    </div>
  );
}

// ─── BOX CARD FULL (horizontal mode) ─────────────────────────────────────────
function BoxCard({box,mascot,product,onDragStart,onDragEnd,onClick,isDragging,isDropTarget,highlight}){
  const vi=getValidity(box.validade);
  const bdrColor=highlight?"#1dd1a1":vi&&vi.days<=90?vi.color+"88":"rgba(29,209,161,0.3)";
  return(
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`fin${isDropTarget?" box-drop-target":""}`}
      style={{position:"relative",width:115,flexShrink:0,background:highlight?"rgba(29,209,161,0.12)":"rgba(10,50,68,0.9)",
        border:`1px solid ${bdrColor}`,borderRadius:11,padding:"9px 9px 8px",cursor:"grab",overflow:"hidden",
        opacity:isDragging?0.25:1,transition:"opacity .15s",
        boxShadow:highlight?"0 0 14px rgba(29,209,161,0.35)":"0 2px 10px rgba(0,0,0,0.45)"}}>
      <div style={{position:"absolute",top:0,left:"25%",right:"25%",height:"2px",background:"rgba(29,209,161,0.5)",borderRadius:"0 0 4px 4px"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{fontSize:48,opacity:0.06,lineHeight:1,userSelect:"none"}}>{mascot}</div>
      </div>
      <div style={{position:"relative",fontWeight:800,fontSize:12,color:C.text,wordBreak:"break-all",marginBottom:3}}>{box.sku}</div>
      {(product?.fornecedor||product?.familia)&&
        <div style={{position:"relative",fontSize:9,color:C.muted,background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 5px",display:"inline-block",marginBottom:5,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {product.fornecedor||product.familia}
        </div>}
      <div style={{position:"relative",borderTop:"1px dashed rgba(29,209,161,0.18)",marginBottom:5}}/>
      <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:8,color:C.dim,marginBottom:1}}>QTD.</div>
          <div style={{fontSize:17,fontWeight:800,color:C.accent,lineHeight:1}}>{box.qty}</div>
        </div>
        <div style={{textAlign:"right"}}>
          {box.updatedBy&&<div style={{fontSize:8,color:C.dim}}>{box.updatedBy}</div>}
          {vi&&<div style={{fontSize:8,color:vi.color,fontWeight:700}}>Val:{box.validade.slice(0,5)}</div>}
        </div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:vi?vi.color+"66":"rgba(29,209,161,0.25)",borderRadius:"0 0 11px 11px"}}/>
    </div>
  );
}

// ─── STACKED FLOOR COLUMN ────────────────────────────────────────────────────
function StackGroup({group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,onDropOnBox,viewMode}){
  const [hoveredIdx,setHoveredIdx]=useState(-1);
  const isSingle=group.length===1;
  const OVERLAP=28;
  const containerH=isSingle?null:72+(group.length-1)*OVERLAP;
  return(
    <div style={{position:"relative",width:105,flexShrink:0,height:containerH||undefined,marginBottom:isSingle?0:4}}
      onDragOver={e=>{e.preventDefault();e.stopPropagation();}}
      onDrop={e=>{e.stopPropagation();if(dragRef.current&&group[0])onDropOnBox(group[0].id);}}>
      {group.map((box,i)=>{
        const isTop=i===group.length-1;
        const topOffset=isSingle?0:i*OVERLAP;
        return(
          <div key={box.id} style={isSingle?{}:{position:"absolute",top:topOffset,left:0,width:"100%",zIndex:group.length-i}}>
            <BoxCardCompact
              box={box} mascot={mascot} product={products[box.sku]}
              isTop={isTop} stackIndex={i} totalInStack={group.length}
              hoveredInStack={hoveredIdx===i}
              isDragging={draggingId===box.id}
              isDropTarget={false}
              onClick={()=>onClickBox(box)}
              onMouseEnter={()=>setHoveredIdx(i)}
              onMouseLeave={()=>setHoveredIdx(-1)}
              onTouchStart={()=>setHoveredIdx(i)}
              onTouchEnd={()=>setHoveredIdx(-1)}
              onDragStart={()=>{dragRef.current={box,fromStackId:box.stackId};setDraggingId(box.id);}}
              onDragEnd={()=>{dragRef.current=null;setDraggingId(null);}}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── BOX DETAIL MODAL ────────────────────────────────────────────────────────
function BoxDetailModal({box,product,floorNumber,bay,corridor,onEdit,onClose,allLocations}){
  const vi=getValidity(box.validade);
  const otherLocs=(allLocations||[]).filter(l=>l.box.id!==box.id);
  return(
    <Modal onClose={onClose} title={`📦 SKU ${box.sku}`}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{icon:"📦",label:"Quantidade",val:String(box.qty),color:null},{icon:"📍",label:"Local",val:`C${corridor.number} B${bay.number} A${floorNumber}`,color:null},{icon:"📅",label:"Validade",val:box.validade||"—",color:vi?.color}]
          .map((s,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${s.color||C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:9,color:C.muted,marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:11,fontWeight:700,color:s.color||C.text,wordBreak:"break-all"}}>{s.val}</div>
            </div>
          ))}
      </div>
      {vi&&vi.days<=90&&(
        <div style={{background:vi.color+"15",border:`1px solid ${vi.color}44`,borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>{vi.days<0?"💀":vi.days<=30?"🚨":vi.days<=60?"⚠️":"📅"}</span>
          <span style={{fontSize:12,color:vi.color,fontWeight:700}}>{vi.label}: {vi.days<0?`Vencido há ${Math.abs(vi.days)} dias`:`${vi.days} dias restantes`}</span>
        </div>
      )}
      {box.updatedBy&&<div style={{fontSize:11,color:C.dim,marginBottom:12,textAlign:"center"}}>Por {box.updatedBy} em {box.date}</div>}
      {otherLocs.length>0&&(
        <div style={{background:"rgba(255,211,102,0.08)",border:"1px solid rgba(255,211,102,0.3)",borderRadius:10,padding:"10px",marginBottom:12}}>
          <div style={{fontSize:11,color:"#ffd166",fontWeight:700,marginBottom:8}}>⚠️ Mesmo SKU em outros locais:</div>
          {otherLocs.map((l,i)=>(
            <div key={i} style={{fontSize:11,color:C.text,padding:"4px 0",borderTop:i>0?`1px solid rgba(255,255,255,0.06)`:"none"}}>
              📍 Corredor {l.cor.number} · Bay {l.bay.number} {l.bay.side.slice(0,3)}. · Andar {l.fl.number} · Qtd: <span style={{color:C.accent,fontWeight:700}}>{l.box.qty}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:14}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10,letterSpacing:"0.05em"}}>📋 DADOS DO PRODUTO</div>
        {product?(
          <div style={{display:"grid",gap:8}}>
            {[{l:"Descrição",v:product.desc},{l:"Família",v:product.familia},{l:"Fornecedor",v:product.fornecedor},{l:"Unidade",v:product.um},{l:"Preço",v:product.preco?`R$ ${parsePrice(product.preco).toFixed(2)}`:"—"},{l:"EAN",v:product.ean||"—"},{l:"Situação",v:product.situacao||"—"},{l:"Enfrentamento",v:product.dtaInicio&&product.dtaFim?`${product.dtaInicio} → ${product.dtaFim}`:"—"}]
              .map((row,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8}}>
                  <span style={{fontSize:11,color:C.muted,flexShrink:0}}>{row.l}</span>
                  <span style={{fontSize:11,color:C.text,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{row.v||"—"}</span>
                </div>
              ))}
          </div>
        ):(
          <div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{fontSize:22,marginBottom:6}}>📭</div>
            <div style={{fontSize:12,color:C.muted}}>Produto não cadastrado.</div>
          </div>
        )}
      </div>
      <button onClick={onEdit} style={{background:C.accentDim,border:`1px solid rgba(29,209,161,0.25)`,color:C.accent,borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,width:"100%"}}>✏️ Editar Caixa</button>
    </Modal>
  );
}

// ─── BOX EDIT MODAL ──────────────────────────────────────────────────────────
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
  return(
    <Modal onClose={onClose} title={isEdit?"✏️ Editar Caixa":"📦 Nova Caixa"}>
      {isEdit&&<button onClick={onDelete} style={{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:"8px",fontSize:12,width:"100%",marginBottom:14}}>🗑 Excluir esta caixa</button>}
      <Lbl req>SKU</Lbl>
      <NumInput value={form.sku} onChange={v=>set("sku",v)} placeholder="Somente números"/>
      {product&&<div style={{marginTop:6,fontSize:11,color:C.accent,background:C.accentDim,borderRadius:8,padding:"6px 10px"}}>✓ {product.desc||"Produto cadastrado"}</div>}
      {form.sku&&!product&&<div style={{marginTop:6,fontSize:11,color:C.dim,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}}>SKU não cadastrado.</div>}
      <Gap/>
      <Row>
        <div><Lbl req>Quantidade</Lbl><NumInput value={form.qty} onChange={v=>set("qty",v)} placeholder="0"/></div>
        <div><Lbl>Nome</Lbl><input value={form.updatedBy} onChange={e=>set("updatedBy",e.target.value)} placeholder=""/></div>
      </Row>
      <Gap/>
      <Lbl>Validade</Lbl>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {["direta","calcular"].map(m=>(
          <button key={m} onClick={()=>setValdMode(m)} style={{flex:1,background:valdMode===m?C.accentDim:"rgba(255,255,255,0.05)",border:`1px solid ${valdMode===m?"rgba(29,209,161,0.4)":C.border}`,color:valdMode===m?C.accent:C.muted,borderRadius:8,padding:"7px",fontSize:12,fontWeight:600}}>
            {m==="direta"?"📅 Data direta":"🔢 Calcular"}
          </button>
        ))}
      </div>
      {valdMode==="direta"&&<DateInput value={form.validade} onChange={v=>set("validade",v)}/>}
      {valdMode==="calcular"&&(
        <>
          <Row><div><Lbl>Data fabricação</Lbl><DateInput value={fabDate} onChange={setFabDate}/></div><div><Lbl>Meses validade</Lbl><NumInput value={meses} onChange={setMeses} placeholder="12"/></div></Row>
          {form.validade&&<div style={{marginTop:8,fontSize:12,color:C.accent,background:C.accentDim,borderRadius:8,padding:"7px 10px",textAlign:"center"}}>📅 Vencimento: {form.validade}</div>}
        </>
      )}
      <SaveBtn onClick={submit}/>
    </Modal>
  );
}

// ─── PRODUCT MODAL ───────────────────────────────────────────────────────────
function ProductModal({product,onSave,onClose,onDelete}){
  const isEdit=!!product;
  const [form,setForm]=useState(isEdit?{...product}:{sku:"",desc:"",familia:"",fornecedor:"",um:"UN",preco:"",dtaInicio:"",dtaFim:"",ean:"",situacao:"NN"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function submit(){if(!form.sku.trim()){alert("SKU é obrigatório!");return;}onSave(form);}
  return(
    <Modal onClose={onClose} title={isEdit?"✏️ Editar Produto":"➕ Cadastrar Produto"} wide>
      {isEdit&&<button onClick={onDelete} style={{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:"8px",fontSize:12,width:"100%",marginBottom:14}}>🗑 Excluir produto</button>}
      <Row>
        <div><Lbl req>SKU / Material</Lbl><NumInput value={form.sku} onChange={v=>set("sku",v)} placeholder="Somente números" readOnly={isEdit} style={isEdit?{opacity:0.6}:{}}/></div>
        <div><Lbl>Unidade (UM)</Lbl><select value={form.um} onChange={e=>set("um",e.target.value)}>{["UN","CX","KG","M","M²","L","PC","RL","BD","SC"].map(u=><option key={u} value={u}>{u}</option>)}</select></div>
      </Row>
      <Gap/>
      <Lbl>Descrição do Produto</Lbl>
      <input value={form.desc} onChange={e=>set("desc",e.target.value)} placeholder="Ex: Mang. Multi Uso 3/8x4.0 Transp..."/>
      <Gap/>
      <Row>
        <div><Lbl>Família / Setor</Lbl><input value={form.familia} onChange={e=>set("familia",e.target.value)} placeholder="Ex: Hidráulica"/></div>
        <div><Lbl>Fornecedor</Lbl><input value={form.fornecedor} onChange={e=>set("fornecedor",e.target.value)} placeholder="Ex: Krona"/></div>
      </Row>
      <Gap/>
      <Row>
        <div><Lbl>Preço (R$)</Lbl><DecimalInput value={form.preco} onChange={v=>set("preco",v)} placeholder="0,00"/></div>
        <div><Lbl>Situação</Lbl><input value="NN" readOnly style={{opacity:0.6,cursor:"default"}}/></div>
      </Row>
      <Gap/>
      <Row>
        <div><Lbl>Início Enfrentamento</Lbl><DateInput value={form.dtaInicio} onChange={v=>set("dtaInicio",v)}/></div>
        <div><Lbl>Fim Enfrentamento</Lbl><DateInput value={form.dtaFim} onChange={v=>set("dtaFim",v)}/></div>
      </Row>
      <Gap/>
      <Lbl>EAN / GTIN</Lbl>
      <NumInput value={form.ean} onChange={v=>set("ean",v)} placeholder="Somente números"/>
      <SaveBtn onClick={submit}/>
    </Modal>
  );
}

// ─── PRODUCTS SCREEN ─────────────────────────────────────────────────────────
function ProductsScreen({products,onBack,onSaveProduct,onDeleteProduct,onConfirmDelete}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=Object.values(products).filter(p=>!search||p.sku.includes(search)||p.desc?.toLowerCase().includes(search.toLowerCase())||p.fornecedor?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{background:C.bg,minHeight:"100vh"}}>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>🗂 Catálogo de Produtos</div><div style={{fontSize:11,color:C.muted}}>{Object.keys(products).length} produtos</div></div>
        <button onClick={()=>setModal({product:null})} style={{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,flexShrink:0}}>+ Novo</button>
      </div>
      <div style={{padding:"12px 14px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por SKU, descrição ou fornecedor..."/>
        <Gap/>
        {list.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:C.muted}}><div style={{fontSize:32,marginBottom:8}}>📭</div><div style={{fontSize:13}}>{search?"Nenhum produto encontrado.":"Nenhum produto cadastrado."}</div></div>}
        {list.map(p=>(
          <div key={p.sku} onClick={()=>setModal({product:p})} className="ch fin" style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:8,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}><Tag>{p.sku}</Tag>{p.um&&<Tag bg="rgba(255,255,255,0.06)" color={C.muted}>{p.um}</Tag>}</div>
            {p.desc&&<div style={{fontSize:12,color:C.text,marginBottom:4,lineHeight:1.4}}>{p.desc}</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.familia&&<span style={{fontSize:10,color:C.dim}}>{p.familia}</span>}
              {p.fornecedor&&<span style={{fontSize:10,color:C.dim}}>· {p.fornecedor}</span>}
              {p.preco&&<span style={{fontSize:10,color:C.dim}}>· R$ {parsePrice(p.preco).toFixed(2)}</span>}
            </div>
          </div>
        ))}
      </div>
      {modal&&<ProductModal product={modal.product}
        onSave={p=>{onSaveProduct(p);setModal(null);}}
        onClose={()=>setModal(null)}
        onDelete={()=>onConfirmDelete(`Excluir produto ${modal.product.sku}?`,()=>{onDeleteProduct(modal.product.sku);setModal(null);})}/>}
    </div>
  );
}

// ─── VALIDITY SCREEN ──────────────────────────────────────────────────────────
function ValidityScreen({data,onBack,onNavigate}){
  const items=getAllExpiring(data);
  return(
    <div style={{background:C.bg,minHeight:"100vh"}}>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>⏰ Alertas de Validade</div><div style={{fontSize:11,color:C.muted}}>{items.length} item(s) a vencer em 90 dias</div></div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {items.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.muted}}><div style={{fontSize:40,marginBottom:12}}>✅</div><div style={{fontSize:14}}>Nenhuma validade próxima do vencimento!</div></div>}
        {items.map((item,i)=>(
          <div key={i} className="ch fin" onClick={()=>onNavigate({corridorId:item.cor.id,bayId:item.bay.id,boxId:item.box.id})}
            style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${item.v.color}44`,borderRadius:12,padding:"12px",marginBottom:8,cursor:"pointer",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:item.v.color,borderRadius:"12px 0 0 12px"}}/>
            <div style={{paddingLeft:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <Tag>{item.box.sku}</Tag>
                <span style={{fontSize:11,color:item.v.color,fontWeight:700}}>{item.v.label} · {item.v.days<0?`Vencido há ${Math.abs(item.v.days)}d`:`${item.v.days} dias`}</span>
              </div>
              {item.product?.desc&&<div style={{fontSize:12,color:C.text,marginBottom:4}}>{item.product.desc}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontSize:10,color:C.dim}}>📍 Corredor {item.cor.number} · Bay {item.bay.number} · Andar {item.fl.number}</span>
                <span style={{fontSize:10,color:C.dim}}>Qtd: {item.box.qty}</span>
              </div>
              <div style={{fontSize:10,color:item.v.color}}>📅 {item.box.validade} → Ir para o local ›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SEARCH OVERLAY ───────────────────────────────────────────────────────────
function SearchOverlay({data,onClose,onNavigate}){
  const [query,setQuery]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{setTimeout(()=>inputRef.current?.focus(),100);},[]);
  const products=data.products||{};
  const allBoxSkus=[...new Set((data.corridors||[]).flatMap(c=>c.bays.flatMap(b=>b.floors.flatMap(f=>f.boxes.map(bx=>bx.sku)))))];
  const term=query.trim();
  const results=term.length>=2?(()=>{
    const matchedSkus=new Set();
    allBoxSkus.forEach(sku=>{if(sku.includes(term))matchedSkus.add(sku);});
    Object.values(products).forEach(p=>{if(p.desc?.toLowerCase().includes(term.toLowerCase())||p.familia?.toLowerCase().includes(term.toLowerCase()))matchedSkus.add(p.sku);});
    return[...matchedSkus].map(sku=>({sku,product:products[sku],locations:findBySku(sku,data.corridors)})).filter(r=>r.locations.length>0);
  })():[];
  const suggestions=term.length>=2&&term.length<7?allBoxSkus.filter(s=>s.startsWith(term)&&s!==term).slice(0,5):[];
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:300,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px",display:"flex",gap:10,alignItems:"center",borderBottom:`1px solid ${C.border}`,background:C.bg,flexShrink:0}}>
        <div style={{flex:1,position:"relative"}}>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="SKU ou nome do produto..." style={{paddingLeft:36}}/>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}}>🔍</span>
          {query&&<button onClick={()=>setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.dim,fontSize:16,lineHeight:1}}>✕</button>}
        </div>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"8px 14px",fontSize:13,flexShrink:0}}>Fechar</button>
      </div>
      {suggestions.length>0&&(
        <div style={{padding:"8px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",gap:6,flexWrap:"wrap"}}>
          {suggestions.map(s=>(
            <button key={s} onClick={()=>setQuery(s)} style={{background:C.accentDim,border:`1px solid rgba(29,209,161,0.2)`,color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600}}>{s}</button>
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {term.length>=2&&results.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.muted}}><div style={{fontSize:28,marginBottom:8}}>🔍</div><div>Nenhum resultado para "{term}"</div></div>}
        {term.length<2&&<div style={{textAlign:"center",padding:"40px 0",color:C.dim}}><div style={{fontSize:28,marginBottom:8}}>💡</div><div style={{fontSize:13}}>Digite o SKU ou nome do produto</div></div>}
        {results.map((r,i)=>(
          <div key={i} className="fin" style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <Tag>{r.sku}</Tag>
              <Tag bg="rgba(255,255,255,0.06)" color={C.dim}>{r.locations.length} local(is)</Tag>
            </div>
            {r.product?.desc&&<div style={{fontSize:12,color:C.text,marginBottom:4}}>{r.product.desc}</div>}
            {(r.product?.fornecedor||r.product?.familia)&&<div style={{fontSize:11,color:C.muted,marginBottom:8}}>{r.product.familia}{r.product.fornecedor&&` · ${r.product.fornecedor}`}</div>}
            {r.locations.map((l,j)=>(
              <button key={j} onClick={()=>{onNavigate({corridorId:l.cor.id,bayId:l.bay.id,boxId:l.box.id});onClose();}} className="ch"
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"rgba(29,209,161,0.06)",border:"1px solid rgba(29,209,161,0.15)",borderRadius:8,padding:"8px 10px",marginBottom:4,textAlign:"left"}}>
                <div>
                  <div style={{fontSize:11,color:C.text,fontWeight:600}}>📍 Corredor {l.cor.number} · Bay {l.bay.number} ({l.bay.side.slice(0,3)}.) · Andar {l.fl.number}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>Qtd: {l.box.qty}{l.box.updatedBy&&` · ${l.box.updatedBy} · ${l.box.date}`}{l.box.validade&&` · Val: ${l.box.validade.slice(0,5)}`}</div>
                </div>
                <span style={{color:C.accent,fontSize:18,marginLeft:8}}>›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BAY SCREEN ──────────────────────────────────────────────────────────────
function BayScreen({bay,corridor,products,corridors,onBack,onUpdateBay,highlightBoxId,viewMode,onChangeViewMode,onConfirmDelete,onRegisterUndo}){
  const [modal,setModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const dragRef=useRef(null);
  const [dragOverFloor,setDragOverFloor]=useState(null);
  const [dragOverBoxId,setDragOverBoxId]=useState(null);
  const [draggingId,setDraggingId]=useState(null);
  const highlightRef=useRef(null);
  const floors=[...bay.floors].sort((a,b)=>b.number-a.number);
  const totalBoxes=bay.floors.reduce((s,f)=>s+f.boxes.length,0);
  useEffect(()=>{if(highlightBoxId&&highlightRef.current)setTimeout(()=>highlightRef.current?.scrollIntoView({behavior:"smooth",block:"center"}),300);},[]);

  function updateFloors(f){onUpdateBay({...bay,floors:renumberFloors(f)});}

  function handleSave(form){
    const box=modal.type==="edit"?{...modal.box,...form}:{...form,id:genId()};
    updateFloors(bay.floors.map(f=>{
      if(modal.type==="add"&&f.id===modal.floorId)return{...f,boxes:[...f.boxes,box]};
      if(modal.type==="edit"&&f.id===modal.floorId)return{...f,boxes:f.boxes.map(b=>b.id===box.id?box:b)};
      return f;
    }));
    setModal(null);setDetailModal(null);
  }

  function doDeleteBox(){
    onRegisterUndo("Caixa excluída");
    updateFloors(bay.floors.map(f=>f.id===modal.floorId?{...f,boxes:f.boxes.filter(b=>b.id!==modal.box.id)}:f));
    setModal(null);setDetailModal(null);
  }

  function handleDropOnFloor(toFloorId){
    const dr=dragRef.current;
    if(!dr)return;
    dragRef.current=null;setDragOverFloor(null);setDragOverBoxId(null);setDraggingId(null);
    // Drop on floor background → standalone, remove from stack
    const box={...dr.box,stackId:null,stackOrder:0};
    if(dr.fromFloorId===toFloorId){
      updateFloors(bay.floors.map(f=>f.id===toFloorId?{...f,boxes:f.boxes.map(b=>b.id===box.id?box:b)}:f));
    } else {
      updateFloors(bay.floors.map(f=>{
        if(f.id===dr.fromFloorId)return{...f,boxes:f.boxes.filter(b=>b.id!==dr.box.id)};
        if(f.id===toFloorId)return{...f,boxes:[...f.boxes,box]};
        return f;
      }));
    }
  }

  function handleDropOnBox(targetBoxId,floorId){
    const dr=dragRef.current;
    if(!dr||dr.box.id===targetBoxId)return;
    dragRef.current=null;setDragOverFloor(null);setDragOverBoxId(null);setDraggingId(null);
    const allFloorBoxes=bay.floors.find(f=>f.id===floorId)?.boxes||[];
    const targetBox=allFloorBoxes.find(b=>b.id===targetBoxId);
    if(!targetBox)return;
    const existingStack=targetBox.stackId?allFloorBoxes.filter(b=>b.stackId===targetBox.stackId):[];
    if(existingStack.length>=10){alert("Máximo de 10 caixas por pilha!");return;}
    const stackId=targetBox.stackId||genId();
    const maxOrder=existingStack.reduce((m,b)=>Math.max(m,b.stackOrder||0),0);
    updateFloors(bay.floors.map(f=>{
      if(f.id===floorId){
        let boxes=f.boxes.filter(b=>b.id!==dr.box.id);
        if(!targetBox.stackId) boxes=boxes.map(b=>b.id===targetBoxId?{...b,stackId,stackOrder:0}:b);
        const newBox={...dr.box,stackId,stackOrder:maxOrder+1};
        if(dr.fromFloorId!==floorId){boxes=[...boxes,newBox];}
        else{boxes=[...boxes,newBox];}
        return{...f,boxes};
      }
      if(f.id===dr.fromFloorId&&dr.fromFloorId!==floorId)return{...f,boxes:f.boxes.filter(b=>b.id!==dr.box.id)};
      return f;
    }));
  }

  return(
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:100,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>{corridor.mascot||"📦"}</div>
      <div style={{padding:"14px 14px 10px",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{corridor.mascot||""} Aéreo — Bay {bay.number}</div>
          <div style={{fontSize:10,color:C.muted}}>{bay.side} · {bay.label} · C{corridor.number}</div>
        </div>
        <Tag>{floors.length} and.</Tag>
        <Tag>{totalBoxes} cx.</Tag>
        {/* View mode toggle */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:8,padding:2,gap:2}}>
          {[{k:"horizontal",icon:"⇔"},{k:"stacked",icon:"⇕"}].map(({k,icon})=>(
            <button key={k} onClick={()=>{setViewModeLS(k);onChangeViewMode(k);}}
              style={{background:viewMode===k?C.accentDim:"none",border:`1px solid ${viewMode===k?"rgba(29,209,161,0.3)":"transparent"}`,color:viewMode===k?C.accent:C.dim,borderRadius:6,padding:"4px 8px",fontSize:14,fontWeight:700,transition:"all .15s"}}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 12px 80px"}}>
        {floors.map(floor=>(
          <div key={floor.id}
            className={dragOverFloor===floor.id&&!dragOverBoxId?"floor-drop":""}
            onDragOver={e=>{e.preventDefault();if(!dragOverBoxId)setDragOverFloor(floor.id);}}
            onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverFloor(null);}}
            onDrop={e=>{e.preventDefault();if(!dragOverBoxId)handleDropOnFloor(floor.id);}}
            style={{background:"rgba(0,0,0,0.25)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 10px 12px",marginBottom:10,transition:"border-color .15s,background .15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}}>ANDAR {floor.number}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setModal({type:"add",floorId:floor.id})} style={{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:7,padding:"2px 11px",fontSize:19,lineHeight:"1.2"}}>+</button>
                <button onClick={()=>{if(floor.boxes.length>0){alert("Remova as caixas antes.");return;}onRegisterUndo("Andar excluído");updateFloors(bay.floors.filter(f=>f.id!==floor.id));}}
                  style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:7,padding:"2px 8px",fontSize:12}}>✕</button>
              </div>
            </div>

            {viewMode==="stacked"?(
              <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-start",minHeight:60}}>
                {floor.boxes.length===0&&<span style={{fontSize:11,color:C.dim,alignSelf:"center"}}>Vazio</span>}
                {groupByStack(floor.boxes).map((group,gi)=>(
                  <div key={gi}
                    onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOverBoxId(group[0]?.id);setDragOverFloor(null);}}
                    onDragLeave={()=>setDragOverBoxId(null)}
                    onDrop={e=>{e.preventDefault();e.stopPropagation();handleDropOnBox(group[0]?.id,floor.id);setDragOverBoxId(null);}}>
                    <StackGroup group={group} mascot={corridor.mascot||"📦"} products={products}
                      onClickBox={box=>setDetailModal({box,floorId:floor.id,floorNumber:floor.number})}
                      dragRef={dragRef} draggingId={draggingId} setDraggingId={setDraggingId}
                      onDropOnBox={targetId=>handleDropOnBox(targetId,floor.id)}
                      viewMode={viewMode}/>
                  </div>
                ))}
              </div>
            ):(
              <div style={{display:"flex",overflowX:"auto",gap:8,paddingBottom:4,minHeight:60}}>
                {floor.boxes.length===0&&<span style={{fontSize:11,color:C.dim,alignSelf:"center"}}>Vazio — toque em + para adicionar</span>}
                {floor.boxes.map(box=>{
                  const isHL=box.id===highlightBoxId;
                  return(
                    <div key={box.id} ref={isHL?highlightRef:null}
                      onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOverBoxId(box.id);}}
                      onDragLeave={()=>setDragOverBoxId(null)}
                      onDrop={e=>{e.preventDefault();e.stopPropagation();handleDropOnBox(box.id,floor.id);setDragOverBoxId(null);}}>
                      <BoxCard box={box} mascot={corridor.mascot||"📦"} product={products[box.sku]}
                        highlight={isHL} isDragging={draggingId===box.id}
                        isDropTarget={dragOverBoxId===box.id}
                        onDragStart={()=>{dragRef.current={box,fromFloorId:floor.id};setDraggingId(box.id);}}
                        onDragEnd={()=>{dragRef.current=null;setDraggingId(null);setDragOverFloor(null);setDragOverBoxId(null);}}
                        onClick={()=>setDetailModal({box,floorId:floor.id,floorNumber:floor.number})}/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <button onClick={()=>{const nf=renumberFloors([...bay.floors,{id:genId(),number:999,boxes:[]}]);onUpdateBay({...bay,floors:nf});}}
          style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:12,padding:"11px",width:"100%",fontSize:13,marginTop:4}}>
          + Adicionar Andar
        </button>
      </div>

      {detailModal&&!modal&&(
        <BoxDetailModal box={detailModal.box} product={products[detailModal.box.sku]}
          floorNumber={detailModal.floorNumber} bay={bay} corridor={corridor}
          allLocations={findBySku(detailModal.box.sku,corridors)}
          onEdit={()=>setModal({type:"edit",floorId:detailModal.floorId,box:detailModal.box})}
          onClose={()=>setDetailModal(null)}/>
      )}
      {modal&&<BoxEditModal modal={modal} products={products} onSave={handleSave} onClose={()=>setModal(null)}
        onDelete={()=>onConfirmDelete("Excluir esta caixa?",doDeleteBox)}/>}
    </div>
  );
}

// ─── CORRIDOR SCREEN ──────────────────────────────────────────────────────────
function CorridorScreen({corridor,products,corridors,onBack,onUpdateCorridor,highlightBayId,highlightBoxId,viewMode,onChangeViewMode,onConfirmDelete,onRegisterUndo}){
  const [selectedBay,setSelectedBay]=useState(highlightBayId||null);
  const [bayModal,setBayModal]=useState(null);
  if(selectedBay){
    const bay=corridor.bays.find(b=>b.id===selectedBay);
    if(!bay){setSelectedBay(null);return null;}
    return<BayScreen bay={bay} corridor={corridor} products={products} corridors={corridors}
      highlightBoxId={highlightBoxId} viewMode={viewMode}
      onBack={()=>setSelectedBay(null)}
      onUpdateBay={updated=>onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===updated.id?updated:b)})}
      onChangeViewMode={onChangeViewMode}
      onConfirmDelete={onConfirmDelete} onRegisterUndo={onRegisterUndo}/>;
  }
  function getNextNum(side){const nums=corridor.bays.filter(b=>b.side===side).map(b=>b.number);return nums.length===0?1:Math.max(...nums)+1;}
  function handleBaySave(label){
    if(bayModal.bay)onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===bayModal.bay.id?{...b,label}:b)});
    else onUpdateCorridor({...corridor,bays:[...corridor.bays,{id:genId(),number:getNextNum(bayModal.side),side:bayModal.side,label,floors:[{id:genId(),number:1,boxes:[]}]}]});
    setBayModal(null);
  }
  const leftBays=corridor.bays.filter(b=>b.side==="Esquerdo").sort((a,b)=>a.number-b.number);
  const rightBays=corridor.bays.filter(b=>b.side==="Direito").sort((a,b)=>a.number-b.number);
  const BayCard=({bay})=>{
    const total=bay.floors.reduce((s,f)=>s+f.boxes.length,0);
    return(
      <div className="fin" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}}>{corridor.mascot||"📦"}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
          <Tag>Bay {bay.number}</Tag>
          <div style={{display:"flex",gap:4}}>
            <button onClick={e=>{e.stopPropagation();setBayModal({side:bay.side,bay});}} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}}>✏️</button>
            <button onClick={e=>{e.stopPropagation();onConfirmDelete(`Excluir Bay ${bay.number} — ${bay.label}?`,()=>{
              if(bay.floors.reduce((s,f)=>s+f.boxes.length,0)>0){alert("Remova todas as caixas antes.");return;}
              onRegisterUndo(`Bay ${bay.number} excluído`);
              onUpdateCorridor({...corridor,bays:corridor.bays.filter(b=>b.id!==bay.id)});
            });}} style={{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}}>🗑</button>
          </div>
        </div>
        <div onClick={()=>setSelectedBay(bay.id)} className="ch" style={{padding:"10px 10px 12px",cursor:"pointer"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:C.text}}>{bay.label}</div>
          <Tag>{total} cx · {bay.floors.length} and. ›</Tag>
        </div>
      </div>
    );
  };
  return(
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>{corridor.mascot||"📦"}</div>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div><div style={{fontWeight:700,fontSize:17}}>{corridor.mascot||""} Corredor {corridor.number}</div></div>
      </div>
      <div style={{padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <span style={{fontSize:10,color:C.accent,fontWeight:700}}>◉ ESQUERDO</span>
          <span style={{fontSize:10,color:C.accent,fontWeight:700,textAlign:"right"}}>DIREITO ◉</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div>{leftBays.map(b=><BayCard key={b.id} bay={b}/>)}<button onClick={()=>setBayModal({side:"Esquerdo",bay:null})} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"9px",width:"100%",fontSize:12,marginBottom:8}}>+ Bay Esq.</button></div>
          <div>{rightBays.map(b=><BayCard key={b.id} bay={b}/>)}<button onClick={()=>setBayModal({side:"Direito",bay:null})} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"9px",width:"100%",fontSize:12,marginBottom:8}}>+ Bay Dir.</button></div>
        </div>
      </div>
      {bayModal&&<BayModal bay={bayModal.bay} side={bayModal.side} onSave={handleBaySave} onClose={()=>setBayModal(null)}/>}
    </div>
  );
}

function BayModal({bay,side,onSave,onClose}){
  const [label,setLabel]=useState(bay?.label||"");
  return(<Modal onClose={onClose} title={`${bay?"✏️ Editar":"➕ Novo"} Bay — ${side}`}><Lbl req>Nome / Rótulo</Lbl><input value={label} onChange={e=>setLabel(e.target.value)} autoFocus/><SaveBtn onClick={()=>{if(!label.trim()){alert("Nome obrigatório!");return;}onSave(label.trim());}}/></Modal>);
}
function CorridorModal({corridor,onSave,onClose}){
  const [number,setNumber]=useState(corridor?.number||"");
  return(<Modal onClose={onClose} title={corridor?"✏️ Editar Corredor":"➕ Novo Corredor"}><Lbl req>Número do Corredor</Lbl><NumInput value={String(number)} onChange={v=>setNumber(v)} placeholder="Ex: 41"/><SaveBtn onClick={()=>{if(!number){alert("Número obrigatório!");return;}onSave(Number(number));}}/></Modal>);
}
function SectorModal({sector,onSave,onClose}){
  const [name,setName]=useState(sector?.name||"");
  const [mascot,setMascot]=useState(sector?.mascot||"📦");
  const emojis=["📦","🎨","🦆","🔧","⚡","🏠","🔩","💡","🪣","🧱","🪟","🔌","🛁","🚿","🪛","🔨","🪚","🧰","🏗️","🪴","🎯","🛠️","🧲","🪝"];
  return(
    <Modal onClose={onClose} title={sector?"✏️ Editar Setor":"➕ Novo Setor"}>
      <Lbl req>Nome do Setor</Lbl>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Hidráulica" autoFocus/>
      <Gap/>
      <Lbl>Ícone</Lbl>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
        {emojis.map(e=>(<button key={e} onClick={()=>setMascot(e)} style={{background:mascot===e?C.accentDim:"rgba(255,255,255,0.06)",border:`1px solid ${mascot===e?"rgba(29,209,161,0.4)":C.border}`,borderRadius:8,padding:"6px 10px",fontSize:20}}>{e}</button>))}
      </div>
      <SaveBtn onClick={()=>{if(!name.trim()){alert("Nome obrigatório!");return;}onSave({name:name.trim(),mascot});}}/>
    </Modal>
  );
}

// ─── SECTOR SCREEN ────────────────────────────────────────────────────────────
function SectorScreen({sector,corridors,products,allCorridors,allSectors,onBack,onUpdateCorridor,onAddCorridor,onDeleteCorridor,highlightCorridorId,highlightBayId,highlightBoxId,viewMode,onChangeViewMode,onConfirmDelete,onRegisterUndo}){
  const [selectedCorridorId,setSelectedCorridorId]=useState(highlightCorridorId||null);
  const [corridorModal,setCorridorModal]=useState(null);
  if(selectedCorridorId){
    const cor=corridors.find(c=>c.id===selectedCorridorId);
    if(!cor){setSelectedCorridorId(null);return null;}
    return<CorridorScreen corridor={cor} products={products} corridors={allCorridors} onBack={()=>setSelectedCorridorId(null)}
      highlightBayId={highlightBayId} highlightBoxId={highlightBoxId} viewMode={viewMode}
      onChangeViewMode={onChangeViewMode}
      onUpdateCorridor={onUpdateCorridor} onConfirmDelete={onConfirmDelete} onRegisterUndo={onRegisterUndo}/>;
  }
  function handleCorridorSave(number){
    if(corridorModal.corridor)onUpdateCorridor({...corridorModal.corridor,number,mascot:sector.mascot});
    else onAddCorridor({id:genId(),sectorId:sector.id,number,mascot:sector.mascot,bays:[]});
    setCorridorModal(null);
  }
  return(
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>{sector.mascot}</div>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:17}}>{sector.mascot} {sector.name}</div><div style={{fontSize:11,color:C.muted}}>{corridors.length} corredor(es)</div></div>
        <button onClick={()=>setCorridorModal({corridor:null})} style={{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12}}>+ Corredor</button>
      </div>
      <div style={{padding:14}}>
        {corridors.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.muted}}><div style={{fontSize:40,marginBottom:12}}>{sector.mascot}</div><div style={{fontSize:13}}>Nenhum corredor.<br/>Toque em + Corredor.</div></div>}
        {[...corridors].sort((a,b)=>a.number-b.number).map(cor=>{
          const totalBoxes=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
          return(
            <div key={cor.id} className="fin" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}}>{sector.mascot}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
                <Tag>Corredor {cor.number}</Tag>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={e=>{e.stopPropagation();setCorridorModal({corridor:cor});}} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11}}>✏️</button>
                  <button onClick={e=>{e.stopPropagation();onConfirmDelete(`Excluir Corredor ${cor.number}?`,()=>{
                    const total=cor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
                    if(total>0){alert("Remova todas as caixas antes.");return;}
                    onRegisterUndo(`Corredor ${cor.number} excluído`);
                    onDeleteCorridor(cor.id);
                  });}} style={{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11}}>🗑</button>
                </div>
              </div>
              <div onClick={()=>setSelectedCorridorId(cor.id)} className="ch" style={{padding:"10px 10px 12px",cursor:"pointer"}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:C.text}}>Corredor {cor.number}</div>
                <Tag>{cor.bays.length} bays · {totalBoxes} caixas ›</Tag>
              </div>
            </div>
          );
        })}
      </div>
      {corridorModal&&<CorridorModal corridor={corridorModal.corridor} onSave={handleCorridorSave} onClose={()=>setCorridorModal(null)}/>}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({data,onSelectSector,onOpenProducts,onOpenValidity,onOpenSearch,onAddSector,onEditSector,onDeleteSector,onConfirmDelete,onRegisterUndo}){
  const [sectorModal,setSectorModal]=useState(null);
  const expiringItems=getAllExpiring(data);
  const hasExpiring=expiringItems.length>0;
  return(
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>📦</div>
      <div style={{padding:"22px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontWeight:800,fontSize:22,marginBottom:2}}>📦 Estoque Aéreo</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Toque para explorar</div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button onClick={onOpenProducts} style={{flex:1,background:C.accentDim,border:`1px solid rgba(29,209,161,0.25)`,color:C.accent,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}}>🗂 Produtos</button>
          <button onClick={onOpenValidity} className={hasExpiring?"blink":""}
            style={{flex:1,background:hasExpiring?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.06)",border:`1px solid ${hasExpiring?"rgba(255,107,107,0.3)":C.border}`,color:hasExpiring?C.danger:C.muted,borderRadius:10,padding:"10px 8px",fontWeight:700,fontSize:12}}>
            {hasExpiring?"⚠️ ":"⏰ "}Validades{hasExpiring?` (${expiringItems.length})`:""}
          </button>
        </div>
        <button onClick={onOpenSearch} style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.dim,fontSize:14,width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:8}}>
          <span>🔍</span> Buscar por SKU ou nome...
        </button>
      </div>
      <div style={{padding:"16px 16px 60px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}}>SETORES</div>
          <button onClick={()=>setSectorModal({sector:null})} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"4px 10px",fontSize:11}}>+ Setor</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {(data.sectors||[]).map(sector=>{
            const secCorridors=(data.corridors||[]).filter(c=>c.sectorId===sector.id);
            const totalBoxes=secCorridors.reduce((s,c)=>s+c.bays.reduce((s2,b)=>s2+b.floors.reduce((s3,f)=>s3+f.boxes.length,0),0),0);
            return(
              <div key={sector.id} className="fin" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",position:"relative"}}>
                <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 8px 0",gap:4,position:"relative",zIndex:1}}>
                  <button onClick={e=>{e.stopPropagation();setSectorModal({sector});}} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"2px 6px",fontSize:10}}>✏️</button>
                  <button onClick={e=>{e.stopPropagation();onConfirmDelete(`Excluir setor "${sector.name}"?`,()=>{
                    if((data.corridors||[]).some(c=>c.sectorId===sector.id)){alert("Remova todos os corredores deste setor antes.");return;}
                    onRegisterUndo(`Setor "${sector.name}" excluído`);
                    onDeleteSector(sector.id);
                  });}} style={{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"2px 6px",fontSize:10}}>🗑</button>
                </div>
                <div onClick={()=>onSelectSector(sector.id)} className="ch" style={{padding:"4px 14px 16px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:40,marginBottom:8,lineHeight:1}}>{sector.mascot}</div>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:C.text,lineHeight:1.3}}>{sector.name}</div>
                  <div style={{fontSize:10,color:C.dim}}>{secCorridors.length} corr. · {totalBoxes} cx.</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {sectorModal&&(
        <SectorModal sector={sectorModal.sector}
          onSave={({name,mascot})=>{
            if(sectorModal.sector)onEditSector({...sectorModal.sector,name,mascot});
            else onAddSector({id:genId(),name,mascot});
            setSectorModal(null);
          }}
          onClose={()=>setSectorModal(null)}/>
      )}
    </div>
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
  const [viewMode,setViewMode]=useState(getViewMode);

  useEffect(()=>{loadPersisted().then(saved=>setData(saved||INITIAL));},[]);
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

  function updateCorridor(updated){setData(d=>({...d,corridors:d.corridors.map(c=>c.id===updated.id?updated:c)}));}
  function addCorridor(cor){setData(d=>({...d,corridors:[...d.corridors,cor]}));}
  function deleteCorridor(id){setData(d=>({...d,corridors:d.corridors.filter(c=>c.id!==id)}));}
  function saveProduct(p){setData(d=>({...d,products:{...d.products,[p.sku]:p}}));}
  function deleteProduct(sku){setData(d=>{const p={...d.products};delete p[sku];return{...d,products:p};});}
  function addSector(s){setData(d=>({...d,sectors:[...(d.sectors||[]),s]}));}
  function editSector(s){setData(d=>({...d,sectors:(d.sectors||[]).map(x=>x.id===s.id?s:x)}));}
  function deleteSector(id){setData(d=>({...d,sectors:(d.sectors||[]).filter(s=>s.id!==id)}));}
  function handleNavigate({corridorId,bayId,boxId}){
    setScreenStack([{type:"home"},{type:"sector",sectorId:data.corridors.find(c=>c.id===corridorId)?.sectorId},{type:"bay",corridorId,bayId,highlightBoxId:boxId}]);
  }

  if(!data)return<div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:15}}>Carregando...</div>;

  const sharedProps={onConfirmDelete:confirmDelete,onRegisterUndo:registerUndo,viewMode,onChangeViewMode:setViewMode};

  return(
    <>
      <style>{css}</style>
      {screen.type==="home"&&<HomeScreen data={data} onSelectSector={id=>nav({type:"sector",sectorId:id})} onOpenProducts={()=>nav({type:"products"})} onOpenValidity={()=>nav({type:"validity"})} onOpenSearch={()=>setShowSearch(true)} onAddSector={addSector} onEditSector={editSector} onDeleteSector={deleteSector} {...sharedProps}/>}
      {screen.type==="sector"&&(()=>{
        const sector=(data.sectors||[]).find(s=>s.id===screen.sectorId);
        if(!sector)return<div style={{padding:20,color:C.danger}}>Setor não encontrado. <button onClick={back} style={{color:C.accent,background:"none",border:"none"}}>Voltar</button></div>;
        const corridors=(data.corridors||[]).filter(c=>c.sectorId===sector.id).map(c=>({...c,mascot:sector.mascot}));
        const allCors=data.corridors.map(c=>({...c,mascot:(data.sectors||[]).find(s=>s.id===c.sectorId)?.mascot||"📦"}));
        return<SectorScreen sector={sector} corridors={corridors} products={data.products} allCorridors={allCors} allSectors={data.sectors} onBack={back} onUpdateCorridor={updateCorridor} onAddCorridor={addCorridor} onDeleteCorridor={deleteCorridor} {...sharedProps}/>;
      })()}
      {screen.type==="bay"&&(()=>{
        const cor=data.corridors.find(c=>c.id===screen.corridorId);
        if(!cor)return<div style={{padding:20,color:C.danger}}>Corredor não encontrado. <button onClick={back} style={{color:C.accent,background:"none",border:"none"}}>Voltar</button></div>;
        const sector=(data.sectors||[]).find(s=>s.id===cor.sectorId);
        const corridor={...cor,mascot:sector?.mascot||"📦"};
        const bay=corridor.bays.find(b=>b.id===screen.bayId);
        if(!bay)return<div style={{padding:20,color:C.danger}}>Bay não encontrado. <button onClick={back} style={{color:C.accent,background:"none",border:"none"}}>Voltar</button></div>;
        const allCors=data.corridors.map(c=>({...c,mascot:(data.sectors||[]).find(s=>s.id===c.sectorId)?.mascot||"📦"}));
        return<BayScreen bay={bay} corridor={corridor} products={data.products} corridors={allCors} highlightBoxId={screen.highlightBoxId} onBack={back} onUpdateBay={updated=>updateCorridor({...cor,bays:cor.bays.map(b=>b.id===updated.id?updated:b)})} {...sharedProps}/>;
      })()}
      {screen.type==="products"&&<ProductsScreen products={data.products} onBack={back} onSaveProduct={saveProduct} onDeleteProduct={sku=>{registerUndo("Produto excluído");deleteProduct(sku);}} {...sharedProps}/>}
      {screen.type==="validity"&&<ValidityScreen data={data} onBack={back} onNavigate={handleNavigate}/>}
      {showSearch&&<SearchOverlay data={data} onClose={()=>setShowSearch(false)} onNavigate={v=>{handleNavigate(v);setShowSearch(false);}}/>}
      {confirmState&&<ConfirmModal msg={confirmState.msg} onConfirm={()=>{confirmState.onConfirm();setConfirmState(null);}} onCancel={()=>setConfirmState(null)}/>}
      {undoState&&<UndoToast msg={undoState.msg} onUndo={doUndo} onDismiss={()=>{setUndoState(null);if(undoTimerRef.current)clearTimeout(undoTimerRef.current);}}/>}
    </>
  );
}

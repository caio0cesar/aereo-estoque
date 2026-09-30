import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import StackColumn from "./stackcolumn.jsx";

// Registro de todos os andares montados: permite que o dedo que segura a caixa
// enxergue e solte em QUALQUER andar, não só no andar de origem.
const FLOORS=new Map();

// Primeiro ancestral com scroll vertical (null = a própria janela)
function scrollParent(el){
  let p=el&&el.parentElement;
  while(p&&p!==document.body){
    const s=getComputedStyle(p);
    if(/(auto|scroll)/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+2)return p;
    p=p.parentElement;
  }
  return null;
}

export default function FloorRow({floor,mascot,products,onClickBox,onUpdateFloor,dragRef,draggingId,setDraggingId,canMove,onFixSlot,onPokeBox,profile,onReturnPoke}){
  const MAX_SLOTS=10, SLOT_W=124, SLOT_H=100, GAP=8, CARD_H=90, PEEK=32;

  function buildSlots(boxes){
    const slots=Array(MAX_SLOTS).fill(null);
    const stacks={}, order=[], seen={};
    boxes.forEach(b=>{const key=b.stackId||b.id;if(!seen[key]){seen[key]=true;order.push(key);}if(!stacks[key])stacks[key]=[];stacks[key].push(b);});
    const groups=order.map(key=>stacks[key].sort((a,b)=>(a.stackOrder||0)-(b.stackOrder||0)));
    groups.sort((a,b)=>{
      const ai=a[0].slotIndex!=null?a[0].slotIndex:999, bi=b[0].slotIndex!=null?b[0].slotIndex:999;
      if(ai!==bi)return ai-bi;
      return String(a[0].id).localeCompare(String(b[0].id));
    });
    const corrections=[];
    groups.forEach((group,idx)=>{
      let slotIdx=group[0].slotIndex!=null?group[0].slotIndex:idx;
      if(slotIdx>=MAX_SLOTS)slotIdx=MAX_SLOTS-1;
      if(slots[slotIdx]!==null){
        while(slotIdx<MAX_SLOTS&&slots[slotIdx]!==null)slotIdx++;
        if(slotIdx<MAX_SLOTS) corrections.push({box:group[0],newSlot:slotIdx});
      }
      if(slotIdx<MAX_SLOTS)slots[slotIdx]=group;
    });
    if(corrections.length>0&&onFixSlot){
      corrections.forEach(c=>onFixSlot(c.box,c.newSlot));
    }
    return slots;
  }

  const slots=buildSlots(floor.boxes);
  const fid=String(floor.id);
  const [dragOverSlot,setDragOverSlot]=useState(-1);
  const [preview,setPreview]=useState(null);      // {slot,gv} neste andar enquanto alguém arrasta por cima
  const [ghostBox,setGhostBox]=useState(null);
  const scrollRef=useRef(null);
  const slotsRef=useRef(slots);
  const previewRef=useRef(null);                  // alvo atual do arraste que ESTE andar iniciou: {floorId,slot,gv}
  const ptrs=useRef(new Map());                   // pointerId -> registro do dedo
  const ghostRef=useRef(null);
  const ghostPos=useRef({x:0,y:0});
  const autoRef=useRef(null);
  const flingRef=useRef(null);
  const vScrollRef=useRef(null);
  const lastGesture=useRef(0);
  slotsRef.current=slots;

  // ---------- helpers ----------
  function lockScroll(on){if(scrollRef.current)scrollRef.current.style.touchAction=on?"none":"pan-x";}
  function lockAll(on){FLOORS.forEach(r=>r.lock(on));}
  function samePrev(a,b){return(!a&&!b)||(!!a&&!!b&&a.floorId===b.floorId&&a.slot===b.slot&&a.gv===b.gv);}
  // Mostra/limpa o espaço de inserção no andar certo
  function applyPreview(t){
    const old=previewRef.current;
    if(old&&(!t||old.floorId!==t.floorId)){const r=FLOORS.get(old.floorId);if(r)r.setPreview(null);}
    if(t){const r=FLOORS.get(t.floorId);if(r)r.setPreview({slot:t.slot,gv:t.gv});}
    previewRef.current=t;
  }
  function placeGhost(x,y){ghostPos.current={x,y};const g=ghostRef.current;if(g){g.style.left=x+"px";g.style.top=y+"px";}}
  function stopAuto(){if(autoRef.current){clearInterval(autoRef.current);autoRef.current=null;}}
  function cancelFling(){if(flingRef.current){cancelAnimationFrame(flingRef.current);flingRef.current=null;}}
  function startFling(v){
    cancelFling();
    let last=performance.now();
    function step(now){
      const el=scrollRef.current;
      if(!el){flingRef.current=null;return;}
      const dt=Math.min(32,now-last);last=now;
      el.scrollLeft+=v*dt;v*=Math.pow(0.95,dt/16);
      if(Math.abs(v)<0.02){flingRef.current=null;return;}
      flingRef.current=requestAnimationFrame(step);
    }
    flingRef.current=requestAnimationFrame(step);
  }

  // Descobre em qual andar/slot o dedo está e em qual posição da pilha inserir.
  // gv = posição visual (0 = topo/atrás, n = embaixo/na frente), calculada sem contar o espaço de preview
  // para o resultado não "tremer" quando o espaço se abre.
    function targetAt(x,y){
    const el=document.elementFromPoint(x,y);
    const pokeEl=el&&el.closest?el.closest("[data-poke-icon]"):null;
    if(pokeEl)return{poke:true};
    const slotEl=el&&el.closest?el.closest("[data-slotidx]"):null;
    if(!slotEl)return null;
    const host=slotEl.closest("[data-floorid]");
    if(!host)return null;
    const floorId=host.getAttribute("data-floorid");
    const reg=FLOORS.get(floorId);
    if(!reg)return null;
    const slot=parseInt(slotEl.getAttribute("data-slotidx"),10);
    const dr=dragRef.current, group=reg.getSlots()[slot];
    const n=group?group.filter(b=>!(dr&&dr.box&&b.id===dr.box.id)).length:0;
    if(n===0)return{floorId,slot,gv:0};
    const rel=y-slotEl.getBoundingClientRect().top;
    let gv;
    if(rel<=0)gv=0;
    else{
      const r=Math.floor(rel/PEEK);
      gv=r<n-1?r:((rel-(n-1)*PEEK)<CARD_H/2?n-1:n);
    }
    return{floorId,slot,gv};
  }
  function updateTarget(x,y){
    const t=targetAt(x,y);
    if(!samePrev(t,previewRef.current))applyPreview(t);
  }

  function autoTick(){
    const dr=dragRef.current;
    if(!dr||!dr.touch)return;
    const r=ptrs.current.get(dr.pointerId);
    if(!r)return;
    let moved=false;
    // vertical: rola a tela para alcançar outros andares
    const sp=vScrollRef.current;
    const vb=sp?sp.getBoundingClientRect():{top:0,bottom:window.innerHeight};
    const vEdge=90, vMax=14;
    let vy=0;
    if(r.cy<vb.top+vEdge)vy=-Math.ceil((1-Math.max(0,r.cy-vb.top)/vEdge)*vMax);
    else if(r.cy>vb.bottom-vEdge)vy=Math.ceil((1-Math.max(0,vb.bottom-r.cy)/vEdge)*vMax);
    if(vy){if(sp)sp.scrollTop+=vy;else window.scrollBy(0,vy);moved=true;}
    // horizontal (só com 1 dedo): no andar que está sob o dedo
    if(ptrs.current.size<=1){
      const el=document.elementFromPoint(r.cx,r.cy);
      const host=(el&&el.closest?el.closest("[data-floorid]"):null)||scrollRef.current;
      if(host){
        const b=host.getBoundingClientRect(), edge=70, max=12;
        let v=0;
        if(r.cx<b.left+edge)v=-Math.ceil((1-Math.max(0,r.cx-b.left)/edge)*max);
        else if(r.cx>b.right-edge)v=Math.ceil((1-Math.max(0,b.right-r.cx)/edge)*max);
        if(v){host.scrollLeft+=v;moved=true;}
      }
    }
    if(moved)updateTarget(r.cx,r.cy);
  }

  function startDrag(rec){
    rec.t=null;
    if(dragRef.current||!ptrs.current.has(rec.id))return;
    const box=floor.boxes.find(b=>String(b.id)===String(rec.boxId));
    if(!box)return;
    dragRef.current={box,fromFloorId:floor.id,pointerId:rec.id,touch:true};
    setDraggingId(box.id);
    lockAll(true);                                      // novos toques (2º dedo) ficam sob controle do JS em qualquer andar
    try{scrollRef.current.setPointerCapture(rec.id);}catch(_){}
    if(navigator.vibrate)navigator.vibrate(15);
    vScrollRef.current=scrollParent(scrollRef.current);
    placeGhost(rec.cx,rec.cy);
    setGhostBox(box);
    updateTarget(rec.cx,rec.cy);
    stopAuto();
    autoRef.current=setInterval(autoTick,16);
  }

  // ---------- eventos de ponteiro (toque/caneta). Mouse continua no drag nativo do HTML5 ----------
  function onPointerDown(e){
    if(e.pointerType==="mouse")return;
    cancelFling();
    const dr=dragRef.current, dragging=!!(dr&&dr.touch);
    const boxEl=e.target.closest?e.target.closest("[data-boxid]"):null;
    const onBox=!!(boxEl&&canMove);
    const rec={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,cx:e.clientX,cy:e.clientY,
      boxId:boxEl?boxEl.getAttribute("data-boxid"):null,manual:onBox||dragging,pan:false,t:null,v:0,lt:e.timeStamp};
    if(!dragging)ptrs.current.forEach(o=>{if(o.t){clearTimeout(o.t);o.t=null;}});
    ptrs.current.set(e.pointerId,rec);
    if(dragging){
      try{scrollRef.current.setPointerCapture(e.pointerId);}catch(_){}
    }else if(onBox&&ptrs.current.size===1){
      rec.t=setTimeout(()=>startDrag(rec),220);
    }
  }

  function onPointerMove(e){
    const r=ptrs.current.get(e.pointerId);
    if(!r)return;
    const dx=e.clientX-r.lx;
    r.lx=e.clientX;r.cx=e.clientX;r.cy=e.clientY;
    const dr=dragRef.current, dragging=!!(dr&&dr.touch);
    if(dragging&&dr.pointerId===e.pointerId){       // dedo que segura a caixa
      placeGhost(e.clientX,e.clientY);
      updateTarget(e.clientX,e.clientY);
      return;
    }
    if(!r.pan&&(Math.abs(e.clientX-r.x)>8||Math.abs(e.clientY-r.y)>8)){
      r.pan=true;
      if(r.t){clearTimeout(r.t);r.t=null;}
    }
    if(!r.manual)return;
    if(r.pan||dragging){                             // outro dedo: rola o andar em que ele encostou, na mão
      r.pan=true;
      if(scrollRef.current)scrollRef.current.scrollLeft-=dx;
      const dt=Math.max(1,e.timeStamp-r.lt);
      r.v=0.7*r.v+0.3*(-dx/dt);
    }
    r.lt=e.timeStamp;
  }

  function onPointerEnd(e){
    const r=ptrs.current.get(e.pointerId);
    if(!r)return;
    if(r.t)clearTimeout(r.t);
    ptrs.current.delete(e.pointerId);
    const dr=dragRef.current;
    if(dr&&dr.touch&&dr.pointerId===e.pointerId){
      lastGesture.current=Date.now();
      stopAuto();lockAll(false);
      setGhostBox(null);setDraggingId(null);
      const p=previewRef.current;
      applyPreview(null);
      const reg=p?FLOORS.get(p.floorId):null;
      if(e.type==="pointerup"&&p&&reg)reg.drop(p.slot,p.gv);   // solta no andar de destino (pode ser outro andar)
      else dragRef.current=null;
      return;
    }
    if(r.pan){
      lastGesture.current=Date.now();
      if(e.type==="pointerup"&&r.manual&&!(dr&&dr.touch)&&Math.abs(r.v)>0.15&&e.timeStamp-r.lt<80){
        startFling(Math.max(-3,Math.min(3,r.v)));
      }
    }
  }

  // ---------- soltar ----------
  // gv: posição visual (0 = topo/atrás ... n = embaixo/na frente). Sem gv (mouse): entra atrás, como antes.
  function dropOnSlot(slotIdx,gv){
    const dr=dragRef.current; if(!dr)return;
    dragRef.current=null; setDragOverSlot(-1); setPreview(null);
    const draggedBox=dr.box;
    const inSlot=slots[slotIdx];
    const others=inSlot?inSlot.filter(b=>b.id!==draggedBox.id):[];   // já em ordem crescente de stackOrder
    if(others.length>0){
      if(others.length>=10){alert("Máximo de 10 caixas por pilha!");return;}
      const n=others.length;
      const k=gv==null?n:Math.max(0,Math.min(n,n-gv));               // índice crescente onde a caixa entra
      const stackId=others[others.length-1].stackId||(draggedBox.id+"_stk");
      const orderOf={};
      others.forEach((b,idx)=>{orderOf[b.id]=idx<k?idx:idx+1;});
      const newBox={...draggedBox,stackId,stackOrder:k,slotIndex:slotIdx};
      let newBoxes=floor.boxes.filter(b=>b.id!==draggedBox.id)
        .map(b=>orderOf[b.id]!=null?{...b,stackId,stackOrder:orderOf[b.id],slotIndex:slotIdx}:b);
      newBoxes.push(newBox);
      onUpdateFloor(floor.id,newBoxes,dr.fromFloorId,draggedBox.id,newBox);
    }else{
      const newBox2={...draggedBox,stackId:null,stackOrder:0,slotIndex:slotIdx};
      const newBoxes2=dr.fromFloorId===floor.id?floor.boxes.map(b=>b.id===draggedBox.id?newBox2:b):floor.boxes.concat([newBox2]);
      onUpdateFloor(floor.id,newBoxes2,dr.fromFloorId,draggedBox.id,newBox2);
    }
  }

  // Registra este andar (sempre com as funções mais recentes) e limpa ao desmontar
  FLOORS.set(fid,{getSlots:()=>slotsRef.current,setPreview,lock:lockScroll,drop:dropOnSlot});
  useEffect(()=>()=>{FLOORS.delete(fid);},[fid]);
  useEffect(()=>()=>{stopAuto();cancelFling();},[]);

  // Ignora o "click" que o navegador dispara logo depois de arrastar/rolar
  function safeClick(b){
    if(Date.now()-lastGesture.current<350)return;
    onClickBox(b);
  }

  const scroller=React.createElement("div",{
    ref:scrollRef,"data-floorid":fid,
    onPointerDown,onPointerMove,onPointerUp:onPointerEnd,onPointerCancel:onPointerEnd,
    style:{display:"flex",overflowX:"auto",gap:GAP,padding:"8px 4px 14px",minHeight:SLOT_H+22,WebkitOverflowScrolling:"touch",touchAction:"pan-x",overscrollBehaviorX:"contain"}
  },
    slots.map((group,slotIdx)=>{
      const previewGv=preview&&preview.slot===slotIdx?preview.gv:null;
      const isOver=dragOverSlot===slotIdx||previewGv!=null;
      const rowsN=group?group.filter(b=>!(previewGv!=null&&b.id===draggingId)).length+(previewGv!=null?1:0):0;
      return React.createElement("div",{
        key:slotIdx,"data-slotidx":slotIdx,
        onDragOver:e=>{e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverSlot(slotIdx);},
        onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverSlot(-1);},
        onDrop:e=>{e.preventDefault();e.stopPropagation();dropOnSlot(slotIdx);},
        style:{flexShrink:0,width:SLOT_W,height:group?(CARD_H+(Math.max(rowsN,1)-1)*PEEK):SLOT_H,minHeight:SLOT_H,border:isOver?"2px dashed #1dd1a1":(group?"none":"1px dashed rgba(255,255,255,0.07)"),borderRadius:12,background:isOver?"rgba(29,209,161,0.06)":"transparent",position:"relative",transition:"border-color 0.15s, background 0.15s"}
      },
        group&&React.createElement(StackColumn,{group,mascot,products,onClickBox:safeClick,dragRef,draggingId,setDraggingId,floorId:floor.id,canMove,scrollRef,previewGv,onDropOnStack:(targetBoxId,fid2,touchSlotIdx)=>dropOnSlot(touchSlotIdx!=null?touchSlotIdx:slotIdx)}),
        !group&&isOver&&React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#1dd1a1",fontWeight:600}},"Soltar aqui")
      );
    })
  );

  const ghost=ghostBox&&createPortal(
    React.createElement("div",{
      ref:el=>{ghostRef.current=el;if(el){el.style.left=ghostPos.current.x+"px";el.style.top=ghostPos.current.y+"px";}},
      style:{position:"fixed",left:0,top:0,width:104,height:62,zIndex:1000,pointerEvents:"none",transform:"translate(-50%,-80%) scale(1.04)",background:"rgba(12,58,78,0.98)",border:"2px solid #1dd1a1",borderRadius:10,padding:"8px 9px",boxShadow:"0 0 0 3px rgba(29,209,161,0.25), 0 12px 28px rgba(0,0,0,0.7)",boxSizing:"border-box",overflow:"hidden"}
    },
      React.createElement("div",{style:{fontWeight:800,fontSize:12,color:"#e4f5f0",wordBreak:"break-all",marginBottom:6}},ghostBox.sku),
      React.createElement("div",{style:{fontSize:8,color:"#5a9d90"}},"QTD."),
      React.createElement("div",{style:{fontSize:16,fontWeight:800,color:"#1dd1a1",lineHeight:1}},ghostBox.qty)
    ),
    document.body
  );

  return React.createElement(React.Fragment,null,scroller,ghost);
}

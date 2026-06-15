import React, { useState } from "react";
import { getValidity } from "../utils/validity.jsx";
import { DuckIcon } from "./shared.jsx";

export default function StackColumn({group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId,onDropOnStack,canMove}){
  const [hovered,setHovered]=useState(-1);
  const CARD_H=90, PEEK=32;
  const colHeight=group.length===1?CARD_H:CARD_H+(group.length-1)*PEEK;

  return React.createElement("div",{
    style:{position:"relative",width:116,flexShrink:0,height:colHeight,marginRight:6},
    onDragOver:e=>e.preventDefault(),
    onDrop:e=>{e.preventDefault();e.stopPropagation();if(dragRef.current)onDropOnStack(group[0].id,floorId);}
  },
    [...group].reverse().map((box,ri)=>{
      const i=group.length-1-ri;
      const vi=getValidity(box.validade);
      const isFront=i===0, isHov=hovered===i;
      const topOffset=(group.length-1-i)*PEEK;
      return React.createElement("div",{
        key:box.id, draggable:!!canMove,
        onDragStart:e=>{if(!canMove)return;dragRef.current={box,fromFloorId:floorId};setDraggingId(box.id);e.dataTransfer.effectAllowed="move";},
        onDragEnd:()=>{dragRef.current=null;setDraggingId(null);},
        onDragOver:e=>{if(!canMove)return;e.preventDefault();e.dataTransfer.dropEffect="move";},
        onMouseEnter:()=>setHovered(i), onMouseLeave:()=>setHovered(-1),
        onTouchStart:e=>{
          if(!canMove)return;
          setHovered(i);
          const t=e.touches[0];
          const dr={box,fromFloorId:floorId,touchStartX:t.clientX,touchStartY:t.clientY,isDragging:false,longPressReady:false,isScroll:false};
          dr.longPressTimer=setTimeout(()=>{dr.longPressReady=true;},300);
          dragRef.current=dr;
          setDraggingId(box.id);
        },
        onTouchMove:e=>{
          const dr=dragRef.current; if(!dr||!dr.box) return;
          const t=e.touches[0];
          const dx=Math.abs(t.clientX-(dr.touchStartX||0)), dy=Math.abs(t.clientY-(dr.touchStartY||0));
          if(!dr.longPressReady){
            if(dx>8||dy>8){
              clearTimeout(dr.longPressTimer);
              setHovered(-1);
              dragRef.current=null;
              setDraggingId(null);
            }
            return;
          }
          if(dx>8||dy>8){dr.isDragging=true;e.preventDefault();}
        },
        onTouchEnd:e=>{
          setHovered(-1);
          const dr=dragRef.current;
          if(dr&&dr.longPressTimer) clearTimeout(dr.longPressTimer);
          if(!dr||!dr.isDragging){dragRef.current=null;setDraggingId(null);return;}
          const t=e.changedTouches[0];
          let slot=document.elementFromPoint(t.clientX,t.clientY);
          let slotIdx=-1;
          while(slot&&slot!==document.body){
            if(slot.dataset&&slot.dataset.slotidx!=null){slotIdx=parseInt(slot.dataset.slotidx);break;}
            slot=slot.parentElement;
          }
          if(slotIdx>=0) onDropOnStack(null,floorId,slotIdx);
          else{dragRef.current=null;setDraggingId(null);}
        },
        onClick:e=>{e.stopPropagation();onClickBox(box);},
        style:{
          position:"absolute", top:topOffset, left:0, width:"100%", height:CARD_H,
          background:isHov?"rgba(25,80,100,0.99)":isFront?"rgba(12,58,78,0.98)":"rgba(8,42,58,0.96)",
          border:"1px solid "+(vi&&vi.days<=90?vi.color+"cc":isFront?"rgba(29,209,161,0.5)":"rgba(29,209,161,0.28)"),
          borderRadius:10, padding:"8px 9px", cursor:canMove?"grab":"pointer", overflow:"hidden",
          transform:"translateY("+(isHov?-10:0)+"px)",
          transition:"transform 0.18s ease, box-shadow 0.18s",
          zIndex:isHov?100:group.length-i,
          boxShadow:isHov?"0 8px 20px rgba(0,0,0,0.8)":isFront?"0 4px 14px rgba(0,0,0,0.6)":"0 2px 6px rgba(0,0,0,0.5)",
          userSelect:"none",
        }
      },
        React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:0.05}},
          mascot==="🦆"?React.createElement(DuckIcon,{size:34}):React.createElement("div",{style:{fontSize:34,lineHeight:1}},mascot)
        ),
        isFront?(
          React.createElement(React.Fragment,null,
            React.createElement("div",{style:{fontWeight:800,fontSize:12,color:"#e4f5f0",wordBreak:"break-all",marginBottom:6}},box.sku),
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
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
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

import React, { useState } from "react";
import { getValidity } from "../utils/validity.jsx";
import { DuckIcon, isProOperator } from "./shared.jsx";

// Em celular (toque) o arraste é feito pelo FloorRow com Pointer Events.
// O drag nativo do HTML5 fica só para mouse, senão o Chrome Android pode iniciar
// um drag próprio no long-press e cancelar o nosso.
const FINE_POINTER = typeof window!=="undefined"&&window.matchMedia
  ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
  : true;

export default function StackColumn({group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId,onDropOnStack,canMove,scrollRef,previewGv,profile,onReturnPoke}){
  const [hovered,setHovered]=useState(-1);

  const CARD_H=90, PEEK=32;

  // Linhas de cima para baixo: topo = maior stackOrder (atrás), embaixo = menor (na frente).
  // Durante o preview, a caixa que está sendo arrastada sai da pilha e entra um espaço tracejado (null).
  const hasPreview=previewGv!=null;
  const list=hasPreview?group.filter(b=>b.id!==draggingId):group;
  const rows=[...list].reverse();
  if(hasPreview)rows.splice(Math.min(previewGv,rows.length),0,null);
  const N=rows.length;
  const colHeight=N<=1?CARD_H:CARD_H+(N-1)*PEEK;

  return React.createElement("div",{
    style:{position:"relative",width:116,flexShrink:0,height:colHeight,marginRight:6,transition:"height 0.18s ease"},
    onDragOver:e=>e.preventDefault(),
    onDrop:e=>{e.preventDefault();e.stopPropagation();if(dragRef.current)onDropOnStack(group[0].id,floorId);}
  },
    rows.map((box,r)=>{
      const topOffset=r*PEEK;

      if(!box){
        return React.createElement("div",{key:"__gap",style:{
          position:"absolute",top:topOffset,left:0,width:"100%",height:CARD_H,boxSizing:"border-box",
          border:"2px dashed #1dd1a1",borderRadius:10,background:"rgba(29,209,161,0.10)",
          zIndex:r+1,pointerEvents:"none",transition:"top 0.18s ease"
        }},
          React.createElement("div",{style:{padding:"5px 8px",fontSize:9,fontWeight:700,color:"#1dd1a1"}},"solte aqui")
        );
      }

      const vi=getValidity(box.validade);
      const isFront=r===N-1, isHov=hovered===r;
      const poked=!!box.pokeById;
      const canReturn=poked&&profile&&(isProOperator(profile)||profile.id===box.pokeById);
      return React.createElement("div",{
        key:box.id, "data-boxid":poked?undefined:box.id, draggable:!!canMove&&FINE_POINTER&&!poked,
        onDragStart:e=>{if(!canMove)return;dragRef.current={box,fromFloorId:floorId};setDraggingId(box.id);e.dataTransfer.effectAllowed="move";},
        onDragEnd:()=>{dragRef.current=null;setDraggingId(null);},
        onDragOver:e=>{if(!canMove)return;e.preventDefault();e.dataTransfer.dropEffect="move";},
        onMouseEnter:()=>setHovered(r), onMouseLeave:()=>setHovered(-1),
        onClick:e=>{e.stopPropagation();if(canReturn){onReturnPoke&&onReturnPoke(box);return;}onClickBox(box);},
        style:{
          position:"absolute", top:topOffset, left:0, width:"100%", height:CARD_H,
          background:poked?"rgba(255,209,102,0.12)":(isHov?"rgba(25,80,100,0.99)":isFront?"rgba(12,58,78,0.98)":"rgba(8,42,58,0.96)"),
          border:"1px "+(poked?"dashed #ffd166":"solid "+(vi&&vi.days<=90?vi.color+"cc":isFront?"rgba(29,209,161,0.5)":"rgba(29,209,161,0.28)")),
          borderRadius:10, padding:"8px 9px", cursor:canMove?"grab":"pointer", overflow:"hidden",
          transform:"translateY("+(isHov?-10:0)+"px)",
          transition:"transform 0.18s ease, top 0.18s ease, box-shadow 0.18s, opacity 0.15s",
          zIndex:isHov?100:r+1,
          opacity:draggingId===box.id?0.35:1,
          boxShadow:isHov?"0 8px 20px rgba(0,0,0,0.8)":isFront?"0 4px 14px rgba(0,0,0,0.6)":"0 2px 6px rgba(0,0,0,0.5)",
          userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none",
          touchAction:canMove?"none":undefined,
        }
      },
           React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:0.05}},
          mascot==="🦆"?React.createElement(DuckIcon,{size:34}):React.createElement("div",{style:{fontSize:34,lineHeight:1}},mascot)
        ),
        poked&&React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",background:"rgba(7,30,38,0.35)",zIndex:2}},
          React.createElement("div",{style:{fontSize:9,fontWeight:800,color:"#ffd166",textAlign:"center",padding:"2px 8px",background:"rgba(7,30,38,0.7)",borderRadius:6,lineHeight:1.3}},(box.pokeByName||"?")+"'s poke")
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

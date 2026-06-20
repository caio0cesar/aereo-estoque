import React, { useState, useRef } from "react";
import StackColumn from "./stackcolumn.jsx";

export default function FloorRow({floor,mascot,products,onClickBox,onUpdateFloor,dragRef,draggingId,setDraggingId,canMove}){
  const MAX_SLOTS=10, SLOT_W=124, SLOT_H=100, GAP=8;

  function buildSlots(boxes){
    const slots=Array(MAX_SLOTS).fill(null);
    const stacks={}, order=[], seen={};
    boxes.forEach(b=>{const key=b.stackId||b.id;if(!seen[key]){seen[key]=true;order.push(key);}if(!stacks[key])stacks[key]=[];stacks[key].push(b);});
    order.forEach((key,idx)=>{
      const group=stacks[key].sort((a,b)=>(a.stackOrder||0)-(b.stackOrder||0));
      let slotIdx=group[0].slotIndex!=null?group[0].slotIndex:idx;
      if(slotIdx>=MAX_SLOTS)slotIdx=MAX_SLOTS-1;
      while(slotIdx<MAX_SLOTS&&slots[slotIdx]!==null)slotIdx++;
      if(slotIdx<MAX_SLOTS)slots[slotIdx]=group;
    });
    return slots;
  }

  const slots=buildSlots(floor.boxes);
  const [dragOverSlot,setDragOverSlot]=useState(-1);
  const scrollRef=useRef(null), touchStartX=useRef(0), touchScrollLeft=useRef(0), touchDragging=useRef(false);

  function onTouchStart(e){if(dragRef.current&&dragRef.current.isDragging)return;touchStartX.current=e.touches[0].clientX;touchScrollLeft.current=scrollRef.current?scrollRef.current.scrollLeft:0;touchDragging.current=false;}
  function onTouchMove(e){if(dragRef.current&&dragRef.current.isDragging)return;const dx=touchStartX.current-e.touches[0].clientX;if(Math.abs(dx)>6)touchDragging.current=true;if(touchDragging.current&&scrollRef.current)scrollRef.current.scrollLeft=touchScrollLeft.current+dx;}

  function dropOnSlot(slotIdx){
    const dr=dragRef.current; if(!dr)return;
    dragRef.current=null; setDragOverSlot(-1);
    const existingInSlot=slots[slotIdx], draggedBox=dr.box;
    if(existingInSlot){
      const topBox=existingInSlot[existingInSlot.length-1];
      const stackId=topBox.stackId||(draggedBox.id+"_stk");
      const maxOrder=existingInSlot.reduce((m,b)=>Math.max(m,b.stackOrder||0),0);
      if(existingInSlot.length>=10){alert("Máximo de 10 caixas por pilha!");return;}
      const newBox={...draggedBox,stackId,stackOrder:maxOrder+1,slotIndex:slotIdx};
      let newBoxes=floor.boxes.filter(b=>b.id!==draggedBox.id);
      newBoxes=newBoxes.map(b=>existingInSlot.find(x=>x.id===b.id)?{...b,stackId,slotIndex:slotIdx}:b);
      newBoxes.push(newBox);
      onUpdateFloor(floor.id,newBoxes,dr.fromFloorId,draggedBox.id,newBox);
    }else{
      const newBox2={...draggedBox,stackId:null,stackOrder:0,slotIndex:slotIdx};
      const newBoxes2=dr.fromFloorId===floor.id?floor.boxes.map(b=>b.id===draggedBox.id?newBox2:b):floor.boxes.concat([newBox2]);
      onUpdateFloor(floor.id,newBoxes2,dr.fromFloorId,draggedBox.id,newBox2);
    }
  }

  return React.createElement("div",{ref:scrollRef,onTouchStart,onTouchMove,style:{display:"flex",overflowX:"auto",gap:GAP,padding:"8px 4px 14px",minHeight:SLOT_H+22,WebkitOverflowScrolling:"touch",touchAction:"pan-x",overscrollBehaviorX:"contain"}},
    slots.map((group,slotIdx)=>{
      const isOver=dragOverSlot===slotIdx;
      return React.createElement("div",{
        key:slotIdx,"data-slotidx":slotIdx,
        onDragOver:e=>{e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverSlot(slotIdx);},
        onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverSlot(-1);},
        onDrop:e=>{e.preventDefault();e.stopPropagation();dropOnSlot(slotIdx);},
        style:{flexShrink:0,width:SLOT_W,height:group?(90+(group.length-1)*32):SLOT_H,minHeight:SLOT_H,border:isOver?"2px dashed #1dd1a1":(group?"none":"1px dashed rgba(255,255,255,0.07)"),borderRadius:12,background:isOver?"rgba(29,209,161,0.06)":"transparent",position:"relative",transition:"border-color 0.15s, background 0.15s"}
      },
        group&&React.createElement(StackColumn,{group,mascot,products,onClickBox,dragRef,draggingId,setDraggingId,floorId:floor.id,canMove,scrollRef,onDropOnStack:(targetBoxId,fid,touchSlotIdx)=>dropOnSlot(touchSlotIdx!=null?touchSlotIdx:slotIdx)}),
        !group&&isOver&&React.createElement("div",{style:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#1dd1a1",fontWeight:600}},"Soltar aqui")
      );
    })
  );
}

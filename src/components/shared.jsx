
import React, { useState } from "react";

export const C = {bg:"#071e26",border:"rgba(255,255,255,0.1)",accent:"#1dd1a1",accentDim:"rgba(29,209,161,0.13)",text:"#e4f5f0",muted:"#6aada0",dim:"#3f7068",danger:"#ff6b6b",modalBg:"#0b2533"};

export const css = "*{box-sizing:border-box;margin:0;padding:0;} body{background:#071e26;color:#e4f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;} input,select{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#e4f5f0;font-size:14px;width:100%;outline:none;} input::placeholder{color:#3f7068;}select option{background:#0b2533;} input:focus,select:focus{border-color:#1dd1a1;} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;} input[type=number]{-moz-appearance:textfield;} button{cursor:pointer;} ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px;} .ch:active{background:rgba(255,255,255,0.1)!important;} @media(hover:hover){.ch:hover{background:rgba(255,255,255,0.08)!important;}} @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}} .fin{animation:fadeIn .15s ease;} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}} .su{animation:slideUp .2s ease;} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} .blink{animation:blink 1.4s ease-in-out infinite;} @keyframes toastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} .toast{animation:toastIn .2s ease;}";

export function Lbl({children,req}){return React.createElement("label",{style:{fontSize:12,color:C.muted,fontWeight:600,display:"block",marginBottom:4}},children,req&&React.createElement("span",{style:{color:C.accent}}," *"));}
export function Gap({h=12}){return React.createElement("div",{style:{height:h}});}
export function Tag({children,color=C.accent,bg=C.accentDim}){return React.createElement("span",{style:{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}},children);}
export function NumInput({value,onChange,placeholder,readOnly,style}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(e.target.value.replace(/\D/g,"")),placeholder,readOnly,style});}
export function DateInput({value,onChange,placeholder="dd/mm/aaaa"}){return React.createElement("input",{value,inputMode:"numeric",onChange:e=>onChange(fmtDate(e.target.value)),placeholder});}
export function DecInput({value,onChange,placeholder}){return React.createElement("input",{value,inputMode:"decimal",onChange:e=>onChange(e.target.value.replace(/[^0-9.,]/g,"")),placeholder});}
export function Row({children}){const arr=Array.isArray(children)?children.filter(Boolean):[children];return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat("+arr.length+",1fr)",gap:10}},children);}
export function SaveBtn({onClick,label="💾 Salvar"}){return React.createElement("button",{onClick,style:{background:C.accent,color:"#071e26",border:"none",borderRadius:10,padding:12,fontWeight:800,fontSize:14,width:"100%",marginTop:8}},label);}

export function Modal({onClose,title,children,wide}){
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

export function ConfirmModal({msg,onConfirm,onCancel}){
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

export function UndoToast({msg,onUndo,onDismiss}){
  return React.createElement("div",{className:"toast",style:{position:"fixed",bottom:24,left:16,right:16,maxWidth:380,margin:"0 auto",background:"#1a3a4a",border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,zIndex:500,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}},
    React.createElement("span",{style:{fontSize:16}},"🗑"),
    React.createElement("span",{style:{flex:1,fontSize:13,color:C.text}},msg),
    React.createElement("button",{onClick:onUndo,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.3)",color:C.accent,borderRadius:8,padding:"5px 12px",fontWeight:700,fontSize:12,flexShrink:0}},"Desfazer"),
    React.createElement("button",{onClick:onDismiss,style:{background:"none",border:"none",color:C.dim,fontSize:16,padding:"0 2px",flexShrink:0}},"✕")
  );
}

export function DuckIcon({size=40}){
  const s=size;
  return React.createElement("svg",{width:s,height:s,viewBox:"0 0 200 200",xmlns:"http://www.w3.org/2000/svg"},
    React.createElement("defs",null,
      React.createElement("radialGradient",{id:"duckBody",cx:"40%",cy:"35%",r:"60%"},React.createElement("stop",{offset:"0%",stopColor:"#FFF176"}),React.createElement("stop",{offset:"55%",stopColor:"#FFD600"}),React.createElement("stop",{offset:"100%",stopColor:"#E8A000"})),
      React.createElement("radialGradient",{id:"duckHead",cx:"35%",cy:"28%",r:"55%"},React.createElement("stop",{offset:"0%",stopColor:"#FFFDE0"}),React.createElement("stop",{offset:"50%",stopColor:"#FFD600"}),React.createElement("stop",{offset:"100%",stopColor:"#E8A000"})),
      React.createElement("radialGradient",{id:"duckShine",cx:"30%",cy:"25%",r:"50%"},React.createElement("stop",{offset:"0%",stopColor:"white",stopOpacity:"0.7"}),React.createElement("stop",{offset:"100%",stopColor:"white",stopOpacity:"0"}))
    ),
    React.createElement("path",{d:"M15 158 Q35 148 60 155 Q85 162 110 154 Q135 147 160 155 Q178 160 185 156",stroke:"#4DB8E8",strokeWidth:"3",fill:"none",strokeLinecap:"round",opacity:"0.9"}),
    React.createElement("path",{d:"M10 166 Q35 157 65 163 Q95 169 120 162 Q148 155 170 163 Q182 168 190 164",stroke:"#2196C8",strokeWidth:"2.5",fill:"none",strokeLinecap:"round",opacity:"0.8"}),
    React.createElement("path",{d:"M38 157 Q70 148 105 149 Q140 148 163 157 Q168 175 105 179 Q42 178 38 157Z",fill:"#2196C8",opacity:"0.25"}),
    React.createElement("path",{d:"M42 142 Q36 118 44 100 Q52 82 70 76 Q84 71 100 72 Q124 72 142 86 Q160 100 161 122 Q162 144 148 155 Q128 165 100 165 Q65 165 50 154 Q43 148 42 142Z",fill:"url(#duckBody)",stroke:"#C07800",strokeWidth:"2.5"}),
    React.createElement("path",{d:"M88 120 Q108 110 135 116 Q152 123 150 138 Q132 148 110 145 Q88 140 86 130 Q85 124 88 120Z",fill:"#FFCA00",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("path",{d:"M154 115 Q172 103 175 116 Q172 130 160 132Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("path",{d:"M72 78 Q68 62 73 50 Q80 43 90 46 Q98 49 96 63 Q94 75 86 79Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"2"}),
    React.createElement("circle",{cx:"80",cy:"42",r:"33",fill:"url(#duckHead)",stroke:"#C07800",strokeWidth:"2.5"}),
    React.createElement("circle",{cx:"68",cy:"37",r:"10",fill:"white",stroke:"#333",strokeWidth:"1.5"}),
    React.createElement("circle",{cx:"67",cy:"37",r:"6.5",fill:"#111"}),
    React.createElement("circle",{cx:"63",cy:"33",r:"3.5",fill:"white"}),
    React.createElement("path",{d:"M59 32 Q68 27 78 32",stroke:"#A06000",strokeWidth:"1.8",fill:"none",strokeLinecap:"round"}),
    React.createElement("path",{d:"M46 44 Q34 41 28 48 Q30 57 46 55 L57 48Z",fill:"#FF6800",stroke:"#CC4400",strokeWidth:"2"}),
    React.createElement("path",{d:"M80 10 Q74 0 82 -2 Q90 0 87 10Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M87 9 Q82 -1 90 -3 Q98 -1 94 9Z",fill:"#FFE040",stroke:"#C07800",strokeWidth:"1.5"}),
    React.createElement("path",{d:"M93 11 Q89 1 97 0 Q104 2 100 11Z",fill:"#FFD600",stroke:"#C07800",strokeWidth:"1.5"})
  );
}

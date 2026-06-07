import React, { useState, useEffect } from "react";
import { C, Modal, Lbl, Gap, Row, NumInput, DateInput, SaveBtn, Tag } from "./shared.jsx";
import { getValidity } from "../utils/validity.js";
import { todayFull, calcVenc, parsePrice } from "../utils/dates.js";

export function BoxDetailModal({box,product,floorNumber,bay,corridor,onEdit,onClose,allLocations}){
  const vi=getValidity(box.validade);
  const otherLocs=(allLocations||[]).filter(l=>l.box.id!==box.id);
  const rows=[
    {l:"Descrição",v:product&&product.desc},{l:"Família",v:product&&product.familia},
    {l:"Fornecedor",v:product&&product.fornecedor},{l:"Unidade",v:product&&product.um},
    {l:"Preço",v:product&&product.preco?"R$ "+parsePrice(product.preco).toFixed(2):"-"},
    {l:"EAN",v:product&&product.ean||"-"},{l:"Situação",v:product&&product.situacao||"-"},
    {l:"Enfrentamento",v:product&&product.dtaInicio&&product.dtaFim?product.dtaInicio+" → "+product.dtaFim:"-"},
  ];
  return React.createElement(Modal,{onClose,title:"📦 SKU "+box.sku},
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}},
      [{icon:"📦",label:"Qtd.",val:String(box.qty),color:null},{icon:"📍",label:"Local",val:"C"+corridor.number+" B"+bay.number+" A"+floorNumber,color:null},{icon:"📅",label:"Validade",val:box.validade||"-",color:vi&&vi.color}]
        .map((s,i)=>React.createElement("div",{key:i,style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+(s.color||C.border),borderRadius:10,padding:"10px 8px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:18,marginBottom:4}},s.icon),
          React.createElement("div",{style:{fontSize:9,color:C.muted,marginBottom:2}},s.label),
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:s.color||C.text,wordBreak:"break-all"}},s.val)
        ))
    ),
    vi&&vi.days<=90&&React.createElement("div",{style:{background:vi.color+"15",border:"1px solid "+vi.color+"44",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}},
      React.createElement("span",{style:{fontSize:16}},vi.days<0?"💀":vi.days<=30?"🚨":"⚠️"),
      React.createElement("span",{style:{fontSize:12,color:vi.color,fontWeight:700}},vi.days<0?"Vencido há "+Math.abs(vi.days)+" dias":vi.days+" dias restantes")
    ),
    otherLocs.length>0&&React.createElement("div",{style:{background:"rgba(255,211,102,0.08)",border:"1px solid rgba(255,211,102,0.3)",borderRadius:10,padding:10,marginBottom:12}},
      React.createElement("div",{style:{fontSize:11,color:"#ffd166",fontWeight:700,marginBottom:8}},"⚠️ Mesmo SKU em outros locais:"),
      otherLocs.map((l,i)=>React.createElement("div",{key:i,style:{fontSize:11,color:C.text,padding:"4px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.06)":"none"}},
        "📍 C"+l.cor.number+" · Bay "+l.bay.number+" "+l.bay.side.slice(0,3)+". · Andar "+l.fl.number+" · Qtd: ",
        React.createElement("span",{style:{color:C.accent,fontWeight:700}},l.box.qty)
      ))
    ),
    React.createElement("div",{style:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10}},"📋 DADOS DO PRODUTO"),
      product?React.createElement("div",{style:{display:"grid",gap:8}},
        rows.map((row,i)=>React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",gap:8}},
          React.createElement("span",{style:{fontSize:11,color:C.muted,flexShrink:0}},row.l),
          React.createElement("span",{style:{fontSize:11,color:C.text,fontWeight:600,textAlign:"right",wordBreak:"break-word"}},row.v||"-")
        ))
      ):React.createElement("div",{style:{textAlign:"center",padding:"10px 0"}},
        React.createElement("div",{style:{fontSize:22,marginBottom:6}},"📭"),
        React.createElement("div",{style:{fontSize:12,color:C.muted}},"Produto não cadastrado.")
      )
    ),
    React.createElement("button",{onClick:onEdit,style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:10,padding:11,fontWeight:700,fontSize:13,width:"100%"}},"✏️ Editar Caixa")
  );
}

export function BoxEditModal({modal,products,onSave,onClose,onDelete}){
  const isEdit=modal.type==="edit";
  const [form,setForm]=useState(isEdit?{...modal.box}:{sku:"",qty:"",updatedBy:"",date:todayFull(),validade:"",stackId:null,stackOrder:0});
  const [valdMode,setValdMode]=useState("direta");
  const [fabDate,setFabDate]=useState("");
  const [meses,setMeses]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const product=products[form.sku];
  useEffect(()=>{if(valdMode==="calcular"&&fabDate.length===10&&meses){const v=calcVenc(fabDate,meses);if(v)set("validade",v);}},[fabDate,meses,valdMode]);
  function submit(){if(!form.sku.trim()){alert("SKU é obrigatório!");return;}if(!form.qty||isNaN(Number(form.qty))){alert("Quantidade inválida!");return;}onSave({...form,qty:Number(form.qty)});}
  return React.createElement(Modal,{onClose,title:isEdit?"✏️ Editar Caixa":"📦 Nova Caixa"},
    isEdit&&React.createElement("button",{onClick:onDelete,style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:8,fontSize:12,width:"100%",marginBottom:14}},"🗑 Excluir esta caixa"),
    React.createElement(Lbl,{req:true},"SKU"),
    React.createElement(NumInput,{value:form.sku,onChange:v=>set("sku",v),placeholder:"Somente números"}),
    product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.accent,background:C.accentDim,borderRadius:8,padding:"6px 10px"}},"✓ "+(product.desc||"Produto cadastrado")),
    form.sku&&!product&&React.createElement("div",{style:{marginTop:6,fontSize:11,color:C.dim,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}},"SKU não cadastrado."),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,{req:true},"Quantidade"),React.createElement(NumInput,{value:form.qty,onChange:v=>set("qty",v),placeholder:"0"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Nome"),React.createElement("input",{value:form.updatedBy,onChange:e=>set("updatedBy",e.target.value),placeholder:""}))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Validade"),
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:8}},
      ["direta","calcular"].map(m=>React.createElement("button",{key:m,onClick:()=>setValdMode(m),style:{flex:1,background:valdMode===m?C.accentDim:"rgba(255,255,255,0.05)",border:"1px solid "+(valdMode===m?"rgba(29,209,161,0.4)":C.border),color:valdMode===m?C.accent:C.muted,borderRadius:8,padding:7,fontSize:12,fontWeight:600}},m==="direta"?"📅 Data direta":"🔢 Calcular"))
    ),
    valdMode==="direta"&&React.createElement(DateInput,{value:form.validade,onChange:v=>set("validade",v)}),
    valdMode==="calcular"&&React.createElement(React.Fragment,null,
      React.createElement(Row,null,
        React.createElement("div",null,React.createElement(Lbl,null,"Data fabricação"),React.createElement(DateInput,{value:fabDate,onChange:setFabDate})),
        React.createElement("div",null,React.createElement(Lbl,null,"Meses"),React.createElement(NumInput,{value:meses,onChange:setMeses,placeholder:"12"}))
      ),
      form.validade&&React.createElement("div",{style:{marginTop:8,fontSize:12,color:C.accent,background:C.accentDim,borderRadius:8,padding:"7px 10px",textAlign:"center"}},"📅 Vencimento: "+form.validade)
    ),
    React.createElement(SaveBtn,{onClick:submit})
  );
}

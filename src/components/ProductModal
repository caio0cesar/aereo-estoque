import React, { useState } from "react";
import { C, Modal, Lbl, Gap, Row, NumInput, DateInput, DecInput, SaveBtn } from "./shared.jsx";

export default function ProductModal({product,onSave,onClose,onDelete}){
  const isEdit=!!product;
  const [form,setForm]=useState(isEdit?{...product}:{sku:"",desc:"",familia:"",fornecedor:"",um:"UN",preco:"",dtaInicio:"",dtaFim:"",ean:"",situacao:"NN"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ums=["UN","CX","KG","M","M²","L","PC","RL","BD","SC"];
  function submit(){if(!form.sku.trim()){alert("SKU é obrigatório!");return;}onSave(form);}
  return React.createElement(Modal,{onClose,title:isEdit?"✏️ Editar Produto":"➕ Cadastrar Produto",wide:true},
    isEdit&&React.createElement("button",{onClick:onDelete,style:{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:8,fontSize:12,width:"100%",marginBottom:14}},"🗑 Excluir produto"),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,{req:true},"SKU / Material"),React.createElement(NumInput,{value:form.sku,onChange:v=>set("sku",v),placeholder:"Somente números",readOnly:isEdit,style:isEdit?{opacity:0.6}:{}})),
      React.createElement("div",null,React.createElement(Lbl,null,"Unidade (UM)"),React.createElement("select",{value:form.um,onChange:e=>set("um",e.target.value)},ums.map(u=>React.createElement("option",{key:u,value:u},u))))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"Descrição"),
    React.createElement("input",{value:form.desc,onChange:e=>set("desc",e.target.value),placeholder:"Ex: Mang. Multi Uso 3/8x4.0..."}),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Família / Setor"),React.createElement("input",{value:form.familia,onChange:e=>set("familia",e.target.value),placeholder:"Ex: Hidráulica"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Fornecedor"),React.createElement("input",{value:form.fornecedor,onChange:e=>set("fornecedor",e.target.value),placeholder:"Ex: Krona"}))
    ),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Preço (R$)"),React.createElement(DecInput,{value:form.preco,onChange:v=>set("preco",v),placeholder:"0,00"})),
      React.createElement("div",null,React.createElement(Lbl,null,"Situação"),React.createElement("input",{value:"NN",readOnly:true,style:{opacity:0.6,cursor:"default"}}))
    ),
    React.createElement(Gap,null),
    React.createElement(Row,null,
      React.createElement("div",null,React.createElement(Lbl,null,"Início Enfrentamento"),React.createElement(DateInput,{value:form.dtaInicio,onChange:v=>set("dtaInicio",v)})),
      React.createElement("div",null,React.createElement(Lbl,null,"Fim Enfrentamento"),React.createElement(DateInput,{value:form.dtaFim,onChange:v=>set("dtaFim",v)}))
    ),
    React.createElement(Gap,null),
    React.createElement(Lbl,null,"EAN / GTIN"),
    React.createElement(NumInput,{value:form.ean,onChange:v=>set("ean",v),placeholder:"Somente números"}),
    React.createElement(SaveBtn,{onClick:submit})
  );
}

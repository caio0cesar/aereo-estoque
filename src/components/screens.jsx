import React, { useState, useRef, useEffect } from "react";
import { C, Tag, Gap } from "./shared.jsx";
import ProductModal from "./productmodal.jsx";
import { getAllExpiring } from "../utils/validity.jsx";
import { parsePrice, findBySku } from "../utils/dates.jsx";

export function ProductsScreen({products,onBack,onSaveProduct,onDeleteProduct,onConfirmDelete}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=Object.values(products).filter(p=>!search||p.sku.includes(search)||p.desc&&p.desc.toLowerCase().includes(search.toLowerCase())||p.fornecedor&&p.fornecedor.toLowerCase().includes(search.toLowerCase()));
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"🗂 Catálogo de Produtos"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},Object.keys(products).length+" produtos")
      ),
      React.createElement("button",{onClick:()=>setModal({product:null}),style:{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,flexShrink:0}},"+ Novo")
    ),
    React.createElement("div",{style:{padding:"12px 14px"}},
      React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"🔍 Buscar por SKU, descrição ou fornecedor..."}),
      React.createElement(Gap,null),
      list.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"30px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:32,marginBottom:8}},"📭"),
        React.createElement("div",{style:{fontSize:13}},search?"Nenhum produto encontrado.":"Nenhum produto cadastrado.")
      ),
      list.map(p=>React.createElement("div",{key:p.sku,onClick:()=>setModal({product:p}),className:"ch fin",style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:8,cursor:"pointer"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}},
          React.createElement(Tag,null,p.sku),
          p.um&&React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.muted},p.um)
        ),
        p.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4,lineHeight:1.4}},p.desc),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
          p.familia&&React.createElement("span",{style:{fontSize:10,color:C.dim}},p.familia),
          p.fornecedor&&React.createElement("span",{style:{fontSize:10,color:C.dim}},"· "+p.fornecedor),
          p.preco&&React.createElement("span",{style:{fontSize:10,color:C.dim}},"· R$ "+parsePrice(p.preco).toFixed(2))
        )
      ))
    ),
    modal&&React.createElement(ProductModal,{
      product:modal.product,
      onSave:p=>{onSaveProduct(p);setModal(null);},
      onClose:()=>setModal(null),
      onDelete:modal.product?()=>onConfirmDelete("Excluir produto "+modal.product.sku+"?",()=>{onDeleteProduct(modal.product.sku);setModal(null);}):undefined,
    })
  );
}

export function ValidityScreen({data,onBack,onNavigate}){
  const items=getAllExpiring(data);
  return React.createElement("div",{style:{background:C.bg,minHeight:"100vh"}},
    React.createElement("div",{style:{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:"1px solid "+C.border}},
      React.createElement("button",{onClick:onBack,style:{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}},"←"),
      React.createElement("div",{style:{flex:1}},
        React.createElement("div",{style:{fontWeight:700,fontSize:16}},"⏰ Alertas de Validade"),
        React.createElement("div",{style:{fontSize:11,color:C.muted}},items.length+" item(s) a vencer em 90 dias")
      )
    ),
    React.createElement("div",{style:{padding:"12px 14px"}},
      items.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:40,marginBottom:12}},"✅"),
        React.createElement("div",{style:{fontSize:14}},"Nenhuma validade próxima!")
      ),
      items.map((item,i)=>React.createElement("div",{key:i,className:"ch fin",onClick:()=>onNavigate({corridorId:item.cor.id,bayId:item.bay.id,boxId:item.box.id}),
        style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+item.v.color+"44",borderRadius:12,padding:12,marginBottom:8,cursor:"pointer",position:"relative",overflow:"hidden"}},
        React.createElement("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:3,background:item.v.color,borderRadius:"12px 0 0 12px"}}),
        React.createElement("div",{style:{paddingLeft:8}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}},
            React.createElement(Tag,null,item.box.sku),
            React.createElement("span",{style:{fontSize:11,color:item.v.color,fontWeight:700}},item.v.label+" · "+(item.v.days<0?"Vencido há "+Math.abs(item.v.days)+"d":item.v.days+" dias"))
          ),
          item.product&&item.product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},item.product.desc),
          React.createElement("div",{style:{fontSize:10,color:C.dim}},"📍 C"+item.cor.number+" · Bay "+item.bay.number+" · Andar "+item.fl.number+" · Qtd: "+item.box.qty),
          React.createElement("div",{style:{fontSize:10,color:item.v.color,marginTop:4}},"📅 "+item.box.validade+" → Ir para o local ›")
        )
      ))
    )
  );
}

export function SearchOverlay({data,onClose,onNavigate}){
  const [query,setQuery]=useState("");
  const inputRef=useRef(null);
  useEffect(()=>{setTimeout(()=>inputRef.current&&inputRef.current.focus(),100);},[]);
  const products=data.products||{};
  const allBoxSkus=[...new Set((data.corridors||[]).flatMap(c=>c.bays.flatMap(b=>b.floors.flatMap(f=>f.boxes.map(bx=>bx.sku)))))];
  const term=query.trim();
  const results=term.length>=2?(()=>{
    const matchedSkus=new Set();
    allBoxSkus.forEach(sku=>{if(sku.includes(term))matchedSkus.add(sku);});
    Object.values(products).forEach(p=>{if(p.desc&&p.desc.toLowerCase().includes(term.toLowerCase())||p.familia&&p.familia.toLowerCase().includes(term.toLowerCase()))matchedSkus.add(p.sku);});
    return[...matchedSkus].map(sku=>({sku,product:products[sku],locations:findBySku(sku,data.corridors)})).filter(r=>r.locations.length>0);
  })():[];
  const suggestions=term.length>=2&&term.length<7?allBoxSkus.filter(s=>s.startsWith(term)&&s!==term).slice(0,5):[];
  return React.createElement("div",{style:{position:"fixed",inset:0,background:C.bg,zIndex:300,display:"flex",flexDirection:"column"}},
    React.createElement("div",{style:{padding:16,display:"flex",gap:10,alignItems:"center",borderBottom:"1px solid "+C.border,flexShrink:0}},
      React.createElement("div",{style:{flex:1,position:"relative"}},
        React.createElement("input",{ref:inputRef,value:query,onChange:e=>setQuery(e.target.value),placeholder:"SKU ou nome do produto...",style:{paddingLeft:36}}),
        React.createElement("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none"}},"🔍"),
        query&&React.createElement("button",{onClick:()=>setQuery(""),style:{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.dim,fontSize:16,lineHeight:1}},"✕")
      ),
      React.createElement("button",{onClick:onClose,style:{background:"none",border:"1px solid "+C.border,color:C.muted,borderRadius:8,padding:"8px 14px",fontSize:13,flexShrink:0}},"Fechar")
    ),
    suggestions.length>0&&React.createElement("div",{style:{padding:"8px 14px",borderBottom:"1px solid "+C.border,flexShrink:0,display:"flex",gap:6,flexWrap:"wrap"}},
      suggestions.map(s=>React.createElement("button",{key:s,onClick:()=>setQuery(s),style:{background:C.accentDim,border:"1px solid rgba(29,209,161,0.2)",color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600}},s))
    ),
    React.createElement("div",{style:{flex:1,overflowY:"auto",padding:14}},
      term.length>=2&&results.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.muted}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"🔍"),
        React.createElement("div",null,"Nenhum resultado para \""+term+"\"")
      ),
      term.length<2&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:C.dim}},
        React.createElement("div",{style:{fontSize:28,marginBottom:8}},"💡"),
        React.createElement("div",{style:{fontSize:13}},"Digite o SKU ou nome do produto")
      ),
      results.map((r,i)=>React.createElement("div",{key:i,className:"fin",style:{background:"rgba(255,255,255,0.05)",border:"1px solid "+C.border,borderRadius:12,padding:12,marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
          React.createElement(Tag,null,r.sku),
          React.createElement(Tag,{bg:"rgba(255,255,255,0.06)",color:C.dim},r.locations.length+" local(is)")
        ),
        r.product&&r.product.desc&&React.createElement("div",{style:{fontSize:12,color:C.text,marginBottom:4}},r.product.desc),
        r.product&&r.product.fornecedor&&React.createElement("div",{style:{fontSize:11,color:C.muted,marginBottom:8}},r.product.fornecedor),
        r.locations.map((l,j)=>React.createElement("button",{key:j,onClick:()=>{onNavigate({corridorId:l.cor.id,bayId:l.bay.id,boxId:l.box.id});onClose();},className:"ch",
          style:{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"rgba(29,209,161,0.06)",border:"1px solid rgba(29,209,161,0.15)",borderRadius:8,padding:"8px 10px",marginBottom:4,textAlign:"left"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:C.text,fontWeight:600}},"📍 C"+l.cor.number+" · Bay "+l.bay.number+" ("+l.bay.side.slice(0,3)+".) · Andar "+l.fl.number),
            React.createElement("div",{style:{fontSize:10,color:C.muted,marginTop:2}},"Qtd: "+l.box.qty+(l.box.updatedBy?" · "+l.box.updatedBy:"")+" · "+l.box.date)
          ),
          React.createElement("span",{style:{color:C.accent,fontSize:18,marginLeft:8}},"›")
        ))
      ))
    )
  );
}

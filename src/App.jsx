import { useState, useEffect, useRef } from "react";

const genId = () => Math.random().toString(36).slice(2, 9);
const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; };

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INITIAL = {
  products: {
    "1026780": { sku:"1026780", desc:"Mang. Multi Uso 3/8x4.0 Transp Rolo 50M Transparente 20M", familia:"Acessórios Hidráulicos", fornecedor:"Force Line", um:"M", preco:9.73, dtaInicio:"03/06/2025", dtaFim:"31/12/9999", ean:"7899018416919", situacao:"Ativo" },
    "1024256": { sku:"1024256", desc:"Reg. Esf. 440 DN28", familia:"Hidráulica", fornecedor:"Krona", um:"UN", preco:0, dtaInicio:"", dtaFim:"", ean:"", situacao:"Ativo" },
  },
  corridors: [
    { id:"c41", number:41, name:"Tintas e Acabamentos", mascot:"🎨",
      bays:[
        { id:"c41b1e", number:1, side:"Esquerdo", label:"Tintas Látex",
          floors:[
            { id:"f3a", number:3, boxes:[{id:"bx1",sku:"1026780",qty:8,updatedBy:"Caio",date:"05/05"}]},
            { id:"f2a", number:2, boxes:[{id:"bx2",sku:"1024276",qty:10,updatedBy:"Caio",date:"11/05"}]},
            { id:"f1a", number:1, boxes:[] }
          ]
        },
        { id:"c41b1d", number:1, side:"Direito", label:"Rolos e Pincéis", floors:[{id:"f2b",number:2,boxes:[]},{id:"f1b",number:1,boxes:[]}]},
        { id:"c41b2e", number:2, side:"Esquerdo", label:"Tintas Acrílica", floors:[{id:"f2c",number:2,boxes:[]},{id:"f1c",number:1,boxes:[]}]},
        { id:"c41b2d", number:2, side:"Direito", label:"Lixas", floors:[{id:"f1d",number:1,boxes:[]}]},
      ]
    },
    { id:"c44", number:44, name:"Hidráulica", mascot:"🦆",
      bays:[
        { id:"c44b1e", number:1, side:"Esquerdo", label:"Bases e Registros",
          floors:[
            { id:"f3b", number:3, boxes:[] },
            { id:"f2d", number:2, boxes:[{id:"bx3",sku:"1024256",qty:20,updatedBy:"Caio",date:"11/03"}]},
            { id:"f1e", number:1, boxes:[
              {id:"bx4",sku:"1024274",qty:6,updatedBy:"Caio",date:"22/03"},
              {id:"bx5",sku:"1798178",qty:58,updatedBy:"Caio",date:"22/03"}
            ]}
          ]
        },
        { id:"c44b1d", number:1, side:"Direito", label:"Canos e Tubos", floors:[{id:"f2e",number:2,boxes:[]},{id:"f1f",number:1,boxes:[]}]},
      ]
    },
    { id:"c42", number:42, name:"Ferramentas Manuais", mascot:"🔧", bays:[
      { id:"c42b1e", number:1, side:"Esquerdo", label:"Chaves e Alicates", floors:[{id:"f1h",number:1,boxes:[]}]}
    ]},
    { id:"c43", number:43, name:"Material Elétrico", mascot:"⚡", bays:[
      { id:"c43b1e", number:1, side:"Esquerdo", label:"Disjuntores", floors:[{id:"f1i",number:1,boxes:[]}]}
    ]},
    { id:"c45", number:45, name:"Pisos e Revestimentos", mascot:"🏠", bays:[
      { id:"c45b1e", number:1, side:"Esquerdo", label:"Porcelanatos", floors:[{id:"f1j",number:1,boxes:[]}]}
    ]},
  ]
};

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#071e26", border:"rgba(255,255,255,0.1)", accent:"#1dd1a1",
  accentDim:"rgba(29,209,161,0.13)", text:"#e4f5f0", muted:"#6aada0",
  dim:"#3f7068", danger:"#ff6b6b", modalBg:"#0b2533", inputBg:"rgba(255,255,255,0.07)",
};

const css = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#071e26;color:#e4f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;}
  input,select{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:9px 12px;color:#e4f5f0;font-size:14px;width:100%;outline:none;}
  input::placeholder,select option{color:#3f7068;background:#0b2533;}
  input:focus,select:focus{border-color:#1dd1a1;}
  button{cursor:pointer;}
  ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
  .ch:active{background:rgba(255,255,255,0.10) !important;}
  @media(hover:hover){.ch:hover{background:rgba(255,255,255,0.08) !important;}}
  .floor-drop{border-color:#1dd1a1 !important;background:rgba(29,209,161,0.07) !important;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .fin{animation:fadeIn .16s ease;}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .su{animation:slideUp .2s ease;}
`;

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
async function persist(d){try{localStorage.setItem("aereo-v3", JSON.stringify(d));}catch(_){}}
async function loadPersisted(){try{const r=localStorage.getItem("aereo-v3");return r?JSON.parse(r):null;}catch(_){return null;}}

function renumberFloors(floors){
  return [...floors].sort((a,b)=>a.number-b.number).map((f,i)=>({...f,number:i+1}));
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Lbl({children,req}){
  return <label style={{fontSize:12,color:C.muted,fontWeight:600,display:"block",marginBottom:4}}>{children}{req&&<span style={{color:C.accent}}> *</span>}</label>;
}
function Gap({h=12}){return <div style={{height:h}}/>;}
function Row({children,gap=10}){return <div style={{display:"grid",gridTemplateColumns:`repeat(${children.length},1fr)`,gap}}>{children}</div>;}
function SaveBtn({onClick,label="💾 Salvar"}){
  return <button onClick={onClick} style={{background:C.accent,color:"#071e26",border:"none",borderRadius:10,padding:"12px",fontWeight:800,fontSize:14,width:"100%",marginTop:8}}>{label}</button>;
}
function Tag({children,color=C.accent,bg=C.accentDim}){
  return <span style={{background:bg,color,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;
}

function Modal({onClose,title,children,wide}){
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:0}}>
      <div className="su" style={{background:C.modalBg,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:wide?600:400,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:700,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"5px 10px",fontSize:13}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── BOX CARD (ENVELOPE STYLE) ───────────────────────────────────────────────
function BoxCard({box,mascot,product,onDragStart,onDragEnd,onClick,isDragging}){
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className="fin"
      style={{position:"relative",width:115,flexShrink:0,background:"rgba(10,50,68,0.9)",
        border:"1px solid rgba(29,209,161,0.3)",borderRadius:11,padding:"9px 9px 8px",
        cursor:"grab",overflow:"hidden",opacity:isDragging?0.25:1,transition:"opacity .15s",
        boxShadow:"0 2px 10px rgba(0,0,0,0.45)"}}>
      <div style={{position:"absolute",top:0,left:"25%",right:"25%",height:"2px",background:"rgba(29,209,161,0.5)",borderRadius:"0 0 4px 4px"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{fontSize:48,opacity:0.06,lineHeight:1,userSelect:"none"}}>{mascot}</div>
      </div>
      <div style={{position:"relative",fontWeight:800,fontSize:12,color:C.text,wordBreak:"break-all",marginBottom:3,letterSpacing:"0.02em"}}>{box.sku}</div>
      {(product?.fornecedor||product?.familia)&&
        <div style={{position:"relative",fontSize:9,color:C.muted,background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 5px",display:"inline-block",marginBottom:5,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {product.fornecedor||product.familia}
        </div>
      }
      <div style={{position:"relative",borderTop:"1px dashed rgba(29,209,161,0.18)",marginBottom:5}}/>
      <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:8,color:C.dim,marginBottom:1}}>QTD.</div>
          <div style={{fontSize:17,fontWeight:800,color:C.accent,lineHeight:1}}>{box.qty}</div>
        </div>
        <div style={{textAlign:"right"}}>
          {box.updatedBy&&<div style={{fontSize:8,color:C.dim}}>{box.updatedBy}</div>}
          <div style={{fontSize:8,color:C.dim}}>{box.date}</div>
        </div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:"rgba(29,209,161,0.25)",borderRadius:"0 0 11px 11px"}}/>
    </div>
  );
}

// ─── BOX DETAIL MODAL ────────────────────────────────────────────────────────
function BoxDetailModal({box,product,floorNumber,bay,corridor,onEdit,onClose}){
  const hasProduct = !!product;
  return (
    <Modal onClose={onClose} title={`📦 SKU ${box.sku}`}>
      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          {icon:"📦",label:"Quantidade",val:box.qty},
          {icon:"📍",label:"Localização",val:`C${corridor.number} B${bay.number} A${floorNumber}`},
          {icon:"👤",label:"Atualizado",val:`${box.updatedBy||"—"} · ${box.date}`},
        ].map((s,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:9,color:C.muted,marginBottom:2}}>{s.label}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.text}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Product info */}
      <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:14}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:10,letterSpacing:"0.05em"}}>📋 DADOS DO PRODUTO</div>
        {hasProduct ? (
          <div style={{display:"grid",gap:8}}>
            {[
              {l:"Descrição",v:product.desc},
              {l:"Família",v:product.familia},
              {l:"Fornecedor",v:product.fornecedor},
              {l:"Unidade",v:product.um},
              {l:"Preço",v:product.preco?`R$ ${Number(product.preco).toFixed(2)}`:"—"},
              {l:"EAN / Cód. Barras",v:product.ean||"—"},
              {l:"Situação",v:product.situacao||"—"},
              {l:"Enfrentamento",v:product.dtaInicio&&product.dtaFim?`${product.dtaInicio} → ${product.dtaFim}`:"—"},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <span style={{fontSize:11,color:C.muted,flexShrink:0}}>{row.l}</span>
                <span style={{fontSize:11,color:C.text,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{row.v||"—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{fontSize:22,marginBottom:6}}>📭</div>
            <div style={{fontSize:12,color:C.muted}}>Produto não cadastrado ainda.</div>
            <div style={{fontSize:11,color:C.dim,marginTop:4}}>Vá em Produtos para cadastrar o SKU {box.sku}.</div>
          </div>
        )}
      </div>

      <button onClick={onEdit} style={{background:C.accentDim,border:`1px solid rgba(29,209,161,0.25)`,color:C.accent,borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,width:"100%"}}>
        ✏️ Editar Caixa
      </button>
    </Modal>
  );
}

// ─── BOX EDIT MODAL ──────────────────────────────────────────────────────────
function BoxEditModal({modal,products,onSave,onClose,onDelete}){
  const isEdit=modal.type==="edit";
  const [form,setForm]=useState(isEdit?{...modal.box}:{sku:"",qty:"",updatedBy:"",date:today()});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const product=products[form.sku];

  function submit(){
    if(!form.sku.trim()){alert("SKU é obrigatório!");return;}
    if(!form.qty||isNaN(Number(form.qty))){alert("Quantidade inválida!");return;}
    onSave({...form,qty:Number(form.qty),date:today()});
  }

  return (
    <Modal onClose={onClose} title={isEdit?"✏️ Editar Caixa":"📦 Nova Caixa"}>
      {isEdit&&<button onClick={onDelete} style={{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:"8px",fontSize:12,width:"100%",marginBottom:14}}>🗑 Excluir esta caixa</button>}
      <Lbl req>SKU</Lbl>
      <input value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="Ex: 1024276" autoFocus/>
      {product&&<div style={{marginTop:6,fontSize:11,color:C.accent,background:C.accentDim,borderRadius:8,padding:"6px 10px"}}>✓ {product.desc||"Produto cadastrado"}</div>}
      {form.sku&&!product&&<div style={{marginTop:6,fontSize:11,color:C.dim,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"}}>Produto não cadastrado — você pode cadastrá-lo depois em Produtos.</div>}
      <Gap/>
      <Row>
        <div><Lbl req>Quantidade</Lbl><input value={form.qty} onChange={e=>set("qty",e.target.value)} type="number" placeholder="10"/></div>
        <div><Lbl>Seu nome</Lbl><input value={form.updatedBy} onChange={e=>set("updatedBy",e.target.value)} placeholder="Ex: Caio"/></div>
      </Row>
      <SaveBtn onClick={submit}/>
    </Modal>
  );
}

// ─── PRODUCT MODAL ───────────────────────────────────────────────────────────
function ProductModal({product,onSave,onClose,onDelete}){
  const isEdit=!!product;
  const [form,setForm]=useState(isEdit?{...product}:{sku:"",desc:"",familia:"",fornecedor:"",um:"UN",preco:"",dtaInicio:"",dtaFim:"",ean:"",situacao:"Ativo"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function submit(){
    if(!form.sku.trim()){alert("SKU é obrigatório!");return;}
    onSave({...form,preco:Number(form.preco)||0});
  }
  return (
    <Modal onClose={onClose} title={isEdit?"✏️ Editar Produto":"➕ Cadastrar Produto"} wide>
      {isEdit&&<button onClick={onDelete} style={{background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",color:C.danger,borderRadius:8,padding:"8px",fontSize:12,width:"100%",marginBottom:14}}>🗑 Excluir produto do catálogo</button>}
      <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:"0.05em"}}>IDENTIFICAÇÃO</div>
      <Row>
        <div><Lbl req>SKU / Material</Lbl><input value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="Ex: 1026780" readOnly={isEdit} style={isEdit?{opacity:0.6}:{}}/></div>
        <div><Lbl>Unidade (UM)</Lbl>
          <select value={form.um} onChange={e=>set("um",e.target.value)} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:14,width:"100%"}}>
            {["UN","CX","KG","M","M²","L","PC","RL","BD","SC"].map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
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
      <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:"0.05em"}}>PREÇO E ENFRENTAMENTO</div>
      <Row>
        <div><Lbl>Preço (R$)</Lbl><input value={form.preco} onChange={e=>set("preco",e.target.value)} type="number" placeholder="9.73"/></div>
        <div><Lbl>Situação</Lbl>
          <select value={form.situacao} onChange={e=>set("situacao",e.target.value)} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:14,width:"100%"}}>
            {["Ativo","Inativo","Bloqueado","Em Falta"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Row>
      <Gap/>
      <Row>
        <div><Lbl>Dta Início Enfrentamento</Lbl><input value={form.dtaInicio} onChange={e=>set("dtaInicio",e.target.value)} placeholder="dd/mm/aaaa"/></div>
        <div><Lbl>Dta Fim Enfrentamento</Lbl><input value={form.dtaFim} onChange={e=>set("dtaFim",e.target.value)} placeholder="dd/mm/aaaa"/></div>
      </Row>
      <Gap/>
      <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:"0.05em"}}>CÓDIGO DE BARRAS</div>
      <Lbl>EAN / GTIN</Lbl>
      <input value={form.ean} onChange={e=>set("ean",e.target.value)} placeholder="Ex: 7899018416919"/>
      <SaveBtn onClick={submit}/>
    </Modal>
  );
}

// ─── PRODUCTS SCREEN ─────────────────────────────────────────────────────────
function ProductsScreen({products,onBack,onSaveProduct,onDeleteProduct}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const list=Object.values(products).filter(p=>
    !search||p.sku.includes(search)||p.desc.toLowerCase().includes(search.toLowerCase())||p.fornecedor?.toLowerCase().includes(search.toLowerCase())
  );
  function handleSave(form){
    onSaveProduct(form);
    setModal(null);
  }
  function handleDelete(){
    onDeleteProduct(modal.product.sku);
    setModal(null);
  }
  return (
    <div style={{background:C.bg,minHeight:"100vh"}}>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16}}>🗂 Catálogo de Produtos</div>
          <div style={{fontSize:11,color:C.muted}}>{Object.keys(products).length} produtos cadastrados</div>
        </div>
        <button onClick={()=>setModal({product:null})} style={{background:C.accent,border:"none",color:"#071e26",borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,flexShrink:0}}>+ Novo</button>
      </div>
      <div style={{padding:"12px 14px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por SKU, descrição ou fornecedor..."/>
        <Gap/>
        {list.length===0&&(
          <div style={{textAlign:"center",padding:"30px 0",color:C.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>{search?"Nenhum produto encontrado.":"Nenhum produto cadastrado ainda.\nToque em + Novo para começar."}</div>
          </div>
        )}
        {list.map(p=>(
          <div key={p.sku} onClick={()=>setModal({product:p})} className="ch fin"
            style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:8,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
              <Tag>{p.sku}</Tag>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {p.situacao&&<Tag bg="rgba(255,255,255,0.06)" color={p.situacao==="Ativo"?C.accent:C.danger}>{p.situacao}</Tag>}
                {p.um&&<Tag bg="rgba(255,255,255,0.06)" color={C.muted}>{p.um}</Tag>}
              </div>
            </div>
            {p.desc&&<div style={{fontSize:12,color:C.text,marginBottom:4,lineHeight:1.4}}>{p.desc}</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.familia&&<span style={{fontSize:10,color:C.dim}}>{p.familia}</span>}
              {p.fornecedor&&<span style={{fontSize:10,color:C.dim}}>· {p.fornecedor}</span>}
              {p.preco>0&&<span style={{fontSize:10,color:C.dim}}>· R$ {Number(p.preco).toFixed(2)}</span>}
            </div>
          </div>
        ))}
      </div>
      {modal&&<ProductModal product={modal.product} onSave={handleSave} onClose={()=>setModal(null)} onDelete={handleDelete}/>}
    </div>
  );
}

// ─── BAY SCREEN ──────────────────────────────────────────────────────────────
function BayScreen({bay,corridor,products,onBack,onUpdateBay}){
  const [modal,setModal]=useState(null);
  const [detailModal,setDetailModal]=useState(null);
  const dragRef=useRef(null);
  const [dragOverFloor,setDragOverFloor]=useState(null);
  const [draggingId,setDraggingId]=useState(null);
  const floors=[...bay.floors].sort((a,b)=>b.number-a.number);
  const totalBoxes=bay.floors.reduce((s,f)=>s+f.boxes.length,0);

  function updateFloors(newFloors){onUpdateBay({...bay,floors:renumberFloors(newFloors)});}
  function handleSave(form){
    const box=modal.type==="edit"?{...modal.box,...form}:{...form,id:genId()};
    updateFloors(bay.floors.map(f=>{
      if(modal.type==="add"&&f.id===modal.floorId)return{...f,boxes:[...f.boxes,box]};
      if(modal.type==="edit"&&f.id===modal.floorId)return{...f,boxes:f.boxes.map(b=>b.id===box.id?box:b)};
      return f;
    }));
    setModal(null);setDetailModal(null);
  }
  function handleDelete(){
    updateFloors(bay.floors.map(f=>f.id===modal.floorId?{...f,boxes:f.boxes.filter(b=>b.id!==modal.box.id)}:f));
    setModal(null);setDetailModal(null);
  }
  function handleDrop(toFloorId){
    const dr=dragRef.current;
    if(!dr||dr.fromFloorId===toFloorId){setDragOverFloor(null);setDraggingId(null);return;}
    updateFloors(bay.floors.map(f=>{
      if(f.id===dr.fromFloorId)return{...f,boxes:f.boxes.filter(b=>b.id!==dr.box.id)};
      if(f.id===toFloorId)return{...f,boxes:[...f.boxes,dr.box]};
      return f;
    }));
    dragRef.current=null;setDragOverFloor(null);setDraggingId(null);
  }

  return (
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:100,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>{corridor.mascot}</div>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{corridor.mascot} Aéreo — Bay {bay.number}</div>
          <div style={{fontSize:11,color:C.muted}}>{bay.side} · {bay.label} · Corredor {corridor.number}</div>
        </div>
        <Tag>{floors.length} and.</Tag>
        <Tag>{totalBoxes} cx.</Tag>
      </div>
      <div style={{padding:"14px 14px 80px"}}>
        {floors.map(floor=>(
          <div key={floor.id}
            className={dragOverFloor===floor.id?"floor-drop":""}
            onDragOver={e=>{e.preventDefault();setDragOverFloor(floor.id);}}
            onDragLeave={()=>setDragOverFloor(null)}
            onDrop={()=>handleDrop(floor.id)}
            style={{background:"rgba(0,0,0,0.25)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 10px 12px",marginBottom:10,transition:"border-color .15s,background .15s"}}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:"0.08em"}}>ANDAR {floor.number}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setModal({type:"add",floorId:floor.id})}
                  style={{background:C.accentDim,border:"1px solid rgba(29,209,161,0.25)",color:C.accent,borderRadius:7,padding:"2px 11px",fontSize:19,lineHeight:"1.2"}}>+</button>
                <button onClick={()=>{
                  if(floor.boxes.length>0){alert("Remova as caixas antes.");return;}
                  updateFloors(bay.floors.filter(f=>f.id!==floor.id));
                }} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:7,padding:"2px 8px",fontSize:12}}>✕</button>
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,minHeight:50}}>
              {floor.boxes.length===0&&<span style={{fontSize:11,color:C.dim,alignSelf:"center",padding:"4px 0"}}>Vazio — toque em + para adicionar</span>}
              {floor.boxes.map(box=>(
                <BoxCard key={box.id} box={box} mascot={corridor.mascot} product={products[box.sku]}
                  isDragging={draggingId===box.id}
                  onDragStart={()=>{dragRef.current={box,fromFloorId:floor.id};setDraggingId(box.id);}}
                  onDragEnd={()=>{dragRef.current=null;setDraggingId(null);setDragOverFloor(null);}}
                  onClick={()=>setDetailModal({box,floorId:floor.id,floorNumber:floor.number})}
                />
              ))}
            </div>
          </div>
        ))}
        <button onClick={()=>{
          const newFloors=renumberFloors([...bay.floors,{id:genId(),number:999,boxes:[]}]);
          onUpdateBay({...bay,floors:newFloors});
        }} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:12,padding:"11px",width:"100%",fontSize:13,marginTop:4}}>
          + Adicionar Andar
        </button>
      </div>
      {detailModal&&!modal&&(
        <BoxDetailModal
          box={detailModal.box}
          product={products[detailModal.box.sku]}
          floorNumber={detailModal.floorNumber}
          bay={bay} corridor={corridor}
          onEdit={()=>setModal({type:"edit",floorId:detailModal.floorId,box:detailModal.box})}
          onClose={()=>setDetailModal(null)}
        />
      )}
      {modal&&<BoxEditModal modal={modal} products={products} onSave={handleSave} onClose={()=>setModal(null)} onDelete={handleDelete}/>}
    </div>
  );
}

// ─── BAY MODAL ────────────────────────────────────────────────────────────────
function BayModal({bay,side,onSave,onClose}){
  const [label,setLabel]=useState(bay?.label||"");
  return (
    <Modal onClose={onClose} title={`${bay?"✏️ Editar":"➕ Novo"} Bay — ${side}`}>
      <Lbl req>Nome / Rótulo do Bay</Lbl>
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ex: Tintas Látex" autoFocus/>
      <SaveBtn onClick={()=>{if(!label.trim()){alert("Nome obrigatório!");return;}onSave(label.trim());}}/>
    </Modal>
  );
}

// ─── CORRIDOR SCREEN ──────────────────────────────────────────────────────────
function CorridorScreen({corridor,products,onBack,onUpdateCorridor}){
  const [selectedBay,setSelectedBay]=useState(null);
  const [bayModal,setBayModal]=useState(null);

  if(selectedBay){
    const bay=corridor.bays.find(b=>b.id===selectedBay);
    return <BayScreen bay={bay} corridor={corridor} products={products} onBack={()=>setSelectedBay(null)}
      onUpdateBay={updated=>onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===updated.id?updated:b)})}/>;
  }

  function getNextNum(side){const nums=corridor.bays.filter(b=>b.side===side).map(b=>b.number);return nums.length===0?1:Math.max(...nums)+1;}
  function handleBaySave(label){
    if(bayModal.bay){onUpdateCorridor({...corridor,bays:corridor.bays.map(b=>b.id===bayModal.bay.id?{...b,label}:b)});}
    else{const side=bayModal.side;onUpdateCorridor({...corridor,bays:[...corridor.bays,{id:genId(),number:getNextNum(side),side,label,floors:[{id:genId(),number:1,boxes:[]}]}]});}
    setBayModal(null);
  }
  function deleteBay(bayId){
    const bay=corridor.bays.find(b=>b.id===bayId);
    if(bay.floors.reduce((s,f)=>s+f.boxes.length,0)>0){alert("Remova todas as caixas antes de excluir o bay.");return;}
    onUpdateCorridor({...corridor,bays:corridor.bays.filter(b=>b.id!==bayId)});
  }

  const leftBays=corridor.bays.filter(b=>b.side==="Esquerdo").sort((a,b)=>a.number-b.number);
  const rightBays=corridor.bays.filter(b=>b.side==="Direito").sort((a,b)=>a.number-b.number);

  const BayCard=({bay})=>{
    const total=bay.floors.reduce((s,f)=>s+f.boxes.length,0);
    return (
      <div className="fin" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",right:-2,bottom:-4,fontSize:38,opacity:0.07,pointerEvents:"none",lineHeight:1}}>{corridor.mascot}</div>
        {/* Top action bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px 6px",borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
          <Tag>{`Bay ${bay.number}`}</Tag>
          <div style={{display:"flex",gap:4}}>
            <button onClick={e=>{e.stopPropagation();setBayModal({side:bay.side,bay});}}
              style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"3px 8px",fontSize:11,zIndex:2}}>✏️</button>
            <button onClick={e=>{e.stopPropagation();deleteBay(bay.id);}}
              style={{background:"none",border:"1px solid rgba(255,107,107,0.2)",color:C.danger,borderRadius:6,padding:"3px 8px",fontSize:11,zIndex:2}}>🗑</button>
          </div>
        </div>
        {/* Clickable body */}
        <div onClick={()=>setSelectedBay(bay.id)} className="ch"
          style={{padding:"10px 10px 12px",cursor:"pointer",position:"relative"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8,color:C.text}}>{bay.label}</div>
          <Tag>{`${total} cx · ${bay.floors.length} and. ›`}</Tag>
        </div>
      </div>
    );
  };

  return (
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>{corridor.mascot}</div>
      <div style={{padding:"16px 16px 12px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,background:C.bg,zIndex:10,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 4px 0 0"}}>←</button>
        <div>
          <div style={{fontWeight:700,fontSize:17}}>{corridor.mascot} Corredor {corridor.number}</div>
          <div style={{fontSize:11,color:C.muted}}>{corridor.name}</div>
        </div>
      </div>
      <div style={{padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <span style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:"0.05em"}}>◉ ESQUERDO</span>
          <span style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:"0.05em",textAlign:"right"}}>DIREITO ◉</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div>
            {leftBays.map(b=><BayCard key={b.id} bay={b}/>)}
            <button onClick={()=>setBayModal({side:"Esquerdo",bay:null})}
              style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"9px",width:"100%",fontSize:12,marginBottom:8}}>+ Bay Esq.</button>
          </div>
          <div>
            {rightBays.map(b=><BayCard key={b.id} bay={b}/>)}
            <button onClick={()=>setBayModal({side:"Direito",bay:null})}
              style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"9px",width:"100%",fontSize:12,marginBottom:8}}>+ Bay Dir.</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4,paddingTop:8,borderTop:`1px solid rgba(255,255,255,0.07)`}}>
          <span style={{fontSize:11,color:C.dim,textAlign:"center"}}>{leftBays.length} bays à esq.</span>
          <span style={{fontSize:11,color:C.dim,textAlign:"center"}}>{rightBays.length} bays à dir.</span>
        </div>
      </div>
      {bayModal&&<BayModal bay={bayModal.bay} side={bayModal.side} onSave={handleBaySave} onClose={()=>setBayModal(null)}/>}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({data,onSelectCorridor,onOpenProducts}){
  const [search,setSearch]=useState("");
  const results=search.trim().length>=3
    ? data.corridors.flatMap(corridor=>corridor.bays.flatMap(bay=>bay.floors.flatMap(floor=>
        floor.boxes.filter(box=>box.sku.includes(search.trim()))
          .map(box=>({box,floor,bay,corridor,product:data.products[box.sku]}))
      )))
    : [];
  return (
    <div style={{background:C.bg,minHeight:"100vh",position:"relative"}}>
      <div style={{position:"fixed",bottom:20,right:20,fontSize:90,opacity:0.04,pointerEvents:"none",zIndex:0,lineHeight:1}}>📦</div>
      <div style={{padding:"22px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
          <div style={{fontWeight:800,fontSize:22}}>📦 Estoque Aéreo</div>
          <button onClick={onOpenProducts} style={{background:C.accentDim,border:`1px solid rgba(29,209,161,0.25)`,color:C.accent,borderRadius:9,padding:"6px 12px",fontWeight:700,fontSize:12}}>🗂 Produtos</button>
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Visão de cima · Toque para explorar</div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Buscar por SKU (mín. 3 dígitos)..."
          style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,width:"100%"}}/>
      </div>
      <div style={{padding:"16px 16px 40px"}}>
        {search.trim().length>=3?(
          <>
            <div style={{fontSize:12,color:C.muted,marginBottom:10,fontWeight:600}}>{results.length} resultado(s) para "{search.trim()}"</div>
            {results.length===0&&(
              <div style={{background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:12,padding:"14px",color:C.danger,fontSize:13}}>
                Nenhum produto encontrado no aéreo com esse SKU.
              </div>
            )}
            {results.map((r,i)=>(
              <div key={i} className="fin" style={{background:"rgba(29,209,161,0.06)",border:"1px solid rgba(29,209,161,0.2)",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:800,fontSize:16,color:C.accent}}>{r.box.sku}</span>
                  <span style={{fontWeight:700,fontSize:14}}>Qtd: {r.box.qty}</span>
                </div>
                {r.product?.desc&&<div style={{fontSize:12,color:C.text,marginBottom:4}}>{r.product.desc}</div>}
                {(r.product?.fornecedor||r.product?.familia)&&<div style={{fontSize:11,color:C.muted,marginBottom:6}}>{r.product.familia}{r.product.fornecedor&&` · ${r.product.fornecedor}`}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {[`${r.corridor.mascot} Corredor ${r.corridor.number}`,`Bay ${r.bay.number} · ${r.bay.side}`,`Andar ${r.floor.number}`,r.box.updatedBy&&`${r.box.updatedBy} · ${r.box.date}`].filter(Boolean).map((t,j)=>(
                    <span key={j} style={{fontSize:10,color:C.dim,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"2px 7px"}}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        ):(
          <>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>CORREDORES</div>
            {data.corridors.map(corridor=>{
              const totalBoxes=corridor.bays.reduce((s,b)=>s+b.floors.reduce((s2,f)=>s2+f.boxes.length,0),0);
              return (
                <div key={corridor.id} onClick={()=>onSelectCorridor(corridor.id)} className="ch fin"
                  style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",right:-4,bottom:-4,fontSize:42,opacity:0.07,pointerEvents:"none",lineHeight:1}}>{corridor.mascot}</div>
                  <span style={{background:C.accentDim,color:C.accent,borderRadius:9,padding:"6px 9px",fontSize:15,fontWeight:800,minWidth:38,textAlign:"center",flexShrink:0}}>{corridor.number}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{corridor.name}</div>
                    <div style={{fontSize:11,color:C.dim,marginTop:2}}>{corridor.bays.length} bays · {totalBoxes} caixas</div>
                  </div>
                  <span style={{fontSize:22,flexShrink:0}}>{corridor.mascot}</span>
                  <span style={{color:C.dim,fontSize:18,flexShrink:0}}>›</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [data,setData]=useState(null);
  const [screen,setScreen]=useState({type:"home"});

  useEffect(()=>{loadPersisted().then(saved=>setData(saved||INITIAL));},[]);
  useEffect(()=>{if(data)persist(data);},[data]);

  if(!data)return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:15}}>Carregando...</div>;

  function updateCorridor(updated){setData(d=>({...d,corridors:d.corridors.map(c=>c.id===updated.id?updated:c)}));}
  function saveProduct(product){setData(d=>({...d,products:{...d.products,[product.sku]:product}}));}
  function deleteProduct(sku){setData(d=>{const p={...d.products};delete p[sku];return{...d,products:p};});}

  return (
    <>
      <style>{css}</style>
      {screen.type==="home"&&(
        <HomeScreen data={data}
          onSelectCorridor={id=>setScreen({type:"corridor",id})}
          onOpenProducts={()=>setScreen({type:"products"})}/>
      )}
      {screen.type==="corridor"&&(()=>{
        const corridor=data.corridors.find(c=>c.id===screen.id);
        return <CorridorScreen corridor={corridor} products={data.products} onBack={()=>setScreen({type:"home"})} onUpdateCorridor={updateCorridor}/>;
      })()}
      {screen.type==="products"&&(
        <ProductsScreen products={data.products} onBack={()=>setScreen({type:"home"})} onSaveProduct={saveProduct} onDeleteProduct={deleteProduct}/>
      )}
    </>
  );
}

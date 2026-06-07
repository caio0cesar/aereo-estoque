export const genId = () => Math.random().toString(36).slice(2,9);

// Exibição: dd/mm/aaaa — usado na UI
export const todayFull = () => { const d=new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); };

// Formata input do usuário para dd/mm/aaaa enquanto digita
export const fmtDate = raw => { const d=raw.replace(/\D/g,"").slice(0,8); if(d.length<=2)return d; if(d.length<=4)return d.slice(0,2)+"/"+d.slice(2); return d.slice(0,2)+"/"+d.slice(2,4)+"/"+d.slice(4); };

// Converte dd/mm/aaaa → aaaa-mm-dd para salvar no banco
export const toISO = str => { if(!str||str.length<10) return null; const p=str.split("/"); if(p.length!==3) return null; return p[2]+"-"+p[1]+"-"+p[0]; };

// Converte aaaa-mm-dd → dd/mm/aaaa para exibir na UI
export const fromISO = str => { if(!str||str.length<10) return ""; const p=str.split("-"); if(p.length!==3) return ""; return p[2]+"/"+p[1]+"/"+p[0]; };

// Calcula vencimento: recebe e retorna dd/mm/aaaa
export const calcVenc = (fab,m) => { const p=fab.split("/"); if(p.length!==3)return""; const d=new Date(+p[2],+p[1]-1,+p[0]); if(isNaN(d))return""; d.setMonth(d.getMonth()+Number(m)); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); };
export const parsePrice = v => parseFloat(String(v).replace(",","."))||0;
export const renumberFloors = floors => [...floors].sort((a,b)=>a.number-b.number).map((f,i)=>({...f,number:i+1}));
export const findBySku = (sku,corridors) => { const res=[]; (corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{ if(box.sku===sku) res.push({box,fl,bay,cor}); })))); return res; };

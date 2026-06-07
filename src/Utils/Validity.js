export function getValidity(dateStr) {
  if(!dateStr||dateStr.length<10) return null;
  // aceita aaaa-mm-dd (banco) ou dd/mm/aaaa (legado)
  let exp;
  if(dateStr.includes("-")) {
    exp=new Date(dateStr+"T00:00:00");
  } else {
    const p=dateStr.split("/"); if(p.length!==3) return null;
    exp=new Date(+p[2],+p[1]-1,+p[0]);
  }
  if(isNaN(exp)) return null;
  const now=new Date(); now.setHours(0,0,0,0);
  const days=Math.floor((exp-now)/86400000);
  if(days>90) return {days,color:"#1dd1a1",label:"OK"};
  if(days>60) return {days,color:"#ffd166",label:"Atenção"};
  if(days>30) return {days,color:"#ff9f43",label:"Urgente"};
  return {days,color:"#ff6b6b",label:days<0?"Vencido":"Crítico"};
}

export function getAllExpiring(data) {
  const res=[];
  (data.corridors||[]).forEach(cor=>(cor.bays||[]).forEach(bay=>(bay.floors||[]).forEach(fl=>(fl.boxes||[]).forEach(box=>{
    if(!box.validade) return;
    const v=getValidity(box.validade);
    if(v&&v.days<=90) res.push({box,fl,bay,cor,v,product:(data.products||{})[box.sku]});
  }))));
  return res.sort((a,b)=>a.v.days-b.v.days);
}

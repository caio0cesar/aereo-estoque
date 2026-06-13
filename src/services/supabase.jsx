import { fromISO } from "../utils/dates.jsx";

const SUPA_URL = "https://crhknonvxsvxaxvwfdjs.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaGtub252eHN2eGF4dndmZGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODMzMjAsImV4cCI6MjA5NTE1OTMyMH0.UdfXAFt4ZeM3uAmQG2oZhpUO6K3mwffg0Lfg_USlHWM";

async function refreshSession() {
  const session = getSession();
  if(!session||!session.refresh_token) return null;
  try {
    const res = await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token", {
      method:"POST",
      headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({refresh_token:session.refresh_token}),
    });
    if(!res.ok) { saveSession(null); return null; }
    const data = await res.json();
    saveSession(data);
    return data;
  } catch { return null; }
}

function isTokenExpiringSoon(session) {
  if(!session||!session.expires_at) return true;
  const expiresAt = session.expires_at * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() > expiresAt - fiveMinutes;
}

export async function sbFetch(path, options={}) {
  let session = getSession();
  if(session && isTokenExpiringSoon(session)) {
    const refreshed = await refreshSession();
    if(refreshed) session = refreshed;
    else { saveSession(null); throw new Error("Sessão expirada. Faça login novamente."); }
  }
  const headers = {
    "apikey": SUPA_KEY,
    "Content-Type": "application/json",
    ...(session ? {"Authorization":"Bearer "+session.access_token} : {"Authorization":"Bearer "+SUPA_KEY}),
    ...options.headers,
  };
  const res = await fetch(SUPA_URL+path, {...options, headers});
  if(!res.ok) { const err=await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function getSession() {
  try { const s=localStorage.getItem("sb_session"); return s?JSON.parse(s):null; } catch { return null; }
}
export function saveSession(s) {
  try {
    if(!s) localStorage.removeItem("sb_session");
    else localStorage.setItem("sb_session", JSON.stringify(s));
  } catch {}
}

export async function signIn(email, password) {
  const res = await fetch(SUPA_URL+"/auth/v1/token?grant_type=password", {
    method:"POST",
    headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password}),
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error_description||data.msg||"Erro ao fazer login");
  saveSession(data);
  return data;
}

export async function resetPassword(email) {
  const res = await fetch(SUPA_URL+"/auth/v1/recover", {
    method:"POST",
    headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email}),
  });
  if(!res.ok) { const d=await res.json(); throw new Error(d.error_description||d.msg||"Erro ao enviar email"); }
  return true;
}

export async function signOut() {
  const session = getSession();
  if(session) {
    await fetch(SUPA_URL+"/auth/v1/logout", {
      method:"POST",
      headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+session.access_token},
    }).catch(()=>{});
  }
  saveSession(null);
}

export async function getProfile() {
  const data = await sbFetch("/rest/v1/profiles?select=*&limit=1");
  return data&&data[0] ? data[0] : null;
}

export const db = {
  async sectors()     { return sbFetch("/rest/v1/sectors?select=*&order=name"); },
  async corridors()   { return sbFetch("/rest/v1/corridors?select=*&order=number"); },
  async bays()        { return sbFetch("/rest/v1/bays?select=*&order=number"); },
  async floors()      { return sbFetch("/rest/v1/floors?select=*&order=number"); },
  async boxes()       { return sbFetch("/rest/v1/boxes?select=*"); },
  async products()    { return sbFetch("/rest/v1/products?select=*&order=sku"); },

  async upsertSector(s)   { return sbFetch("/rest/v1/sectors",   {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(s)}); },
  async deleteSector(id)  { return sbFetch("/rest/v1/sectors?id=eq."+id,  {method:"DELETE"}); },
  async upsertCorridor(c) { return sbFetch("/rest/v1/corridors", {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(c)}); },
  async deleteCorridor(id){ return sbFetch("/rest/v1/corridors?id=eq."+id,{method:"DELETE"}); },
  async upsertBay(b)      { return sbFetch("/rest/v1/bays",      {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(b)}); },
  async deleteBay(id)     { return sbFetch("/rest/v1/bays?id=eq."+id,     {method:"DELETE"}); },
  async upsertFloor(f)    { return sbFetch("/rest/v1/floors",    {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(f)}); },
  async deleteFloor(id)   { return sbFetch("/rest/v1/floors?id=eq."+id,   {method:"DELETE"}); },
  async upsertBox(b)      { return sbFetch("/rest/v1/boxes",     {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(b)}); },
  async deleteBox(id)     { return sbFetch("/rest/v1/boxes?id=eq."+id,    {method:"DELETE"}); },
  async upsertProduct(p)  { return sbFetch("/rest/v1/products",  {method:"POST",headers:{"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(p)}); },
  async deleteProduct(sku){ return sbFetch("/rest/v1/products?sku=eq."+sku,{method:"DELETE"}); },
};

export async function loadFromSupabase() {
  const [sectors,corridors,bays,floors,boxes,products] = await Promise.all([
    db.sectors(),db.corridors(),db.bays(),db.floors(),db.boxes(),db.products(),
  ]);
  const productsMap = {};
  (products||[]).forEach(p => {
    productsMap[p.sku] = {
      sku:p.sku, desc:p.description, familia:p.familia,
      fornecedor:p.fornecedor, um:p.um, preco:p.preco?String(p.preco):"",
      dtaInicio:p.dta_inicio||"", dtaFim:p.dta_fim||"",
      ean:p.ean||"", situacao:p.situacao||"NN",
    };
  });
  const floorsWithBoxes = (floors||[]).map(f => ({
    id:f.id, number:f.number,
    boxes:(boxes||[]).filter(b=>b.floor_id===f.id).map(b=>({
      id:b.id, sku:b.sku, qty:b.qty,
      updatedBy:b.updated_by||"", date:fromISO(b.date)||"",
      validade:fromISO(b.validade)||"", stackId:b.stack_id||null, stackOrder:b.stack_order||0, slotIndex:b.slot_index!=null?b.slot_index:null,
    })),
  }));
  const baysWithFloors = (bays||[]).map(b => ({
    id:b.id, number:b.number, side:b.side, label:b.label,
    floors:floorsWithBoxes.filter(f=>(floors||[]).find(fl=>fl.id===f.id&&fl.bay_id===b.id)),
  }));
  const corridorsWithBays = (corridors||[]).map(c => ({
    id:c.id, sectorId:c.sector_id, number:c.number,
    bays:baysWithFloors.filter(b=>(bays||[]).find(ba=>ba.id===b.id&&ba.corridor_id===c.id)),
  }));
  return {
    sectors:(sectors||[]).map(s=>({id:s.id,name:s.name,mascot:s.mascot})),
    corridors:corridorsWithBays,
    products:productsMap,
  };
}

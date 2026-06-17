import { createClient } from "@supabase/supabase-js";
import { fromISO } from "../utils/dates.jsx";

const SUPA_URL = "https://crhknonvxsvxaxvwfdjs.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaGtub252eHN2eGF4dndmZGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODMzMjAsImV4cCI6MjA5NTE1OTMyMH0.UdfXAFt4ZeM3uAmQG2oZhpUO6K3mwffg0Lfg_USlHWM";

export const supabase = createClient(SUPA_URL, SUPA_KEY);

// --- Auth ---
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw new Error(error.message || "Email ou senha incorretos.");
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if(error) throw new Error(error.message || "Erro ao enviar email.");
  return true;
}

export async function signUp(email, password, name, sectorId) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, sector_id: sectorId } }
  });
  if(error) throw new Error(error.message || "Erro ao criar conta.");
  return data;
}

export async function getSectorsPublic() {
  const { data, error } = await supabase.from("sectors").select("id,name,mascot").order("name");
  if(error) return [];
  return data||[];
}

export async function getMyRequests() {
  const { data, error } = await supabase.from("change_requests").select("*").eq("status","pending");
  if(error) return [];
  return data||[];
}

export async function createRequest(type, currentValue, requestedValue) {
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) throw new Error("Não autenticado.");
  const { error } = await supabase.from("change_requests").insert({
    user_id: user.id,
    type,
    current_value: currentValue,
    requested_value: requestedValue,
  });
  if(error) throw new Error(error.message);
  return true;
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if(error) return null;
  return data;
}

// --- Helpers ---
async function query(builder) {
  const { data, error } = await builder;
  if(error) throw new Error(error.message);
  return data;
}
async function mutate(builder) {
  const { error } = await builder;
  if(error) throw new Error(error.message);
  return true;
}

// --- DB ---
export const db = {
  async sectors()     { return query(supabase.from("sectors").select("*").order("name")); },
  async corridors()   { return query(supabase.from("corridors").select("*").order("number")); },
  async bays()        { return query(supabase.from("bays").select("*").order("number")); },
  async floors()      { return query(supabase.from("floors").select("*").order("number")); },
  async boxes()       { return query(supabase.from("boxes").select("*")); },
  async products()    { return query(supabase.from("products").select("*").order("sku")); },

  async upsertSector(s)   { return mutate(supabase.from("sectors").upsert(s)); },
  async deleteSector(id)  { return mutate(supabase.from("sectors").delete().eq("id",id)); },
  async upsertCorridor(c) { return mutate(supabase.from("corridors").upsert(c)); },
  async deleteCorridor(id){ return mutate(supabase.from("corridors").delete().eq("id",id)); },
  async upsertBay(b)      { return mutate(supabase.from("bays").upsert(b)); },
  async deleteBay(id)     { return mutate(supabase.from("bays").delete().eq("id",id)); },
  async upsertFloor(f)    { return mutate(supabase.from("floors").upsert(f)); },
  async deleteFloor(id)   { return mutate(supabase.from("floors").delete().eq("id",id)); },
  async upsertBox(b)      { return mutate(supabase.from("boxes").upsert(b)); },
  async deleteBox(id)     { return mutate(supabase.from("boxes").delete().eq("id",id)); },
  async upsertProduct(p)  { return mutate(supabase.from("products").upsert(p)); },
  async deleteProduct(sku){ return mutate(supabase.from("products").delete().eq("sku",sku)); },
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

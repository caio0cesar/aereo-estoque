-- ============================================================
-- ESTOQUE AÉREO — Schema completo e final
-- ============================================================

-- Função auxiliar para verificar admin (evita recursão nas policies)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Perfis de usuário (admin ou colaborador)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'colaborador' check (role in ('admin', 'colaborador'))
);
alter table public.profiles enable row level security;
create policy "Usuário vê próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Admin vê todos perfis" on public.profiles
  for select using (public.is_admin());

-- Setores
create table public.sectors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mascot text not null default '📦',
  created_at timestamptz default now()
);
alter table public.sectors enable row level security;
create policy "Todos leem setores" on public.sectors
  for select using (auth.uid() IS NOT NULL);
create policy "Admin gerencia setores" on public.sectors
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Corredores
create table public.corridors (
  id uuid default gen_random_uuid() primary key,
  sector_id uuid references public.sectors on delete cascade not null,
  number integer not null,
  created_at timestamptz default now()
);
alter table public.corridors enable row level security;
create policy "Todos leem corredores" on public.corridors
  for select using (auth.uid() IS NOT NULL);
create policy "Admin gerencia corredores" on public.corridors
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bays
create table public.bays (
  id uuid default gen_random_uuid() primary key,
  corridor_id uuid references public.corridors on delete cascade not null,
  number integer not null,
  side text not null check (side in ('Esquerdo', 'Direito')),
  label text not null,
  created_at timestamptz default now()
);
alter table public.bays enable row level security;
create policy "Todos leem bays" on public.bays
  for select using (auth.uid() IS NOT NULL);
create policy "Admin gerencia bays" on public.bays
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Andares
create table public.floors (
  id uuid default gen_random_uuid() primary key,
  bay_id uuid references public.bays on delete cascade not null,
  number integer not null,
  created_at timestamptz default now()
);
alter table public.floors enable row level security;
create policy "Todos leem andares" on public.floors
  for select using (auth.uid() IS NOT NULL);
create policy "Admin gerencia andares" on public.floors
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Caixas
create table public.boxes (
  id uuid default gen_random_uuid() primary key,
  floor_id uuid references public.floors on delete cascade not null,
  sku text not null,
  qty integer not null default 0,
  updated_by text,
  date date,
  validade date,
  stack_id text,
  stack_order integer default 0,
  slot_index integer default 0,
  created_at timestamptz default now()
);
alter table public.boxes enable row level security;
create policy "Todos leem caixas" on public.boxes
  for select using (auth.uid() IS NOT NULL);
create policy "Autenticados gerenciam caixas" on public.boxes
  for all
  using (auth.uid() IS NOT NULL)
  with check (auth.uid() IS NOT NULL);

-- Produtos
create table public.products (
  sku text primary key,
  description text,
  familia text,
  fornecedor text,
  um text default 'UN',
  preco numeric(10,2),
  dta_inicio text,
  dta_fim text,
  ean text,
  situacao text default 'NN',
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "Todos leem produtos" on public.products
  for select using (auth.uid() IS NOT NULL);
create policy "Autenticados gerenciam produtos" on public.products
  for all
  using (auth.uid() IS NOT NULL)
  with check (auth.uid() IS NOT NULL);

-- Função para criar perfil automático ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'colaborador');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

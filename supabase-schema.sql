-- ============================================================
-- PlumberPro schema — per-login data isolation
-- Run this once in the Supabase SQL editor (SQL Editor → New query → paste → Run)
-- ============================================================
-- Every table has owner_id = the logged-in user. Row Level Security makes each
-- account see ONLY its own rows. A brand-new login starts with zero rows.

-- ---------- CUSTOMERS (includes leads; status carries the lifecycle) ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  phone text not null,
  name text,
  email text,
  address text,
  source text,
  notes text,
  status text not null default 'new'
    check (status in ('new','contacted','quoted','active','repeat','lost')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- JOBS ----------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  address text default '',
  phone text default '',
  job_type text not null,
  estimated_duration int not null default 0,
  assigned_to uuid,                       -- kept for compatibility; = owner for now
  status text not null default 'scheduled'
    check (status in ('scheduled','en_route','in_progress','completed','cancelled')),
  scheduled_start timestamptz not null,
  notes text,
  created_by uuid,
  created_at timestamptz default now()
);

-- ---------- INVOICES ----------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  invoice_number text not null,
  customer_name text not null,
  customer_email text,
  customer_address text,
  job_id uuid references jobs(id) on delete set null,
  line_items jsonb not null default '[]',
  tax_rate numeric not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft','sent','paid')),
  issued_date date not null,
  due_date date not null,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);

-- ---------- PERMITS (answers + documents stored as JSON to match the app) ----------
create table permits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  reference text not null,
  city text not null,
  category text,
  work_type text,
  status text not null default 'draft',
  screening text,
  answers jsonb not null default '{}',
  documents jsonb not null default '[]',
  forwarded_at timestamptz,
  forwarded_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security: each account only touches its own rows
-- ============================================================
alter table customers enable row level security;
alter table jobs      enable row level security;
alter table invoices  enable row level security;
alter table permits   enable row level security;

-- One policy per table covering select/insert/update/delete
create policy "own_customers" on customers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own_jobs" on jobs for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own_invoices" on invoices for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own_permits" on permits for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Helpful indexes
create index on customers (owner_id);
create index on jobs (owner_id, scheduled_start);
create index on invoices (owner_id, issued_date);
create index on permits (owner_id);

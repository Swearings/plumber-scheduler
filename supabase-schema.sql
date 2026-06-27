-- Run this in Supabase SQL editor

-- Profiles table (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('dispatcher', 'technician')),
  color text default '#3b82f6',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'technician');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Jobs table
create table jobs (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  address text not null,
  phone text not null,
  job_type text not null,
  estimated_duration int not null default 60, -- minutes
  assigned_to uuid references profiles(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'en_route', 'in_progress', 'completed', 'cancelled')),
  scheduled_start timestamptz not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Invoices table
create table invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text not null,
  customer_name text not null,
  customer_email text,
  customer_address text,
  job_id uuid references jobs(id) on delete set null,
  line_items jsonb not null default '[]',
  tax_rate numeric not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  issued_date date not null,
  due_date date not null,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table invoices enable row level security;

-- Invoices: dispatchers manage all (extend as needed for technicians)
create policy "invoices_dispatcher_all" on invoices
  using (exists (select 1 from profiles where id = auth.uid() and role = 'dispatcher'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'dispatcher'));

-- Profiles: everyone can read, only owner can update their own
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Jobs: dispatcher sees all, technician sees their own
create policy "jobs_dispatcher_all" on jobs
  using (exists (select 1 from profiles where id = auth.uid() and role = 'dispatcher'));

create policy "jobs_technician_select" on jobs for select
  using (assigned_to = auth.uid());

create policy "jobs_technician_insert" on jobs for insert
  with check (assigned_to = auth.uid() or exists (
    select 1 from profiles where id = auth.uid() and role = 'dispatcher'
  ));

create policy "jobs_technician_update" on jobs for update
  using (assigned_to = auth.uid() or exists (
    select 1 from profiles where id = auth.uid() and role = 'dispatcher'
  ));

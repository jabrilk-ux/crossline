create table public.permits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  state_code char(2) not null,
  permit_type text not null, -- 'resident' | 'non-resident'
  expiry_date date,
  created_at timestamptz default now()
);

alter table public.permits enable row level security;

create policy "Users can view own permits"
  on public.permits for select
  using (auth.uid() = user_id);

create policy "Users can insert own permits"
  on public.permits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own permits"
  on public.permits for update
  using (auth.uid() = user_id);

create policy "Users can delete own permits"
  on public.permits for delete
  using (auth.uid() = user_id);

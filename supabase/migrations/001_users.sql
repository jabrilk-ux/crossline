create table public.users (
  id uuid primary key references auth.users(id),
  home_state char(2),
  carry_purpose text check (carry_purpose in ('ccw', 'transport', 'hunting')),
  firearm_type text check (firearm_type in ('handgun', 'rifle', 'shotgun', 'all')),
  mag_capacity int,
  has_suppressor boolean default false,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own record"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own record"
  on public.users for update
  using (auth.uid() = id);

create table public.crossing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  from_state char(2),
  to_state char(2) not null,
  crossed_at timestamptz default now(),
  notification_id text
);

alter table public.crossing_events enable row level security;

create policy "Users can view own crossing events"
  on public.crossing_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own crossing events"
  on public.crossing_events for insert
  with check (auth.uid() = user_id);

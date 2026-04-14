create table public.state_laws (
  id uuid primary key default gen_random_uuid(),
  state_code char(2) not null,
  category text not null,
    -- carry | transport | reciprocity | magazine | duty_to_inform
    -- prohibited_locations | use_of_force | ammo | storage
  plain_english text not null,
  statute_reference text,
  statute_url text,
  effective_date date,
  last_verified timestamptz,
  last_scraped timestamptz,
  scrape_source_url text,
  carry_status text check (carry_status in ('allowed', 'restricted', 'prohibited')),
  permit_filter text[], -- e.g. ['resident', 'non-resident', 'permitless']
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.state_laws enable row level security;

create policy "Authenticated users can read state laws"
  on public.state_laws for select
  to authenticated
  using (true);

-- Only service role can insert/update/delete (via scraper pipeline)

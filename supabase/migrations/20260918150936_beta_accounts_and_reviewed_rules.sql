-- Publish only human-reviewed, current summaries. A subsequent scrape invalidates review.
alter policy "Authenticated users can read state laws" on public.state_laws
using (not flagged and last_verified is not null
  and last_verified >= coalesce(last_scraped, '-infinity'::timestamptz)
  and last_verified >= now() - interval '90 days'
  and statute_url like 'https://%'
  and (effective_date is null or effective_date <= current_date));

create table public.carry_rules (
  id uuid primary key default gen_random_uuid(),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  home_state text check (home_state ~ '^[A-Z]{2}$'),
  permit_state text check (permit_state ~ '^[A-Z]{2}$'),
  permit_type text check (permit_type in ('resident', 'non-resident')),
  permitless boolean not null default false,
  firearm_type text not null check (firearm_type in ('handgun','rifle','shotgun')),
  carry_purpose text not null check (carry_purpose in ('ccw','transport','hunting')),
  max_mag_capacity integer check (max_mag_capacity > 0),
  suppressor_allowed boolean not null default false,
  status text not null check (status in ('allowed','restricted','prohibited')),
  explanation text not null,
  source_url text not null check (source_url like 'https://%'),
  effective_date date not null,
  expires_on date not null,
  reviewed_at timestamptz,
  published boolean not null default false,
  check (expires_on >= effective_date),
  check (permitless or (permit_state is not null and permit_type is not null))
);
alter table public.carry_rules enable row level security;
create policy "Read current reviewed carry rules" on public.carry_rules for select to authenticated
using (published and reviewed_at >= now() - interval '90 days' and effective_date <= current_date and expires_on >= current_date);
revoke all on public.carry_rules from anon, authenticated;
grant select on public.carry_rules to authenticated;
grant all on public.carry_rules to service_role;
create index carry_rules_state_idx on public.carry_rules (state_code);

-- Keep onboarding atomic and retryable: profile and permit stack commit together.
create function public.save_onboarding(profile jsonb, permits jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if profile->>'home_state' !~ '^[A-Z]{2}$' or profile->>'home_state' is null then raise exception 'Choose a home state'; end if;
  if jsonb_array_length(permits) > 50 then raise exception 'Too many permits'; end if;
  insert into public.users(id, home_state, carry_purpose, firearm_type, mag_capacity, has_suppressor)
  values(owner_id, profile->>'home_state', profile->>'carry_purpose', profile->>'firearm_type', (profile->>'mag_capacity')::int, (profile->>'has_suppressor')::boolean)
  on conflict(id) do update set home_state=excluded.home_state, carry_purpose=excluded.carry_purpose, firearm_type=excluded.firearm_type, mag_capacity=excluded.mag_capacity, has_suppressor=excluded.has_suppressor;
  delete from public.permits where user_id = owner_id;
  insert into public.permits(user_id,state_code,permit_type,expiry_date)
  select owner_id, p->>'state_code', p->>'permit_type', nullif(p->>'expiry_date','')::date from jsonb_array_elements(permits) p;
end $$;
revoke all on function public.save_onboarding(jsonb,jsonb) from public, anon;
grant execute on function public.save_onboarding(jsonb,jsonb) to authenticated;
alter table public.permits add constraint permits_valid_type check (permit_type in ('resident','non-resident'));
alter table public.permits add constraint permits_valid_state check (state_code ~ '^[A-Z]{2}$');
alter table public.users add constraint users_mag_positive check (mag_capacity > 0);
alter table public.users drop constraint users_id_fkey;
alter table public.users add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;
grant delete on public.crossing_events to authenticated;
create policy "Users can delete own crossing events" on public.crossing_events for delete to authenticated using ((select auth.uid()) = user_id);

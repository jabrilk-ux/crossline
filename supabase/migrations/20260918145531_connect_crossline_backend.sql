-- Explicit Data API privileges and ownership checks for the mobile application.
revoke all on public.users, public.permits, public.crossing_events, public.state_laws from anon, authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.permits to authenticated;
grant select, insert on public.crossing_events to authenticated;
grant select on public.state_laws to authenticated;
grant all on public.users, public.permits, public.crossing_events, public.state_laws to service_role;

alter policy "Users can view own record" on public.users to authenticated using ((select auth.uid()) = id);
alter policy "Users can insert own record" on public.users to authenticated with check ((select auth.uid()) = id);
alter policy "Users can update own record" on public.users to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "Users can view own permits" on public.permits to authenticated using ((select auth.uid()) = user_id);
alter policy "Users can insert own permits" on public.permits to authenticated with check ((select auth.uid()) = user_id);
alter policy "Users can update own permits" on public.permits to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can delete own permits" on public.permits to authenticated using ((select auth.uid()) = user_id);
alter policy "Users can view own crossing events" on public.crossing_events to authenticated using ((select auth.uid()) = user_id);
alter policy "Users can insert own crossing events" on public.crossing_events to authenticated with check ((select auth.uid()) = user_id);

-- Required by the scraper's onConflict: 'state_code,category'.
create unique index state_laws_state_category_key on public.state_laws (state_code, category);
create index permits_user_id_idx on public.permits (user_id);
create index crossing_events_user_id_idx on public.crossing_events (user_id);

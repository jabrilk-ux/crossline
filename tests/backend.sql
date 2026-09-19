begin;
insert into auth.users(id) values ('ce6f4551-643d-408b-9fc5-2f8f9bab0001'),('ce6f4551-643d-408b-9fc5-2f8f9bab0002');
insert into public.users(id,home_state) values ('ce6f4551-643d-408b-9fc5-2f8f9bab0002','TX');
insert into public.state_laws(state_code,category,plain_english,statute_url,last_verified,last_scraped,flagged) values
('VA','test_reviewed','TEST FIXTURE ONLY','https://example.com',now(),now()-interval '1 day',false),
('VA','test_flagged','TEST FIXTURE ONLY','https://example.com',now(),now()-interval '1 day',true),
('VA','test_rescraped','TEST FIXTURE ONLY','https://example.com',now()-interval '2 days',now(),false),
('VA','test_stale','TEST FIXTURE ONLY','https://example.com',now()-interval '100 days',null,false);
set local role authenticated;
select set_config('request.jwt.claim.sub','ce6f4551-643d-408b-9fc5-2f8f9bab0001',true);
select public.save_onboarding('{"home_state":"VA","firearm_type":"handgun","carry_purpose":"ccw","mag_capacity":10,"has_suppressor":false}', '[{"state_code":"VA","permit_type":"resident","expiry_date":"2027-01-01"}]');
select public.save_onboarding('{"home_state":"VA","firearm_type":"handgun","carry_purpose":"ccw","mag_capacity":10,"has_suppressor":false}', '[{"state_code":"VA","permit_type":"resident","expiry_date":"2027-01-01"}]');
do $$
declare n int;
begin
select count(*) into n from public.permits;
if n <> 1 then raise exception 'Retry duplicated permits'; end if;
select count(*) into n from public.users;
if n <> 1 then raise exception 'Cross-user profile visibility'; end if;
select count(*) into n from public.state_laws where category like 'test_%';
if n <> 1 then raise exception 'Unreviewed law visibility'; end if;
begin
perform public.save_onboarding('{"home_state":"MD","mag_capacity":10}', '[{"state_code":"VA","permit_type":"invalid"}]');
raise exception 'Invalid permit accepted';
exception when check_violation then null;
end;
if (select home_state from public.users limit 1) <> 'VA' then raise exception 'Onboarding was not atomic'; end if;
begin
update public.permits set user_id='ce6f4551-643d-408b-9fc5-2f8f9bab0002';
raise exception 'Permit ownership could be reassigned';
exception when insufficient_privilege then null;
end;
insert into public.crossing_events(user_id,to_state) values ('ce6f4551-643d-408b-9fc5-2f8f9bab0001','MD');
delete from public.crossing_events where user_id='ce6f4551-643d-408b-9fc5-2f8f9bab0001';
get diagnostics n = row_count;
if n <> 1 then raise exception 'History deletion failed'; end if;
end $$;
reset role;
delete from auth.users where id='ce6f4551-643d-408b-9fc5-2f8f9bab0001';
do $$ begin
if exists(select 1 from public.users where id='ce6f4551-643d-408b-9fc5-2f8f9bab0001') or exists(select 1 from public.permits where user_id='ce6f4551-643d-408b-9fc5-2f8f9bab0001') then raise exception 'Account deletion did not cascade'; end if;
end $$;
rollback;

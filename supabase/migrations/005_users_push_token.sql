alter table public.users
  add column if not exists push_token text;

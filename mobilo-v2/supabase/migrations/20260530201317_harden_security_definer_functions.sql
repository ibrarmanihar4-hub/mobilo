-- Harden SECURITY DEFINER functions:
-- 1. Lock search_path for set_updated_at.
-- 2. Revoke EXECUTE on handle_new_user from anon/authenticated so it can
--    only run via the trigger, not through PostgREST /rpc/.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

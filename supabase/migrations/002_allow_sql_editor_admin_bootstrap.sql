-- Allow first-admin bootstrap from Supabase SQL Editor / service_role.
-- Previously protect_profile_privileges() treated auth.uid() IS NULL as a
-- non-admin update and raised P0001, blocking all privilege UPDATEs in SQL Editor.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  -- No end-user JWT ⇒ SQL Editor, migrations, or service_role.
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() is distinct from new.id and not public.is_admin() then
    raise exception 'Only admins can update other profiles';
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role';
    end if;
    if new.approved is distinct from old.approved then
      raise exception 'You cannot change your own approval status';
    end if;
  end if;

  return new;
end;
$$;

-- Optional: elevate known bootstrap emails after applying the function fix.
-- Uncomment and run once if those users already exist:
--
-- update public.profiles
-- set approved = true, role = 'admin', updated_at = now()
-- where lower(email) in (
--   'justtest1234@gmail.com',
--   'just1test1234@gmail.com'
-- );

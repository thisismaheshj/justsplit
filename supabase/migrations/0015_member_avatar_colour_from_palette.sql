-- create_group() seeds the owner's member row without an avatar colour, so it
-- fell back to the column default -- which was the old indigo accent and now
-- sits outside the palette entirely. It showed up as one bright avatar among
-- muted ones.
--
-- Two changes: the default becomes a palette colour, and create_group picks
-- from the same twelve-colour set the client uses, keyed off the new row's id
-- so it is stable and spreads evenly rather than every owner being identical.
alter table public.group_members
  alter column avatar_color set default '#4A5A6B';

create or replace function public.create_group(
  p_name text,
  p_currency text,
  p_owner_name text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_group  uuid;
  v_name   text;
  v_member uuid := extensions.gen_random_uuid();
  v_bank   text[] := array[
    '#7A4A45', '#4A5A6B', '#4F6B57', '#6B5B45', '#5C5470', '#7A4F5C',
    '#43616B', '#65674A', '#5A4E63', '#7A6248', '#456B66', '#6B4A5F'
  ];
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.groups (name, currency, created_by)
  values (p_name, upper(coalesce(p_currency, 'INR')), v_uid)
  returning id into v_group;

  select coalesce(nullif(trim(coalesce(p_owner_name, '')), ''), p.name, 'Me')
    into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.group_members (id, group_id, user_id, name, role, avatar_color)
  values (
    v_member, v_group, v_uid, coalesce(v_name, 'Me'), 'owner',
    v_bank[1 + (abs(('x' || substr(replace(v_member::text, '-', ''), 1, 8))::bit(32)::int) % 12)]
  );

  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text) to authenticated;

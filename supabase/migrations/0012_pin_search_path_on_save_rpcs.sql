-- The database linter flagged both save RPCs as having a mutable search_path.
-- They are SECURITY INVOKER, so this is not a privilege-escalation route the
-- way it would be on a definer function -- but a caller can still set
-- search_path to a schema holding its own `expenses` table and have the
-- unqualified lookups resolve there. Every reference inside is already
-- schema-qualified, so pinning the path to empty costs nothing and closes the
-- shadowing route. Built-ins keep resolving because pg_catalog is always
-- searched implicitly.
alter function public.save_expense(uuid, text, bigint, uuid, text, text, date, jsonb, text, uuid, uuid)
  set search_path = '';

alter function public.save_recurring_expense(uuid, text, bigint, uuid, text, text, text, date, date, jsonb, date, text, boolean, uuid)
  set search_path = '';

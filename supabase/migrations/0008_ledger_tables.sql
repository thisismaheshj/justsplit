-- ============================================================================
-- Phase 4b: the ledger. Expenses, their splits, settlements, recurring
-- templates and custom categories -- all scoped to a group.
--
-- Money is bigint MINOR UNITS everywhere (paise/cents), never a float and
-- never numeric. The client already stores it this way; the database now
-- refuses anything else.
--
-- Participants reference group_members rather than users, so a ghost member
-- can owe money exactly like an account holder.
-- ============================================================================

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid        not null references public.groups (id) on delete cascade,
  description  text        not null check (length(trim(description)) between 1 and 80),
  amount       bigint      not null check (amount > 0),
  paid_by      uuid        not null references public.group_members (id) on delete restrict,
  split_method text        not null check (split_method in ('equal', 'exact', 'percentage', 'shares')),
  category     text        not null default 'other',
  -- A plain date, not a timestamp: "which day was this" has no timezone.
  date         date        not null,
  note         text,
  recurring_expense_id uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.expense_participants (
  expense_id  uuid   not null references public.expenses (id) on delete cascade,
  member_id   uuid   not null references public.group_members (id) on delete restrict,
  -- Percentage (2dp), share count, or exact minor units, depending on method.
  input_value numeric,
  amount_owed bigint not null check (amount_owed >= 0),
  -- The split algorithms hand leftover minor units to the first N participants
  -- "in order", so the order is part of the result and has to survive a
  -- round trip through the database.
  position    int    not null,
  primary key (expense_id, member_id)
);

create table if not exists public.settlements (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups (id) on delete cascade,
  from_member uuid       not null references public.group_members (id) on delete restrict,
  to_member   uuid       not null references public.group_members (id) on delete restrict,
  amount     bigint      not null check (amount > 0),
  date       date        not null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlements_distinct_parties check (from_member <> to_member)
);

create table if not exists public.recurring_expenses (
  id            uuid        primary key default gen_random_uuid(),
  group_id      uuid        not null references public.groups (id) on delete cascade,
  description   text        not null check (length(trim(description)) between 1 and 80),
  amount        bigint      not null check (amount > 0),
  paid_by       uuid        not null references public.group_members (id) on delete restrict,
  split_method  text        not null check (split_method in ('equal', 'exact', 'percentage', 'shares')),
  category      text        not null default 'other',
  frequency     text        not null check (frequency in ('weekly', 'monthly')),
  start_date    date        not null,
  next_due_date date        not null,
  end_date      date,
  active        boolean     not null default true,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint recurring_end_after_start check (end_date is null or end_date >= start_date)
);

create table if not exists public.recurring_participants (
  recurring_id uuid   not null references public.recurring_expenses (id) on delete cascade,
  member_id    uuid   not null references public.group_members (id) on delete restrict,
  input_value  numeric,
  amount_owed  bigint not null check (amount_owed >= 0),
  position     int    not null,
  primary key (recurring_id, member_id)
);

-- Generated instances point back at their template. Added after the fact
-- because the two tables reference each other.
alter table public.expenses
  drop constraint if exists expenses_recurring_fkey;
alter table public.expenses
  add constraint expenses_recurring_fkey
  foreign key (recurring_expense_id) references public.recurring_expenses (id) on delete set null;

-- The nine defaults live in code (lib/categories.ts) and are the same for
-- everyone; only user-added ones need storing.
create table if not exists public.group_categories (
  group_id uuid not null references public.groups (id) on delete cascade,
  id       text not null check (length(trim(id)) between 1 and 40),
  label    text not null check (length(trim(label)) between 1 and 24),
  icon     text not null,
  primary key (group_id, id)
);

create index if not exists expenses_by_group_date  on public.expenses (group_id, date desc);
create index if not exists expenses_by_recurring   on public.expenses (recurring_expense_id) where recurring_expense_id is not null;
create index if not exists expense_parts_by_member on public.expense_participants (member_id);
create index if not exists settlements_by_group    on public.settlements (group_id, date desc);
create index if not exists recurring_by_group      on public.recurring_expenses (group_id);
create index if not exists recurring_due           on public.recurring_expenses (next_due_date) where active;

alter table public.expenses               enable row level security;
alter table public.expense_participants   enable row level security;
alter table public.settlements            enable row level security;
alter table public.recurring_expenses     enable row level security;
alter table public.recurring_participants enable row level security;
alter table public.group_categories       enable row level security;

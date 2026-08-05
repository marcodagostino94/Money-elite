-- Money Elite · schema Supabase v1
-- Incollare tutto nel SQL Editor di un nuovo progetto Supabase.

create extension if not exists pgcrypto;

create type account_type as enum ('bank', 'cash', 'savings', 'meal_vouchers', 'other');
create type card_period_type as enum ('monthly', 'no_period');
create type category_kind as enum ('income', 'expense');
create type transaction_kind as enum ('income', 'expense', 'transfer', 'refund', 'card_repayment');
create type recurrence_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type debt_direction as enum ('owed_to_me', 'i_owe');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Marco',
  currency text not null default 'EUR',
  locale text not null default 'it-IT',
  debts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'EUR',
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  voucher_unit_value numeric(10,2),
  hidden_from_totals boolean not null default false,
  archived_at timestamptz,
  color text,
  icon text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name),
  check (
    (type = 'meal_vouchers' and voucher_unit_value > 0)
    or (type <> 'meal_vouchers' and voucher_unit_value is null)
  )
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  linked_account_id uuid references accounts(id) on delete set null,
  name text not null,
  period_type card_period_type not null default 'monthly',
  credit_limit numeric(14,2),
  cycle_start_day smallint check (cycle_start_day between 1 and 31),
  payment_day smallint check (payment_day between 1 and 31),
  automatic_payment boolean not null default false,
  include_planned_in_limit boolean not null default false,
  interest_rate numeric(7,4) not null default 0,
  archived_at timestamptz,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  kind category_kind not null,
  color text not null,
  icon text not null,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index categories_root_unique
  on categories(user_id, kind, lower(name))
  where parent_id is null;

create unique index categories_child_unique
  on categories(user_id, parent_id, lower(name))
  where parent_id is not null;

create table recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  account_id uuid references accounts(id) on delete restrict,
  card_id uuid references cards(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  kind transaction_kind not null check (kind in ('income', 'expense', 'transfer')),
  amount numeric(14,2) not null check (amount > 0),
  destination_amount numeric(14,2) check (destination_amount is null or destination_amount > 0),
  exchange_rate numeric(20,8) check (exchange_rate is null or exchange_rate > 0),
  destination_account_id uuid references accounts(id) on delete restrict,
  frequency recurrence_frequency not null,
  interval_count integer not null default 1 check (interval_count > 0),
  occurrence_limit integer check (occurrence_limit is null or occurrence_limit > 0),
  occurrence_count integer not null default 0,
  next_date date not null,
  end_date date,
  automatic_accounting boolean not null default false,
  is_subscription boolean not null default false,
  reminder_days_before smallint,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and destination_account_id is not null and destination_account_id <> account_id)
    or (kind <> 'transfer' and destination_account_id is null)
  )
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind transaction_kind not null,
  account_id uuid not null references accounts(id) on delete restrict,
  destination_account_id uuid references accounts(id) on delete restrict,
  card_id uuid references cards(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  recurrence_id uuid references recurrences(id) on delete set null,
  refund_of_id uuid references transactions(id) on delete restrict,
  transfer_group_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  destination_amount numeric(14,2) check (destination_amount is null or destination_amount > 0),
  exchange_rate numeric(20,8) check (exchange_rate is null or exchange_rate > 0),
  voucher_count integer check (voucher_count is null or voucher_count > 0),
  transaction_date date not null,
  due_date date,
  confirmed_at timestamptz,
  accounted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and destination_account_id is not null and destination_account_id <> account_id and transfer_group_id is not null)
    or (kind <> 'transfer' and destination_account_id is null)
  ),
  check (
    (kind = 'refund' and refund_of_id is not null)
    or (kind <> 'refund' and refund_of_id is null)
  )
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  month date not null check (month = date_trunc('month', month)::date),
  alert_percent smallint not null default 80 check (alert_percent between 1 and 100),
  created_at timestamptz not null default now(),
  unique(user_id, category_id, month)
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  person text not null,
  direction debt_direction not null,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  due_date date,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_idx on accounts(user_id);
create index cards_user_idx on cards(user_id);
create index categories_user_parent_idx on categories(user_id, parent_id);
create index transactions_user_date_idx on transactions(user_id, transaction_date desc);
create index transactions_account_date_idx on transactions(account_id, transaction_date desc);
create index transactions_card_date_idx on transactions(card_id, transaction_date desc);
create index transactions_due_unconfirmed_idx on transactions(user_id, due_date)
  where confirmed_at is null and due_date is not null;
create index transactions_refund_idx on transactions(refund_of_id)
  where refund_of_id is not null;
create index recurrences_next_date_idx on recurrences(user_id, next_date)
  where active;
create index budgets_user_month_idx on budgets(user_id, month);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
for each row execute function set_updated_at();
create trigger accounts_updated_at before update on accounts
for each row execute function set_updated_at();
create trigger cards_updated_at before update on cards
for each row execute function set_updated_at();
create trigger recurrences_updated_at before update on recurrences
for each row execute function set_updated_at();
create trigger transactions_updated_at before update on transactions
for each row execute function set_updated_at();
create trigger debts_updated_at before update on debts
for each row execute function set_updated_at();

create or replace function create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Marco'));
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function create_profile_for_new_user();

alter table profiles enable row level security;
alter table accounts enable row level security;
alter table cards enable row level security;
alter table categories enable row level security;
alter table recurrences enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table debts enable row level security;

-- I criteri RLS sottostanti mantengono ciascun dato separato per utente.
-- Questi permessi consentono soltanto agli utenti che hanno effettuato l'accesso
-- di interrogare e modificare le tabelle dell'app.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  profiles, accounts, cards, categories, recurrences, transactions, budgets, debts
to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy profiles_owner on profiles for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy accounts_owner on accounts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cards_owner on cards for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy categories_owner on categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy recurrences_owner on recurrences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy transactions_owner on transactions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy budgets_owner on budgets for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy debts_owner on debts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Regole di calcolo:
-- 1. Entrate = somma kind='income'; i rimborsi non sono entrate.
-- 2. Uscite nette = spese meno rimborsi collegati.
-- 3. Trasferimenti e pagamenti carta non incidono su entrate, uscite o budget.
-- 4. Budget = spese della categoria meno relativi rimborsi.
-- 5. "Da confermare" = due_date <= current_date e confirmed_at is null.
-- 6. Contabilizzata = accounted_at valorizzato; confermata e contabilizzata sono stati distinti.
-- 7. I conti nascosti non entrano nel patrimonio; gli archiviati conservano lo storico.

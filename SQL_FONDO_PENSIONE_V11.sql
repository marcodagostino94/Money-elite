-- Eseguire una sola volta nel SQL Editor di Supabase.
create table if not exists public.pension_fund_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  competence_month date not null, tfr_amount numeric(14,2) not null check (tfr_amount >= 0),
  personal_contribution numeric(14,2) not null default 0 check (personal_contribution >= 0),
  employer_contribution numeric(14,2) not null default 0 check (employer_contribution >= 0),
  status text not null default 'pending' check (status in ('pending','paid')),
  paid_at date, paid_amount numeric(14,2) check (paid_amount is null or paid_amount >= 0),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, competence_month)
);
create table if not exists public.pension_fund_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  observed_at date not null, balance numeric(14,2) not null check (balance >= 0), notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.pension_fund_manual_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  paid_at date not null, amount numeric(14,2) not null check (amount > 0), notes text,
  created_at timestamptz not null default now()
);
alter table public.pension_fund_entries enable row level security;
alter table public.pension_fund_snapshots enable row level security;
alter table public.pension_fund_manual_payments enable row level security;
drop policy if exists pension_fund_entries_owner on public.pension_fund_entries;
create policy pension_fund_entries_owner on public.pension_fund_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists pension_fund_snapshots_owner on public.pension_fund_snapshots;
create policy pension_fund_snapshots_owner on public.pension_fund_snapshots for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists pension_fund_manual_payments_owner on public.pension_fund_manual_payments;
create policy pension_fund_manual_payments_owner on public.pension_fund_manual_payments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.pension_fund_entries to authenticated;
grant select, insert, update, delete on public.pension_fund_snapshots to authenticated;
grant select, insert, update, delete on public.pension_fund_manual_payments to authenticated;

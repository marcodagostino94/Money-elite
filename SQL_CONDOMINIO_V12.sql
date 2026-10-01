-- Eseguire una sola volta nel SQL Editor di Supabase.
-- La sezione Condominio resta separata da patrimonio, dashboard e report.

begin;

create table if not exists public.condominium_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  management_type text not null check (management_type in ('ordinary','heating')),
  label text not null,
  start_date date not null,
  end_date date not null,
  budget_amount numeric(14,2) not null default 0 check (budget_amount >= 0),
  final_amount numeric(14,2) check (final_amount is null or final_amount >= 0),
  closing_balance numeric(14,2) not null default 0,
  is_placeholder boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (user_id, management_type, label)
);

create table if not exists public.condominium_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_id uuid not null references public.condominium_periods(id) on delete cascade,
  source_period_id uuid references public.condominium_periods(id) on delete set null,
  kind text not null default 'regular' check (kind in ('regular','extraordinary','settlement')),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  original_amount numeric(14,2) not null check (original_amount >= 0),
  credit_applied numeric(14,2) not null default 0 check (credit_applied >= 0),
  due_date date not null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  planned_recurrence_id uuid unique references public.recurrences(id) on delete set null,
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists condominium_periods_user_type_idx
  on public.condominium_periods(user_id, management_type, start_date desc);
create index if not exists condominium_installments_period_idx
  on public.condominium_installments(period_id, due_date);
create index if not exists condominium_installments_recurrence_idx
  on public.condominium_installments(planned_recurrence_id)
  where planned_recurrence_id is not null;

alter table public.condominium_periods enable row level security;
alter table public.condominium_installments enable row level security;

drop policy if exists condominium_periods_owner on public.condominium_periods;
create policy condominium_periods_owner on public.condominium_periods
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists condominium_installments_owner on public.condominium_installments;
create policy condominium_installments_owner on public.condominium_installments
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.condominium_periods to authenticated;
grant select, insert, update, delete on public.condominium_installments to authenticated;

drop trigger if exists condominium_periods_updated_at on public.condominium_periods;
create trigger condominium_periods_updated_at before update on public.condominium_periods
for each row execute function public.set_updated_at();
drop trigger if exists condominium_installments_updated_at on public.condominium_installments;
create trigger condominium_installments_updated_at before update on public.condominium_installments
for each row execute function public.set_updated_at();

commit;

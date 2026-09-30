-- Money Elite v10 · Finanziamenti
-- Include i GRANT espliciti richiesti da Supabase per le nuove tabelle public.

create table if not exists public.financings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recurrence_id uuid not null unique references public.recurrences(id) on delete restrict,
  name text not null,
  lender text,
  purchase_amount numeric(14,2) not null check (purchase_amount > 0),
  financed_amount numeric(14,2) not null check (financed_amount > 0),
  total_repayment numeric(14,2) not null check (total_repayment > 0),
  installment_count integer not null check (installment_count > 0),
  regular_installment_amount numeric(14,2) not null check (regular_installment_amount > 0),
  final_installment_amount numeric(14,2) not null check (final_installment_amount > 0),
  first_due_date date not null,
  status text not null default 'active' check (status in ('active','completed','settled')),
  settled_at timestamptz,
  settlement_amount numeric(14,2),
  settlement_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  installment_schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financings_user_status_idx on public.financings(user_id,status);
create index if not exists financings_recurrence_idx on public.financings(recurrence_id);

drop trigger if exists financings_updated_at on public.financings;
create trigger financings_updated_at before update on public.financings
for each row execute function public.set_updated_at();

alter table public.financings enable row level security;

drop policy if exists "financings_select_own" on public.financings;
create policy "financings_select_own" on public.financings for select
using (auth.uid() = user_id);

drop policy if exists "financings_insert_own" on public.financings;
create policy "financings_insert_own" on public.financings for insert
with check (auth.uid() = user_id);

drop policy if exists "financings_update_own" on public.financings;
create policy "financings_update_own" on public.financings for update
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "financings_delete_own" on public.financings;
create policy "financings_delete_own" on public.financings for delete
using (auth.uid() = user_id);

grant select on public.financings to anon;
grant select, insert, update, delete on public.financings to authenticated;
grant select, insert, update, delete on public.financings to service_role;

alter publication supabase_realtime add table public.financings;

-- Eseguire una sola volta nel SQL Editor di Supabase.
-- Aggiunge il TFR lasciato in azienda e i trasferimenti verso il fondo.

begin;

create table if not exists public.pension_fund_company_tfr (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initial_amount numeric(14,2) not null check (initial_amount >= 0),
  current_balance numeric(14,2) not null check (current_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pension_fund_company_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paid_at date not null,
  amount numeric(14,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pension_fund_company_tfr enable row level security;
alter table public.pension_fund_company_transfers enable row level security;

drop policy if exists pension_fund_company_tfr_owner on public.pension_fund_company_tfr;
create policy pension_fund_company_tfr_owner on public.pension_fund_company_tfr
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pension_fund_company_transfers_owner on public.pension_fund_company_transfers;
create policy pension_fund_company_transfers_owner on public.pension_fund_company_transfers
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.pension_fund_company_tfr to authenticated;
grant select, insert, update, delete on public.pension_fund_company_transfers to authenticated;

create or replace function public.transfer_company_tfr(
  transfer_amount numeric,
  transfer_date date,
  transfer_notes text default null
)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare new_transfer_id uuid;
begin
  if auth.uid() is null then raise exception 'Utente non autenticato'; end if;
  if transfer_amount is null or transfer_amount <= 0 then raise exception 'Importo non valido'; end if;

  update public.pension_fund_company_tfr
  set current_balance = current_balance - transfer_amount, updated_at = now()
  where user_id = auth.uid() and current_balance >= transfer_amount;
  if not found then raise exception 'Importo superiore al TFR disponibile in azienda'; end if;

  insert into public.pension_fund_company_transfers (user_id, paid_at, amount, notes)
  values (auth.uid(), transfer_date, transfer_amount, nullif(trim(transfer_notes), ''))
  returning id into new_transfer_id;
  return new_transfer_id;
end;
$$;

grant execute on function public.transfer_company_tfr(numeric, date, text) to authenticated;
commit;

-- Money Elite v9 · residuo cumulato degli interessi giornalieri
-- Eseguire una sola volta nel SQL Editor di Supabase.

alter table public.accounts
  add column if not exists interest_remainder numeric(20,12) not null default 0;

update public.accounts
set interest_remainder = 0
where interest_remainder is null
   or interest_remainder < 0
   or interest_remainder >= 0.01;

do $$ begin
  alter table public.accounts
    add constraint accounts_interest_remainder_range
    check (interest_remainder >= 0 and interest_remainder < 0.01);
exception when duplicate_object then null;
end $$;

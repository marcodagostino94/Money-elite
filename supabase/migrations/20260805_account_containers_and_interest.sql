-- Money Elite v4.7 · contenitori, sottoconti e interessi giornalieri
alter table public.accounts add column if not exists is_container boolean not null default false;
alter table public.accounts add column if not exists parent_account_id uuid references public.accounts(id) on delete set null;
alter table public.accounts add column if not exists account_role text not null default 'standard';
alter table public.accounts add column if not exists annual_interest_rate numeric(8,4) not null default 0;
alter table public.accounts add column if not exists interest_last_accrual_date date;

do $$ begin
  alter table public.accounts add constraint accounts_role_check
    check (account_role in ('standard','main','pocket','deposit'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.accounts add constraint accounts_interest_rate_check
    check (annual_interest_rate >= 0);
exception when duplicate_object then null;
end $$;

create index if not exists accounts_parent_idx on public.accounts(parent_account_id);

-- Impedisce il doppio accredito dello stesso interesse giornaliero.
create unique index if not exists transactions_daily_interest_unique
  on public.transactions(account_id, transaction_date)
  where notes = 'Interesse giornaliero automatico';

-- Money Elite v4.4 · sistema multivaluta completo
-- Non modifica importi, saldi o movimenti storici.
alter table public.accounts add column if not exists currency text not null default 'EUR';
alter table public.accounts add column if not exists exchange_rate numeric(20,8) not null default 1;
alter table public.transactions add column if not exists destination_amount numeric(14,2);
alter table public.transactions add column if not exists exchange_rate numeric(20,8);

update public.accounts set currency='EUR' where currency is null or currency='';
update public.accounts set exchange_rate=1 where exchange_rate is null or exchange_rate<=0;

alter table public.accounts drop constraint if exists accounts_exchange_rate_positive;
alter table public.accounts add constraint accounts_exchange_rate_positive check(exchange_rate>0);
alter table public.transactions drop constraint if exists transactions_destination_amount_positive;
alter table public.transactions add constraint transactions_destination_amount_positive check(destination_amount is null or destination_amount>0);
alter table public.transactions drop constraint if exists transactions_exchange_rate_positive;
alter table public.transactions add constraint transactions_exchange_rate_positive check(exchange_rate is null or exchange_rate>0);

-- Money Elite v4.3 · valuta per singolo conto
alter table public.accounts
  add column if not exists currency text not null default 'EUR';

update public.accounts set currency = 'EUR' where currency is null or currency = '';

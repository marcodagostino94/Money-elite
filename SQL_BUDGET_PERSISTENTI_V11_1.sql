-- Eseguire una sola volta nel SQL Editor di Supabase.
-- Trasforma i budget mensili isolati in regole persistenti attivabili.

begin;

alter table public.budgets
  add column if not exists active boolean not null default true,
  add column if not exists period_type text not null default 'monthly',
  add column if not exists duration_days integer,
  add column if not exists starts_at date,
  add column if not exists expires_at date;

update public.budgets
set starts_at = coalesce(starts_at, month)
where starts_at is null;

alter table public.budgets
  alter column starts_at set default current_date,
  alter column starts_at set not null;

-- Se esistono vecchi budget mensili della stessa categoria, mantiene attivo
-- soltanto il più recente e conserva gli altri come storico disattivato.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, category_id
           order by month desc, created_at desc
         ) as position
  from public.budgets
)
update public.budgets as budget
set active = false
from ranked
where ranked.id = budget.id and ranked.position > 1;

alter table public.budgets
  drop constraint if exists budgets_user_id_category_id_month_key,
  drop constraint if exists budgets_period_type_check,
  drop constraint if exists budgets_duration_days_check,
  drop constraint if exists budgets_period_consistency_check;

alter table public.budgets
  add constraint budgets_period_type_check check (period_type in ('monthly', 'days')),
  add constraint budgets_duration_days_check check (duration_days is null or duration_days > 0),
  add constraint budgets_period_consistency_check check (
    (period_type = 'monthly' and duration_days is null and expires_at is null)
    or
    (period_type = 'days' and duration_days is not null and expires_at is not null and expires_at >= starts_at)
  );

grant select, insert, update, delete on table public.budgets to authenticated;

commit;

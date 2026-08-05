-- Money Elite v4.5 · ordine conti sincronizzato
alter table public.accounts add column if not exists sort_order integer not null default 0;

with ordered as (
  select id, row_number() over(partition by user_id order by created_at, name)-1 as position
  from public.accounts
)
update public.accounts a set sort_order=ordered.position
from ordered where ordered.id=a.id and a.sort_order=0;

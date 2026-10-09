begin;

alter table public.pension_fund_entries
  add column if not exists destination text not null default 'fund';

alter table public.pension_fund_entries
  drop constraint if exists pension_fund_entries_destination_check;

alter table public.pension_fund_entries
  add constraint pension_fund_entries_destination_check
  check (destination in ('fund', 'company'));

create or replace function public.sync_company_tfr_from_monthly_entry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_company_amount numeric(14,2) := 0;
  new_company_amount numeric(14,2) := 0;
  balance_delta numeric(14,2);
  target_user_id uuid;
begin
  if tg_op <> 'INSERT' and old.destination = 'company' then
    old_company_amount := old.tfr_amount;
  end if;

  if tg_op <> 'DELETE' and new.destination = 'company' then
    new_company_amount := new.tfr_amount;
  end if;

  balance_delta := new_company_amount - old_company_amount;
  target_user_id := coalesce(new.user_id, old.user_id);

  if balance_delta > 0 then
    insert into public.pension_fund_company_tfr (
      user_id,
      initial_amount,
      current_balance
    )
    values (target_user_id, 0, balance_delta)
    on conflict (user_id) do update
      set current_balance =
            public.pension_fund_company_tfr.current_balance + excluded.current_balance,
          updated_at = now();
  elsif balance_delta < 0 then
    update public.pension_fund_company_tfr
    set current_balance = current_balance + balance_delta,
        updated_at = now()
    where user_id = target_user_id
      and current_balance + balance_delta >= 0;

    if not found then
      raise exception
        'Il TFR disponibile in azienda non è sufficiente per modificare o eliminare questa mensilità';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists pension_monthly_company_tfr_sync
  on public.pension_fund_entries;

create trigger pension_monthly_company_tfr_sync
after insert or update of tfr_amount, destination or delete
on public.pension_fund_entries
for each row execute function public.sync_company_tfr_from_monthly_entry();

commit;

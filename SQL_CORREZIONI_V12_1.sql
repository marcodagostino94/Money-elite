begin;

-- Consente di annullare un trasferimento TFR, eliminandolo dal fondo e
-- ripristinando lo stesso importo nel TFR ancora detenuto in azienda.
create or replace function public.reverse_company_tfr_transfer(transfer_id uuid)
returns void language plpgsql security invoker set search_path = public
as $$
declare restored_amount numeric(14,2);
begin
  delete from public.pension_fund_company_transfers
  where id = transfer_id and user_id = auth.uid()
  returning amount into restored_amount;

  if restored_amount is null then
    raise exception 'Trasferimento non trovato';
  end if;

  update public.pension_fund_company_tfr
  set current_balance = current_balance + restored_amount, updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'TFR in azienda non trovato';
  end if;
end;
$$;

grant execute on function public.reverse_company_tfr_transfer(uuid) to authenticated;

commit;

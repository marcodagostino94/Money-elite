-- Money Elite 14.0 — aggiornamento dalla 13.3. Eseguire nel SQL Editor di Supabase.
-- Fare prima un backup. Non elimina movimenti o dati esistenti.
-- Script ripetibile; nessuna modifica alle policy delle tabelle preesistenti.
begin;

alter table public.condominium_periods drop constraint if exists condominium_periods_management_type_check;
alter table public.condominium_periods add constraint condominium_periods_management_type_check
  check (management_type in ('ordinary', 'heating', 'extraordinary'));
alter table public.condominium_periods alter column start_date drop not null;
alter table public.condominium_periods alter column end_date drop not null;
alter table public.condominium_periods drop constraint if exists condominium_periods_dates_v14_check;
alter table public.condominium_periods add constraint condominium_periods_dates_v14_check
  check ((management_type = 'extraordinary' and start_date is null and end_date is null)
    or (management_type <> 'extraordinary' and start_date is not null and end_date is not null));
create unique index if not exists condominium_one_active_extra_v14
  on public.condominium_periods(user_id) where management_type = 'extraordinary' and status = 'active';

create table if not exists public.pension_tfr_history_base (
  user_id uuid primary key references auth.users(id) on delete cascade,
  closing_year integer not null check (closing_year between 1900 and 2199),
  company_amount numeric(14,2) not null check (company_amount >= 0),
  fund_amount numeric(14,2) not null check (fund_amount >= 0),
  updated_at timestamptz not null default now()
);
alter table public.pension_tfr_history_base enable row level security;
drop policy if exists pension_tfr_history_base_owner on public.pension_tfr_history_base;
create policy pension_tfr_history_base_owner on public.pension_tfr_history_base for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.pension_tfr_history_base from anon;
grant select, insert, update, delete on public.pension_tfr_history_base to authenticated;

create table if not exists public.condominium_budget_revisions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_id uuid not null references public.condominium_periods(id) on delete cascade,
  old_amount numeric(14,2) not null,
  new_amount numeric(14,2) not null check (new_amount >= 0),
  replaced_unpaid boolean not null,
  removed_count integer not null default 0,
  added_count integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists condominium_revisions_period_v14 on public.condominium_budget_revisions(period_id, created_at desc);
alter table public.condominium_budget_revisions enable row level security;
drop policy if exists condominium_revisions_owner on public.condominium_budget_revisions;
create policy condominium_revisions_owner on public.condominium_budget_revisions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.condominium_budget_revisions from anon;
grant select, insert on public.condominium_budget_revisions to authenticated;

-- Un'unica transazione: conserva i pagamenti, sostituisce soltanto rate regolari
-- non pagate e non coperte da credito, aggiorna piano, pianificate e storico.
create or replace function public.revise_condominium_budget(
  p_period uuid, p_expected_updated_at timestamptz, p_budget numeric,
  p_replace_unpaid boolean, p_schedule jsonb, p_note text, p_request_id uuid
) returns uuid language plpgsql security invoker set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  current_period public.condominium_periods%rowtype;
  row_item public.condominium_installments%rowtype;
  removable uuid[] := '{}';
  recurrence_ids uuid[] := '{}';
  covered numeric(14,2) := 0;
  target numeric(14,2);
  schedule_total numeric(14,2) := 0;
  preserved_pending boolean := false;
  already_paid boolean;
  draft jsonb;
  new_recurrence uuid;
  row_amount numeric(14,2);
  row_account uuid;
  row_category uuid;
  row_date date;
  row_description text;
begin
  if owner_id is null then raise exception 'Utente non autenticato'; end if;
  if p_request_id is null then raise exception 'Identificativo richiesta mancante'; end if;
  select * into current_period from public.condominium_periods
    where id = p_period and user_id = owner_id for update;
  if not found then raise exception 'Gestione non trovata'; end if;
  -- Richieste ripetute per doppio clic o risposta di rete persa non duplicano rate.
  if exists(select 1 from public.condominium_budget_revisions where id = p_request_id and user_id = owner_id and period_id = p_period) then return p_request_id; end if;
  if current_period.updated_at is distinct from p_expected_updated_at then
    raise exception 'La gestione è cambiata. Chiudi questa finestra, riapri la gestione e verifica nuovamente il piano.';
  end if;
  if current_period.status = 'archived' or current_period.is_placeholder then raise exception 'Riapri la gestione prima di aggiornare il preventivo'; end if;
  if p_budget is null or p_budget::text in ('NaN','Infinity','-Infinity') or p_budget < 0 or round(p_budget,2) <> p_budget then raise exception 'Importo preventivo non valido'; end if;
  if p_replace_unpaid is null or p_schedule is null or jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) > 120 then raise exception 'Piano rateale non valido'; end if;
  perform 1 from public.condominium_installments where period_id = p_period and user_id = owner_id order by id for update;
  perform 1 from public.recurrences where id in (select planned_recurrence_id from public.condominium_installments where period_id = p_period and user_id = owner_id) order by id for update;
  perform 1 from public.transactions where recurrence_id in (select planned_recurrence_id from public.condominium_installments where period_id = p_period and user_id = owner_id) order by id for update;
  for row_item in select * from public.condominium_installments where period_id = p_period and user_id = owner_id and kind = 'regular' loop
    already_paid := row_item.paid_at is not null or row_item.amount = 0 or exists (
      select 1 from public.transactions t where t.user_id = owner_id and t.recurrence_id = row_item.planned_recurrence_id and t.confirmed_at is not null);
    if p_replace_unpaid and not already_paid and row_item.credit_applied = 0 then
      removable := array_append(removable, row_item.id);
      if row_item.planned_recurrence_id is not null then recurrence_ids := array_append(recurrence_ids, row_item.planned_recurrence_id); end if;
    else
      -- Importo originario può essere stato corretto manualmente: la copertura è
      -- l'importo corrente più il credito, non il vecchio original_amount.
      covered := covered + row_item.amount + row_item.credit_applied;
      preserved_pending := preserved_pending or (not already_paid and row_item.amount > 0);
    end if;
  end loop;
  if covered > p_budget and preserved_pending then raise exception 'Il nuovo totale non copre le rate conservate. Ridistribuisci le rate non pagate o verifica quelle coperte da credito.'; end if;
  target := greatest(0, p_budget - covered);
  for draft in select value from jsonb_array_elements(p_schedule) loop
    if jsonb_typeof(draft) <> 'object' or not (draft ?& array['amount','description','due_date','account_id','create_planned']) then raise exception 'Dati rata incompleti'; end if;
    if (draft->>'amount') is null or (draft->>'amount') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Importo rata non valido'; end if;
    row_amount := (draft->>'amount')::numeric;
    row_account := nullif(draft->>'account_id','')::uuid;
    row_category := nullif(draft->>'category_id','')::uuid;
    row_date := (draft->>'due_date')::date;
    row_description := nullif(trim(draft->>'description'),'');
    if row_date is null or row_description is null or jsonb_typeof(draft->'create_planned') <> 'boolean' then raise exception 'Descrizione, scadenza o opzione pianificata non valide'; end if;
    if not exists(select 1 from public.accounts where id = row_account and user_id = owner_id) then raise exception 'Conto di pagamento non valido'; end if;
    if row_category is not null and not exists(select 1 from public.categories where id = row_category and user_id = owner_id) then raise exception 'Categoria non valida'; end if;
    if (draft->>'create_planned')::boolean and row_amount > 0 and row_category is null then raise exception 'Scegli una categoria per la pianificata'; end if;
    schedule_total := schedule_total + row_amount;
  end loop;
  if schedule_total <> target then raise exception 'Il residuo è cambiato o la somma delle nuove rate non coincide: atteso % euro. Riapri e ricalcola il piano.', target; end if;
  -- Il controllo avviene sotto lock: mai toccare movimenti già confermati.
  if exists(select 1 from public.transactions where recurrence_id = any(recurrence_ids) and confirmed_at is not null) then raise exception 'Una rata è stata appena pagata: ricalcola il piano'; end if;
  delete from public.transactions where user_id = owner_id and recurrence_id = any(recurrence_ids) and confirmed_at is null;
  delete from public.condominium_installments where user_id = owner_id and id = any(removable);
  delete from public.recurrences where user_id = owner_id and id = any(recurrence_ids);
  for draft in select value from jsonb_array_elements(p_schedule) loop
    row_amount := (draft->>'amount')::numeric;
    row_account := (draft->>'account_id')::uuid;
    row_category := nullif(draft->>'category_id','')::uuid;
    row_date := (draft->>'due_date')::date;
    row_description := trim(draft->>'description');
    new_recurrence := null;
    if (draft->>'create_planned')::boolean and row_amount > 0 then
      insert into public.recurrences(user_id, account_id, category_id, kind, amount, frequency, interval_count, occurrence_limit, occurrence_count, next_date, automatic_accounting, is_subscription, active, notes)
      values(owner_id, row_account, row_category, 'expense', row_amount, 'monthly', 1, 1, 0, row_date, false, false, true, row_description)
      returning id into new_recurrence;
    end if;
    insert into public.condominium_installments(user_id, period_id, kind, description, amount, original_amount, credit_applied, due_date, account_id, category_id, planned_recurrence_id)
    values(owner_id, p_period, 'regular', row_description, row_amount, row_amount, 0, row_date, row_account, row_category, new_recurrence);
  end loop;
  update public.condominium_periods set budget_amount = p_budget, updated_at = now() where id = p_period and user_id = owner_id;
  insert into public.condominium_budget_revisions(id, user_id, period_id, old_amount, new_amount, replaced_unpaid, removed_count, added_count, note)
  values(p_request_id, owner_id, p_period, current_period.budget_amount, p_budget, p_replace_unpaid, cardinality(removable), jsonb_array_length(p_schedule), nullif(trim(p_note),''));
  return p_request_id;
end;
$$;
revoke all on function public.revise_condominium_budget(uuid,timestamptz,numeric,boolean,jsonb,text,uuid) from public, anon;
grant execute on function public.revise_condominium_budget(uuid,timestamptz,numeric,boolean,jsonb,text,uuid) to authenticated;

create or replace function public.create_condominium_extra(p_label text, p_budget numeric, p_schedule jsonb, p_request_id uuid)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare stamp timestamptz; owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Utente non autenticato'; end if;
  if p_request_id is null or nullif(trim(p_label),'') is null then raise exception 'Nome della gestione mancante'; end if;
  if exists(select 1 from public.condominium_periods where id = p_request_id and user_id = owner_id and management_type = 'extraordinary') then return p_request_id; end if;
  if exists(select 1 from public.condominium_periods where user_id = owner_id and management_type = 'extraordinary' and status = 'active') then raise exception 'Chiudi la gestione straordinaria in corso prima di aprirne una nuova'; end if;
  insert into public.condominium_periods(id,user_id,management_type,label,start_date,end_date,budget_amount)
    values(p_request_id,owner_id,'extraordinary',trim(p_label),null,null,0) returning updated_at into stamp;
  perform public.revise_condominium_budget(p_request_id, stamp, p_budget, false, p_schedule, 'Apertura gestione straordinaria', gen_random_uuid());
  return p_request_id;
end;
$$;
revoke all on function public.create_condominium_extra(text,numeric,jsonb,uuid) from public, anon;
grant execute on function public.create_condominium_extra(text,numeric,jsonb,uuid) to authenticated;

create or replace function public.set_condominium_management_closed(p_period uuid, p_close boolean, p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path = public
as $$
declare current_period public.condominium_periods%rowtype; total_paid numeric(14,2); regular_covered numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Utente non autenticato'; end if;
  select * into current_period from public.condominium_periods where id = p_period and user_id = auth.uid() for update;
  if not found or current_period.management_type <> 'extraordinary' then raise exception 'Gestione straordinaria non trovata'; end if;
  if current_period.updated_at is distinct from p_expected_updated_at then raise exception 'La gestione è cambiata: riaprila e verifica i dati'; end if;
  if p_close is null then raise exception 'Stato non valido'; end if;
  if p_close then
    perform 1 from public.condominium_installments where period_id = p_period order by id for update;
    perform 1 from public.transactions where recurrence_id in(select planned_recurrence_id from public.condominium_installments where period_id = p_period) order by id for update;
    if exists(select 1 from public.condominium_installments i where i.period_id = p_period and i.amount > 0 and i.paid_at is null
      and not exists(select 1 from public.transactions t where t.recurrence_id = i.planned_recurrence_id and t.confirmed_at is not null)) then
      raise exception 'Ci sono rate ancora da pagare: la gestione resta aperta';
    end if;
    select coalesce(sum(amount),0),coalesce(sum(amount + credit_applied) filter(where kind = 'regular'),0)
      into total_paid, regular_covered from public.condominium_installments where period_id = p_period;
    if current_period.final_amount is not null and current_period.final_amount <> total_paid then raise exception 'Il saldo consuntivo non è in pareggio: regola il saldo prima di chiudere'; end if;
    if current_period.final_amount is null and current_period.budget_amount <> regular_covered then raise exception 'Preventivo e rate non coincidono: completa il piano o inserisci il consuntivo prima di chiudere'; end if;
    update public.condominium_periods set status = 'archived', closing_balance = 0, updated_at = now() where id = p_period;
  else
    if exists(select 1 from public.condominium_periods where user_id = auth.uid() and management_type = 'extraordinary' and status = 'active' and id <> p_period) then raise exception 'Un’altra gestione straordinaria è già aperta'; end if;
    update public.condominium_periods set status = 'active', updated_at = now() where id = p_period;
  end if;
end;
$$;
revoke all on function public.set_condominium_management_closed(uuid,boolean,timestamptz) from public, anon;
grant execute on function public.set_condominium_management_closed(uuid,boolean,timestamptz) to authenticated;

commit;

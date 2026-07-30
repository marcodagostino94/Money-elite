-- Ripara le policy RLS e garantisce il profilo per gli utenti creati prima del trigger.
begin;
drop policy if exists profiles_owner on public.profiles;
drop policy if exists accounts_owner on public.accounts;
drop policy if exists cards_owner on public.cards;
drop policy if exists categories_owner on public.categories;
drop policy if exists recurrences_owner on public.recurrences;
drop policy if exists transactions_owner on public.transactions;
drop policy if exists budgets_owner on public.budgets;
drop policy if exists debts_owner on public.debts;
create policy profiles_owner on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy accounts_owner on public.accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cards_owner on public.cards for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy categories_owner on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recurrences_owner on public.recurrences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_owner on public.transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy budgets_owner on public.budgets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debts_owner on public.debts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.ensure_money_elite_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Utente non autenticato'; end if;
  insert into public.profiles (id, display_name)
  values (auth.uid(), coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', 'Marco'))
  on conflict (id) do nothing;
end;
$$;
grant execute on function public.ensure_money_elite_profile() to authenticated;
commit;

-- Money Elite: i criteri RLS decidono quali righe può vedere ogni utente.
-- Servono inoltre i normali permessi PostgreSQL per il ruolo autenticato.
grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.accounts,
  public.cards,
  public.categories,
  public.transactions,
  public.recurrences,
  public.budgets,
  public.debts
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

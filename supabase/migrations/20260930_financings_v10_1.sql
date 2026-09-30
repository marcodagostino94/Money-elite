-- Money Elite v10.1 · piano rateale modificabile
alter table public.financings
  add column if not exists installment_schedule jsonb not null default '[]'::jsonb;

grant select, insert, update, delete on public.financings to authenticated;
grant select, insert, update, delete on public.financings to service_role;

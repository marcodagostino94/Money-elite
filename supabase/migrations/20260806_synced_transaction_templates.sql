-- Money Elite v4.8 · modelli di transazione sincronizzati
create table if not exists public.transaction_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  account text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transaction_templates_user_idx on public.transaction_templates(user_id);
alter table public.transaction_templates enable row level security;
drop policy if exists transaction_templates_owner on public.transaction_templates;
create policy transaction_templates_owner on public.transaction_templates for all to authenticated
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.touch_transaction_template_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists transaction_templates_updated_at on public.transaction_templates;
create trigger transaction_templates_updated_at before update on public.transaction_templates
for each row execute function public.touch_transaction_template_updated_at();

grant select,insert,update,delete on public.transaction_templates to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.transaction_templates;
exception when duplicate_object then null;
end $$;

-- Money Elite v4.7.3 · categoria degli interessi maturati
do $$
declare
  current_user_id uuid;
  parent_category_id uuid;
begin
  for current_user_id in select id from public.profiles loop
    select id into parent_category_id
    from public.categories
    where user_id=current_user_id and kind='income' and lower(name)=lower('Proventi Finanziari')
    limit 1;

    if parent_category_id is null then
      insert into public.categories(user_id,parent_id,name,kind,color,icon)
      values(current_user_id,null,'Proventi Finanziari','income','#d9792b','finance')
      returning id into parent_category_id;
    end if;

    if not exists (
      select 1 from public.categories
      where user_id=current_user_id and parent_id=parent_category_id and lower(name)=lower('Interessi maturati')
    ) then
      insert into public.categories(user_id,parent_id,name,kind,color,icon)
      values(current_user_id,parent_category_id,'Interessi maturati','income','#d9792b','finance');
    end if;
  end loop;
end $$;

-- Collega anche gli interessi già creati dalla versione precedente.
update public.transactions transaction
set category_id=category.id
from public.categories category
where transaction.user_id=category.user_id
  and transaction.notes='Interesse giornaliero automatico'
  and category.kind='income'
  and lower(category.name)=lower('Interessi maturati')
  and transaction.category_id is null;

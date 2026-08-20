create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('admin','store'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_txn_type as enum ('IN','OUT'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text unique not null,
 full_name text,
 role public.user_role not null default 'store',
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create policy "profiles read own/admin" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,full_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.items(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text not null default 'General',
 unit text not null default 'KG',
 min_stock numeric(14,3) not null default 0,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists items_name_lower_unique on public.items(lower(name));
alter table public.items enable row level security;
create policy "items read authenticated" on public.items for select to authenticated using(true);
create policy "items admin insert" on public.items for insert to authenticated with check(public.is_admin());
create policy "items admin update" on public.items for update to authenticated using(public.is_admin()) with check(public.is_admin());

create table if not exists public.stock_transactions(
 id uuid primary key default gen_random_uuid(),
 txn_type public.stock_txn_type not null,
 txn_date date not null default current_date,
 reference_no text,
 notes text,
 total_value numeric(14,2) not null default 0,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create table if not exists public.stock_transaction_items(
 id uuid primary key default gen_random_uuid(),
 transaction_id uuid not null references public.stock_transactions(id) on delete cascade,
 item_id uuid not null references public.items(id),
 quantity numeric(14,3) not null check(quantity>0),
 rate numeric(14,2) not null check(rate>=0),
 amount numeric(14,2) generated always as(round(quantity*rate,2)) stored
);
create index if not exists stock_txn_items_item_idx on public.stock_transaction_items(item_id);
create index if not exists stock_txn_date_idx on public.stock_transactions(txn_date);
alter table public.stock_transactions enable row level security;
alter table public.stock_transaction_items enable row level security;
create policy "stock transactions read" on public.stock_transactions for select to authenticated using(true);
create policy "stock transaction items read" on public.stock_transaction_items for select to authenticated using(true);

create or replace view public.inventory_summary with(security_invoker=true) as
select i.id,i.name,i.category,i.unit,i.min_stock,i.active,
coalesce(sum(case when st.txn_type='IN' then sti.quantity else 0 end),0) stock_in_qty,
coalesce(sum(case when st.txn_type='OUT' then sti.quantity else 0 end),0) stock_out_qty,
coalesce(sum(case when st.txn_type='IN' then sti.quantity else -sti.quantity end),0) current_qty,
coalesce(sum(case when st.txn_type='IN' then sti.amount else -sti.amount end),0) current_value,
case when coalesce(sum(case when st.txn_type='IN' then sti.quantity else -sti.quantity end),0)>0 then round(coalesce(sum(case when st.txn_type='IN' then sti.amount else -sti.amount end),0)/coalesce(sum(case when st.txn_type='IN' then sti.quantity else -sti.quantity end),1),2) else 0 end avg_rate
from public.items i left join public.stock_transaction_items sti on sti.item_id=i.id left join public.stock_transactions st on st.id=sti.transaction_id
where i.active=true group by i.id,i.name,i.category,i.unit,i.min_stock,i.active;
grant select on public.inventory_summary to authenticated;

create or replace function public.create_stock_in(p_txn_date date,p_reference_no text,p_notes text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; r jsonb; total numeric(14,2):=0; u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from public.profiles where id=u) then raise exception 'Not authenticated'; end if;
 if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'At least one item is required'; end if;
 insert into public.stock_transactions(txn_type,txn_date,reference_no,notes,created_by) values('IN',coalesce(p_txn_date,current_date),nullif(trim(p_reference_no),''),nullif(trim(p_notes),''),u) returning id into v_id;
 for r in select * from jsonb_array_elements(p_items) loop
  if (r->>'quantity')::numeric<=0 or (r->>'rate')::numeric<0 then raise exception 'Invalid Stock In line'; end if;
  insert into public.stock_transaction_items(transaction_id,item_id,quantity,rate) values(v_id,(r->>'item_id')::uuid,(r->>'quantity')::numeric,(r->>'rate')::numeric);
  total:=total+round((r->>'quantity')::numeric*(r->>'rate')::numeric,2);
 end loop;
 update public.stock_transactions set total_value=total where id=v_id; return v_id;
end; $$;
grant execute on function public.create_stock_in(date,text,text,jsonb) to authenticated;

create or replace function public.create_stock_out(p_txn_date date,p_reference_no text,p_notes text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; r jsonb; item uuid; q numeric(14,3); current_q numeric(14,3); current_v numeric(14,2); rate numeric(14,2); total numeric(14,2):=0; u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from public.profiles where id=u) then raise exception 'Not authenticated'; end if;
 if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'At least one item is required'; end if;
 insert into public.stock_transactions(txn_type,txn_date,reference_no,notes,created_by) values('OUT',coalesce(p_txn_date,current_date),nullif(trim(p_reference_no),''),nullif(trim(p_notes),''),u) returning id into v_id;
 for r in select * from jsonb_array_elements(p_items) loop
  item:=(r->>'item_id')::uuid; q:=(r->>'quantity')::numeric;
  if q<=0 then raise exception 'Quantity must be greater than zero'; end if;
  perform 1 from public.items where id=item for update;
  select coalesce(sum(case when st.txn_type='IN' then sti.quantity else -sti.quantity end),0),coalesce(sum(case when st.txn_type='IN' then sti.amount else -sti.amount end),0) into current_q,current_v from public.stock_transaction_items sti join public.stock_transactions st on st.id=sti.transaction_id where sti.item_id=item;
  if current_q<q then raise exception 'Insufficient stock. Available: %, requested: %',current_q,q; end if;
  rate:=case when current_q>0 then round(current_v/current_q,2) else 0 end;
  insert into public.stock_transaction_items(transaction_id,item_id,quantity,rate) values(v_id,item,q,rate);
  total:=total+round(q*rate,2);
 end loop;
 update public.stock_transactions set total_value=total where id=v_id; return v_id;
end; $$;
grant execute on function public.create_stock_out(date,text,text,jsonb) to authenticated;

-- Optional starter data: uncomment and run if useful.
-- insert into public.items(name,category,unit,min_stock) values
-- ('Apple','Fruits','KG',10),('Banana','Fruits','KG',10),('Papaya','Fruits','KG',5),
-- ('Watermelon','Fruits','KG',10),('Bowl','Packaging','PCS',200),('Lid','Packaging','PCS',200),('Juice Bottle','Packaging','PCS',100)
-- on conflict do nothing;

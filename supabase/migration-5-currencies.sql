alter table public.operations add column if not exists currency text not null default 'BYN';
alter table public.operations add column if not exists amount_orig numeric(14, 2);
alter table public.operations add column if not exists rate numeric(14, 6) not null default 1;
update public.operations set amount_orig = amount where amount_orig is null;

alter table public.stash_moves add column if not exists currency text not null default 'BYN';
alter table public.stash_moves add column if not exists amount_orig numeric(14, 2);
alter table public.stash_moves add column if not exists rate numeric(14, 6) not null default 1;
update public.stash_moves set amount_orig = amount where amount_orig is null;

create table if not exists public.fx_rates (
  code text primary key,
  rate numeric not null,
  scale int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.fx_rates enable row level security;
drop policy if exists "fx rates readable" on public.fx_rates;
create policy "fx rates readable" on public.fx_rates for select using (true);

create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  rate numeric(14, 6) not null,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.rates enable row level security;
drop policy if exists "users manage own rates" on public.rates;
create policy "users manage own rates" on public.rates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

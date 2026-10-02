create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '💰',
  color text not null default '#98989d',
  type text not null check (type in ('income', 'expense')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_user on public.categories (user_id);
create index if not exists idx_operations_user_date on public.operations (user_id, date desc);
create index if not exists idx_operations_category on public.operations (category_id);

alter table public.categories enable row level security;
alter table public.operations enable row level security;

drop policy if exists "users manage own categories" on public.categories;
create policy "users manage own categories" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own operations" on public.operations;
create policy "users manage own operations" on public.operations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

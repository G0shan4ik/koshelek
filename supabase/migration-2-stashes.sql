create table if not exists public.stashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('safe', 'piggy')),
  name text,
  goal numeric(14, 2),
  icon text not null default '🐷',
  color text not null default '#ffd60a',
  created_at timestamptz not null default now()
);

create table if not exists public.stash_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stash_id uuid not null references public.stashes (id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_stashes_user on public.stashes (user_id);
create index if not exists idx_stash_moves_user_date on public.stash_moves (user_id, date desc);
create index if not exists idx_stash_moves_stash on public.stash_moves (stash_id);

alter table public.stashes enable row level security;
alter table public.stash_moves enable row level security;

drop policy if exists "users manage own stashes" on public.stashes;
create policy "users manage own stashes" on public.stashes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own stash moves" on public.stash_moves;
create policy "users manage own stash moves" on public.stash_moves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

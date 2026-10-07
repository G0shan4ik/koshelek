alter table public.stash_moves add column if not exists operation_id uuid references public.operations (id) on delete cascade;

create index if not exists idx_stash_moves_operation on public.stash_moves (operation_id);

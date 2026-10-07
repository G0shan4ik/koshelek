alter table public.stashes add column if not exists status text not null default 'open';
alter table public.stashes add column if not exists closed_reason text;
alter table public.stashes add column if not exists closed_at timestamptz;

alter table public.stashes drop constraint if exists stashes_status_check;
alter table public.stashes add constraint stashes_status_check check (status in ('open', 'closed'));

alter table public.stashes drop constraint if exists stashes_closed_reason_check;
alter table public.stashes add constraint stashes_closed_reason_check check (closed_reason in ('return', 'spent'));

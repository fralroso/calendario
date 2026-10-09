-- Tabla de actividades. Pegar completo en Supabase > SQL Editor > Run.
-- Se puede ejecutar varias veces sin error.

create table if not exists public.activities (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  date             text not null,
  start_time       text not null,
  end_time         text,
  priority         text not null default 'none',
  location         text not null default '',
  notes            text not null default '',
  reminder_minutes integer,
  status           text not null default 'pending',
  source           text not null default 'typed',
  created_at       bigint not null,
  updated_at       bigint not null,
  deleted_at       bigint
);

create index if not exists activities_user_updated_idx
  on public.activities (user_id, updated_at);

-- Cada persona solo puede ver y modificar sus propias actividades.
alter table public.activities enable row level security;

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities
  for select using (auth.uid() = user_id);

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert with check (auth.uid() = user_id);

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own" on public.activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own" on public.activities
  for delete using (auth.uid() = user_id);

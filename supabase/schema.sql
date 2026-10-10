-- Tabla de actividades. Pegar completo en Supabase > SQL Editor > Run.
-- Se puede ejecutar varias veces sin error.

create table if not exists public.activities (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  category         text not null default 'other',
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

-- Para proyectos creados con la versión anterior (sin "tipo"):
alter table public.activities add column if not exists category text not null default 'other';

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


-- ---------- Pendientes (tareas con fecha límite) ----------
create table if not exists public.tasks (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  due_date    text not null,
  priority    text not null default 'none',
  notes       text not null default '',
  status      text not null default 'pending',
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

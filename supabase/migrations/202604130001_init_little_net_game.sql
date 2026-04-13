create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_name') then
    create type public.team_name as enum ('red', 'blue');
  end if;

  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type public.room_status as enum ('open', 'locked');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_phase') then
    create type public.match_phase as enum ('countdown', 'active', 'finished');
  end if;
end
$$;

create table if not exists public.player_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 10),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 4),
  capacity integer not null check (capacity in (2, 3, 4, 6)),
  grade_label text not null default '小学二年级',
  host_player_id uuid not null references public.player_profiles (id) on delete cascade,
  status public.room_status not null default 'open',
  active_match_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  team public.team_name not null default 'red',
  joined_at timestamptz not null default timezone('utc'::text, now()),
  primary key (room_id, player_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  mode text not null check (mode in ('1v1', '1v2', '1v3', '2v2', '3v3')),
  phase public.match_phase not null default 'countdown',
  winner_team public.team_name,
  win_reason text,
  current_question_id uuid,
  started_at timestamptz not null default timezone('utc'::text, now()),
  ends_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.match_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  team public.team_name not null,
  member_count integer not null check (member_count between 1 and 3),
  hp_max integer not null,
  hp_current integer not null,
  damage_multiplier numeric(4, 2) not null,
  unique (match_id, team)
);

create table if not exists public.question_templates (
  id uuid primary key default gen_random_uuid(),
  difficulty integer not null check (difficulty between 1 and 4),
  question_type text not null,
  prompt text not null,
  answer_kind text not null check (answer_kind in ('single-number', 'quotient-remainder')),
  correct_answer jsonb not null,
  damage integer not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.match_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  question_index integer not null,
  prompt text not null,
  difficulty integer not null check (difficulty between 1 and 4),
  answer_kind text not null check (answer_kind in ('single-number', 'quotient-remainder')),
  correct_answer jsonb not null,
  damage integer not null,
  opens_at timestamptz not null default timezone('utc'::text, now()),
  deadline_at timestamptz not null,
  answered_by_team public.team_name,
  unique (match_id, question_index)
);

create table if not exists public.answer_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  question_id uuid not null references public.match_questions (id) on delete cascade,
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  team public.team_name not null,
  answer_payload jsonb not null,
  is_correct boolean not null,
  outcome text not null default 'recorded',
  submitted_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  event_type text not null,
  team public.team_name,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.rooms
  add constraint rooms_active_match_id_fkey
  foreign key (active_match_id)
  references public.matches (id)
  on delete set null;

alter table public.matches
  add constraint matches_current_question_id_fkey
  foreign key (current_question_id)
  references public.match_questions (id)
  on delete set null;

create index if not exists room_members_player_idx on public.room_members (player_id);
create index if not exists matches_room_idx on public.matches (room_id);
create index if not exists match_questions_match_idx on public.match_questions (match_id, question_index desc);
create index if not exists answer_submissions_match_question_idx on public.answer_submissions (match_id, question_id);
create index if not exists match_events_match_idx on public.match_events (match_id, created_at desc);

alter table public.player_profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.question_templates enable row level security;
alter table public.match_questions enable row level security;
alter table public.answer_submissions enable row level security;
alter table public.match_events enable row level security;

create policy "profiles_select_self"
on public.player_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_self"
on public.player_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_self"
on public.player_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "rooms_visible_to_members"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members
    where room_members.room_id = rooms.id
      and room_members.player_id = (select auth.uid())
  )
);

create policy "rooms_insert_for_host"
on public.rooms
for insert
to authenticated
with check ((select auth.uid()) = host_player_id);

create policy "rooms_host_update"
on public.rooms
for update
to authenticated
using ((select auth.uid()) = host_player_id)
with check ((select auth.uid()) = host_player_id);

create policy "room_members_visible_to_members"
on public.room_members
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members viewer
    where viewer.room_id = room_members.room_id
      and viewer.player_id = (select auth.uid())
  )
);

create policy "room_members_join_self"
on public.room_members
for insert
to authenticated
with check ((select auth.uid()) = player_id);

create policy "room_members_update_self"
on public.room_members
for update
to authenticated
using ((select auth.uid()) = player_id)
with check ((select auth.uid()) = player_id);

create policy "matches_visible_to_room_members"
on public.matches
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members
    where room_members.room_id = matches.room_id
      and room_members.player_id = (select auth.uid())
  )
);

create policy "match_teams_visible_to_room_members"
on public.match_teams
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = match_teams.match_id
      and room_members.player_id = (select auth.uid())
  )
);

create policy "question_templates_visible_to_authenticated"
on public.question_templates
for select
to authenticated
using (true);

create policy "match_questions_visible_to_room_members"
on public.match_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = match_questions.match_id
      and room_members.player_id = (select auth.uid())
  )
);

create policy "answer_submissions_visible_to_room_members"
on public.answer_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = answer_submissions.match_id
      and room_members.player_id = (select auth.uid())
  )
);

create policy "answer_submissions_insert_self"
on public.answer_submissions
for insert
to authenticated
with check ((select auth.uid()) = player_id);

create policy "match_events_visible_to_room_members"
on public.match_events
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = match_events.match_id
      and room_members.player_id = (select auth.uid())
  )
);

insert into public.question_templates (difficulty, question_type, prompt, answer_kind, correct_answer, damage)
values
  (1, 'addition', '8 + 7 = ?', 'single-number', '{"value":15}'::jsonb, 6),
  (1, 'subtraction', '16 - 7 = ?', 'single-number', '{"value":9}'::jsonb, 6),
  (2, 'addition', '27 + 15 = ?', 'single-number', '{"value":42}'::jsonb, 8),
  (2, 'subtraction', '43 - 18 = ?', 'single-number', '{"value":25}'::jsonb, 8),
  (3, 'multiplication', '6 × 4 = ?', 'single-number', '{"value":24}'::jsonb, 10),
  (3, 'division', '18 ÷ 3 = ?', 'single-number', '{"value":6}'::jsonb, 10),
  (4, 'remainder-division', '17 ÷ 5 = ? ……余几？', 'quotient-remainder', '{"quotient":3,"remainder":2}'::jsonb, 12),
  (4, 'remainder-division', '22 ÷ 6 = ? ……余几？', 'quotient-remainder', '{"quotient":3,"remainder":4}'::jsonb, 12)
on conflict do nothing;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_teams;
alter publication supabase_realtime add table public.match_questions;
alter publication supabase_realtime add table public.match_events;

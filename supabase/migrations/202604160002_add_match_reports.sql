create table if not exists public.match_reports (
  match_id uuid primary key references public.matches (id) on delete cascade,
  room_code text not null,
  winner_team public.team_name not null,
  win_reason text not null,
  duration_ms integer not null,
  total_correct jsonb not null,
  final_hp jsonb not null,
  final_event_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.match_reports enable row level security;

create policy "match_reports_visible_to_room_members"
on public.match_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = match_reports.match_id
      and room_members.player_id = (select auth.uid())
  )
);

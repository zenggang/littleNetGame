alter table public.matches
  add column if not exists last_hit_team public.team_name;

alter table public.match_questions
  add column if not exists question_type text not null default 'addition';

create policy "profiles_select_room_peers"
on public.player_profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or exists (
    select 1
    from public.room_members viewer
    join public.room_members peer on peer.room_id = viewer.room_id
    where viewer.player_id = (select auth.uid())
      and peer.player_id = player_profiles.id
  )
);

create or replace function public.ensure_player_profile(p_nickname text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nickname text;
  v_profile public.player_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_nickname := left(trim(coalesce(p_nickname, '')), 10);

  if v_nickname is null or char_length(v_nickname) = 0 then
    select nickname
    into v_nickname
    from public.player_profiles
    where id = v_uid;
  end if;

  if v_nickname is null or char_length(v_nickname) = 0 then
    v_nickname := '玩家' || floor(random() * 900 + 100)::int;
  end if;

  insert into public.player_profiles (id, nickname)
  values (v_uid, v_nickname)
  on conflict (id) do update
    set nickname = excluded.nickname,
        updated_at = timezone('utc'::text, now())
  returning *
  into v_profile;

  return jsonb_build_object(
    'playerId', v_profile.id,
    'nickname', v_profile.nickname
  );
end;
$$;

create or replace function public.game_detect_match_mode(p_red integer, p_blue integer)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_low integer := least(p_red, p_blue);
  v_high integer := greatest(p_red, p_blue);
  v_mode text;
begin
  if v_low <= 0 then
    return null;
  end if;

  v_mode := v_low::text || 'v' || v_high::text;

  if v_mode in ('1v1', '1v2', '1v3', '2v2', '3v3') then
    return v_mode;
  end if;

  return null;
end;
$$;

create or replace function public.game_can_start(
  p_capacity integer,
  p_red integer,
  p_blue integer
)
returns boolean
language sql
set search_path = public
as $$
  select (p_red + p_blue = p_capacity)
    and p_capacity in (2, 3, 4, 6)
    and public.game_detect_match_mode(p_red, p_blue) is not null;
$$;

create or replace function public.game_create_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_attempt integer;
begin
  for v_attempt in 1..100 loop
    v_code :=
      substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1)
      || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1)
      || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1)
      || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);

    if not exists (
      select 1
      from public.rooms
      where code = v_code
    ) then
      return v_code;
    end if;
  end loop;

  return upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
end;
$$;

create or replace function public.game_pick_winner_on_time(
  p_match_id uuid,
  p_red_hp integer,
  p_blue_hp integer,
  p_last_hit_team public.team_name
)
returns public.team_name
language plpgsql
security definer
set search_path = public
as $$
declare
  v_red_correct integer;
  v_blue_correct integer;
begin
  if p_red_hp <> p_blue_hp then
    return case when p_red_hp > p_blue_hp then 'red' else 'blue' end;
  end if;

  select count(*) filter (where team = 'red'),
         count(*) filter (where team = 'blue')
  into v_red_correct, v_blue_correct
  from public.answer_submissions
  where match_id = p_match_id
    and is_correct is true;

  if coalesce(v_red_correct, 0) <> coalesce(v_blue_correct, 0) then
    return case when coalesce(v_red_correct, 0) > coalesce(v_blue_correct, 0) then 'red' else 'blue' end;
  end if;

  return coalesce(p_last_hit_team, 'red');
end;
$$;

create or replace function public.game_finish_match(
  p_match_id uuid,
  p_reason text,
  p_winner public.team_name default null
)
returns public.team_name
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_room public.rooms%rowtype;
  v_red_hp integer;
  v_blue_hp integer;
  v_winner public.team_name;
begin
  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;

  select *
  into v_room
  from public.rooms
  where id = v_match.room_id
  for update;

  select hp_current
  into v_red_hp
  from public.match_teams
  where match_id = p_match_id
    and team = 'red';

  select hp_current
  into v_blue_hp
  from public.match_teams
  where match_id = p_match_id
    and team = 'blue';

  v_winner := coalesce(
    p_winner,
    public.game_pick_winner_on_time(
      p_match_id,
      coalesce(v_red_hp, 0),
      coalesce(v_blue_hp, 0),
      v_match.last_hit_team
    )
  );

  update public.matches
  set phase = 'finished',
      winner_team = v_winner,
      win_reason = p_reason,
      ended_at = clock_timestamp()
  where id = p_match_id;

  update public.rooms
  set status = 'open',
      active_match_id = null
  where id = v_match.room_id;

  insert into public.match_events (match_id, event_type, team, message, payload, created_at)
  values (
    p_match_id,
    'match_finished',
    v_winner,
    case when v_winner = 'red' then '红队获胜！' else '蓝队获胜！' end,
    '{}'::jsonb,
    clock_timestamp()
  );

  return v_winner;
end;
$$;

create or replace function public.game_insert_next_question(
  p_match_id uuid,
  p_open_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.question_templates%rowtype;
  v_question_id uuid;
  v_question_index integer;
begin
  select qt.*
  into v_template
  from public.question_templates qt
  where qt.prompt not in (
    select prompt
    from public.match_questions
    where match_id = p_match_id
    order by question_index desc
    limit 4
  )
  order by random()
  limit 1;

  if v_template.id is null then
    select *
    into v_template
    from public.question_templates
    order by random()
    limit 1;
  end if;

  select coalesce(max(question_index), 0) + 1
  into v_question_index
  from public.match_questions
  where match_id = p_match_id;

  insert into public.match_questions (
    match_id,
    question_index,
    prompt,
    difficulty,
    question_type,
    answer_kind,
    correct_answer,
    damage,
    opens_at,
    deadline_at
  )
  values (
    p_match_id,
    v_question_index,
    v_template.prompt,
    v_template.difficulty,
    v_template.question_type,
    v_template.answer_kind,
    v_template.correct_answer,
    v_template.damage,
    p_open_at,
    p_open_at + interval '8 seconds'
  )
  returning id
  into v_question_id;

  update public.matches
  set current_question_id = v_question_id
  where id = p_match_id;

  insert into public.match_events (match_id, event_type, message, payload, created_at)
  values (
    p_match_id,
    'question_spawned',
    '第 ' || v_question_index::text || ' 题：' || v_template.prompt,
    jsonb_build_object('questionId', v_question_id, 'questionIndex', v_question_index),
    clock_timestamp()
  );

  return v_question_id;
end;
$$;

create or replace function public.game_room_snapshot(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_profile jsonb;
  v_members jsonb := '[]'::jsonb;
  v_viewer jsonb := null;
  v_red integer := 0;
  v_blue integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_profile := public.ensure_player_profile(null);

  select *
  into v_room
  from public.rooms
  where code = upper(trim(coalesce(p_room_code, '')));

  if not found then
    return jsonb_build_object(
      'room', null,
      'members', '[]'::jsonb,
      'match', null,
      'viewer', null,
      'canStart', false,
      'session', v_profile
    );
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'playerId', rm.player_id,
          'nickname', pp.nickname,
          'team', rm.team,
          'joinedAt', rm.joined_at
        )
        order by rm.joined_at
      ),
      '[]'::jsonb
    ),
    count(*) filter (where rm.team = 'red'),
    count(*) filter (where rm.team = 'blue')
  into v_members, v_red, v_blue
  from public.room_members rm
  join public.player_profiles pp on pp.id = rm.player_id
  where rm.room_id = v_room.id;

  select jsonb_build_object(
    'playerId', rm.player_id,
    'nickname', pp.nickname,
    'team', rm.team,
    'joinedAt', rm.joined_at
  )
  into v_viewer
  from public.room_members rm
  join public.player_profiles pp on pp.id = rm.player_id
  where rm.room_id = v_room.id
    and rm.player_id = v_uid;

  return jsonb_build_object(
    'room',
    jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'gradeLabel', v_room.grade_label,
      'capacity', v_room.capacity,
      'hostPlayerId', v_room.host_player_id,
      'status', v_room.status,
      'activeMatchId', v_room.active_match_id,
      'createdAt', v_room.created_at
    ),
    'members', v_members,
    'match', null,
    'viewer', v_viewer,
    'canStart', public.game_can_start(v_room.capacity, v_red, v_blue),
    'session', v_profile
  );
end;
$$;

create or replace function public.game_match_snapshot(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_match public.matches%rowtype;
  v_room public.rooms%rowtype;
  v_members jsonb := '[]'::jsonb;
  v_viewer jsonb := null;
  v_red_team jsonb;
  v_blue_team jsonb;
  v_question jsonb := null;
  v_events jsonb := '[]'::jsonb;
  v_recent_prompts jsonb := '[]'::jsonb;
  v_red_correct integer := 0;
  v_blue_correct integer := 0;
  v_cooldown_until bigint := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_profile := public.ensure_player_profile(null);

  select *
  into v_match
  from public.matches
  where id = p_match_id;

  if not found then
    return jsonb_build_object(
      'match', null,
      'room', null,
      'members', '[]'::jsonb,
      'viewer', null,
      'session', v_profile
    );
  end if;

  if not exists (
    select 1
    from public.room_members
    where room_id = v_match.room_id
      and player_id = v_uid
  ) then
    raise exception 'MATCH_FORBIDDEN';
  end if;

  select *
  into v_room
  from public.rooms
  where id = v_match.room_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'playerId', rm.player_id,
        'nickname', pp.nickname,
        'team', rm.team,
        'joinedAt', rm.joined_at
      )
      order by rm.joined_at
    ),
    '[]'::jsonb
  )
  into v_members
  from public.room_members rm
  join public.player_profiles pp on pp.id = rm.player_id
  where rm.room_id = v_room.id;

  select jsonb_build_object(
    'playerId', rm.player_id,
    'nickname', pp.nickname,
    'team', rm.team,
    'joinedAt', rm.joined_at
  )
  into v_viewer
  from public.room_members rm
  join public.player_profiles pp on pp.id = rm.player_id
  where rm.room_id = v_room.id
    and rm.player_id = v_uid;

  select jsonb_build_object(
    'name', mt.team,
    'hpMax', mt.hp_max,
    'hpCurrent', mt.hp_current,
    'damageMultiplier', mt.damage_multiplier
  )
  into v_red_team
  from public.match_teams mt
  where mt.match_id = p_match_id
    and mt.team = 'red';

  select jsonb_build_object(
    'name', mt.team,
    'hpMax', mt.hp_max,
    'hpCurrent', mt.hp_current,
    'damageMultiplier', mt.damage_multiplier
  )
  into v_blue_team
  from public.match_teams mt
  where mt.match_id = p_match_id
    and mt.team = 'blue';

  select jsonb_build_object(
    'key', mq.id,
    'difficulty', mq.difficulty,
    'type', mq.question_type,
    'prompt', mq.prompt,
    'answerKind', mq.answer_kind,
    'damage', mq.damage,
    'correctAnswer', mq.correct_answer,
    'meta', '{}'::jsonb
  )
  into v_question
  from public.match_questions mq
  where mq.id = v_match.current_question_id;

  select count(*) filter (where team = 'red'),
         count(*) filter (where team = 'blue')
  into v_red_correct, v_blue_correct
  from public.answer_submissions
  where match_id = p_match_id
    and is_correct is true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', event_rows.id,
        'type', event_rows.event_type,
        'text', event_rows.message,
        'createdAt', event_rows.created_at,
        'team', event_rows.team,
        'targetTeam', event_rows.payload ->> 'targetTeam',
        'damage', case
          when event_rows.payload ? 'damage' then (event_rows.payload ->> 'damage')::integer
          else null
        end
      )
      order by event_rows.created_at desc
    ),
    '[]'::jsonb
  )
  into v_events
  from (
    select *
    from public.match_events
    where match_id = p_match_id
    order by created_at desc
    limit 20
  ) event_rows;

  select coalesce(
    jsonb_agg(question_rows.prompt order by question_rows.question_index desc),
    '[]'::jsonb
  )
  into v_recent_prompts
  from (
    select prompt, question_index
    from public.match_questions
    where match_id = p_match_id
    order by question_index desc
    limit 6
  ) question_rows;

  select coalesce(
    floor(
      extract(
        epoch
        from max(submitted_at) + interval '1 second'
      ) * 1000
    )::bigint,
    0
  )
  into v_cooldown_until
  from public.answer_submissions
  where match_id = p_match_id
    and player_id = v_uid
    and is_correct is false
    and submitted_at > clock_timestamp() - interval '1 second';

  return jsonb_build_object(
    'room',
    jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'gradeLabel', v_room.grade_label,
      'capacity', v_room.capacity,
      'hostPlayerId', v_room.host_player_id,
      'status', v_room.status,
      'activeMatchId', v_room.active_match_id,
      'createdAt', v_room.created_at
    ),
    'members', v_members,
    'viewer', v_viewer,
    'session', v_profile,
    'match',
    jsonb_build_object(
      'id', v_match.id,
      'roomCode', v_room.code,
      'mode', v_match.mode,
      'phase', v_match.phase,
      'teams', jsonb_build_object(
        'red', coalesce(v_red_team, '{}'::jsonb),
        'blue', coalesce(v_blue_team, '{}'::jsonb)
      ),
      'totalCorrect', jsonb_build_object(
        'red', coalesce(v_red_correct, 0),
        'blue', coalesce(v_blue_correct, 0)
      ),
      'currentQuestion', v_question,
      'questionIndex', (
        select question_index
        from public.match_questions
        where id = v_match.current_question_id
      ),
      'questionDeadlineAt', (
        select deadline_at
        from public.match_questions
        where id = v_match.current_question_id
      ),
      'countdownEndsAt', v_match.started_at + interval '3 seconds',
      'endsAt', v_match.ends_at,
      'recentPrompts', v_recent_prompts,
      'winner', v_match.winner_team,
      'winReason', v_match.win_reason,
      'lastHitTeam', v_match.last_hit_team,
      'cooldowns', jsonb_build_object(v_uid::text, coalesce(v_cooldown_until, 0)),
      'events', v_events,
      'createdAt', v_match.started_at,
      'endedAt', v_match.ended_at
    )
  );
end;
$$;

create or replace function public.game_create_room(
  p_capacity integer,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_code text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_capacity not in (2, 3, 4, 6) then
    raise exception 'BAD_CAPACITY';
  end if;

  perform public.ensure_player_profile(p_nickname);
  v_code := public.game_create_room_code();

  insert into public.rooms (code, capacity, host_player_id)
  values (v_code, p_capacity, v_uid)
  returning *
  into v_room;

  insert into public.room_members (room_id, player_id, team)
  values (v_room.id, v_uid, 'red')
  on conflict (room_id, player_id) do nothing;

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code
  );
end;
$$;

create or replace function public.game_join_room(
  p_room_code text,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_red integer := 0;
  v_blue integer := 0;
  v_total integer := 0;
  v_team public.team_name;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.ensure_player_profile(p_nickname);

  select *
  into v_room
  from public.rooms
  where code = upper(trim(coalesce(p_room_code, '')))
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.room_members
    where room_id = v_room.id
      and player_id = v_uid
  ) then
    return jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code
    );
  end if;

  select count(*) filter (where team = 'red'),
         count(*) filter (where team = 'blue'),
         count(*)
  into v_red, v_blue, v_total
  from public.room_members
  where room_id = v_room.id;

  if v_room.status <> 'open' or v_total >= v_room.capacity then
    raise exception 'ROOM_UNAVAILABLE';
  end if;

  v_team := case when v_red <= v_blue then 'red' else 'blue' end;

  insert into public.room_members (room_id, player_id, team)
  values (v_room.id, v_uid, v_team);

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code
  );
end;
$$;

create or replace function public.game_switch_team(
  p_room_code text,
  p_team public.team_name
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_room
  from public.rooms
  where code = upper(trim(coalesce(p_room_code, '')))
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.status <> 'open' then
    raise exception 'ROOM_LOCKED';
  end if;

  update public.room_members
  set team = p_team
  where room_id = v_room.id
    and player_id = v_uid;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.game_start_match(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_match_id uuid;
  v_red integer := 0;
  v_blue integer := 0;
  v_mode text;
  v_advantaged public.team_name;
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_room
  from public.rooms
  where code = upper(trim(coalesce(p_room_code, '')))
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.host_player_id <> v_uid then
    raise exception 'HOST_ONLY';
  end if;

  select count(*) filter (where team = 'red'),
         count(*) filter (where team = 'blue')
  into v_red, v_blue
  from public.room_members
  where room_id = v_room.id;

  if not public.game_can_start(v_room.capacity, v_red, v_blue) then
    raise exception 'CANNOT_START';
  end if;

  v_mode := public.game_detect_match_mode(v_red, v_blue);
  if v_mode is null then
    raise exception 'MODE_NOT_SUPPORTED';
  end if;

  v_advantaged := case when v_red <= v_blue then 'red' else 'blue' end;

  insert into public.matches (
    room_id,
    mode,
    phase,
    started_at,
    ends_at,
    last_hit_team
  )
  values (
    v_room.id,
    v_mode,
    'countdown',
    v_now,
    v_now + interval '63 seconds',
    null
  )
  returning id
  into v_match_id;

  insert into public.match_teams (match_id, team, member_count, hp_max, hp_current, damage_multiplier)
  values
    (
      v_match_id,
      'red',
      v_red,
      case
        when v_mode = '1v3' and v_advantaged = 'red' then 140
        when v_mode = '1v2' and v_advantaged = 'red' then 120
        when v_mode = '3v3' then 120
        else 100
      end,
      case
        when v_mode = '1v3' and v_advantaged = 'red' then 140
        when v_mode = '1v2' and v_advantaged = 'red' then 120
        when v_mode = '3v3' then 120
        else 100
      end,
      case
        when v_mode = '1v3' and v_advantaged = 'red' then 1.8
        when v_mode = '1v2' and v_advantaged = 'red' then 1.5
        else 1
      end
    ),
    (
      v_match_id,
      'blue',
      v_blue,
      case
        when v_mode = '1v3' and v_advantaged = 'blue' then 140
        when v_mode = '1v2' and v_advantaged = 'blue' then 120
        when v_mode = '3v3' then 120
        else 100
      end,
      case
        when v_mode = '1v3' and v_advantaged = 'blue' then 140
        when v_mode = '1v2' and v_advantaged = 'blue' then 120
        when v_mode = '3v3' then 120
        else 100
      end,
      case
        when v_mode = '1v3' and v_advantaged = 'blue' then 1.8
        when v_mode = '1v2' and v_advantaged = 'blue' then 1.5
        else 1
      end
    );

  update public.rooms
  set status = 'locked',
      active_match_id = v_match_id
  where id = v_room.id;

  insert into public.match_events (match_id, event_type, message, payload, created_at)
  values (
    v_match_id,
    'match_started',
    '房主发起了对战倒计时。',
    '{}'::jsonb,
    clock_timestamp()
  );

  perform public.game_insert_next_question(v_match_id, v_now + interval '3 seconds');

  return jsonb_build_object('id', v_match_id);
end;
$$;

create or replace function public.game_submit_answer(
  p_match_id uuid,
  p_answer_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_room public.rooms%rowtype;
  v_member public.room_members%rowtype;
  v_profile public.player_profiles%rowtype;
  v_question public.match_questions%rowtype;
  v_attacker public.match_teams%rowtype;
  v_defender public.match_teams%rowtype;
  v_now timestamptz := clock_timestamp();
  v_target_team public.team_name;
  v_is_correct boolean := false;
  v_damage integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', '对局不存在');
  end if;

  select *
  into v_room
  from public.rooms
  where id = v_match.room_id;

  select *
  into v_member
  from public.room_members
  where room_id = v_match.room_id
    and player_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'message', '你还不在这个房间里');
  end if;

  select *
  into v_profile
  from public.player_profiles
  where id = v_uid;

  if v_match.phase = 'countdown' then
    return jsonb_build_object('ok', false, 'message', '倒计时中，马上开始');
  end if;

  if v_match.phase = 'finished' then
    return jsonb_build_object('ok', false, 'message', '这局已经结束了');
  end if;

  if exists (
    select 1
    from public.answer_submissions
    where match_id = p_match_id
      and player_id = v_uid
      and is_correct is false
      and submitted_at > v_now - interval '1 second'
  ) then
    return jsonb_build_object('ok', false, 'message', '答错了，冷静 1 秒再来');
  end if;

  select *
  into v_question
  from public.match_questions
  where id = v_match.current_question_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', '当前题目不存在');
  end if;

  if v_now >= v_question.deadline_at then
    return jsonb_build_object('ok', false, 'message', '这题已经超时了');
  end if;

  if v_question.answered_by_team is not null then
    return jsonb_build_object('ok', false, 'message', '这题已经有人抢先答对了');
  end if;

  if v_question.answer_kind = 'single-number' then
    v_is_correct := (p_answer_payload ->> 'value')::integer = (v_question.correct_answer ->> 'value')::integer;
  else
    v_is_correct := (p_answer_payload ->> 'quotient')::integer = (v_question.correct_answer ->> 'quotient')::integer
      and (p_answer_payload ->> 'remainder')::integer = (v_question.correct_answer ->> 'remainder')::integer;
  end if;

  insert into public.answer_submissions (
    match_id,
    question_id,
    player_id,
    team,
    answer_payload,
    is_correct,
    outcome,
    submitted_at
  )
  values (
    p_match_id,
    v_question.id,
    v_uid,
    v_member.team,
    coalesce(p_answer_payload, '{}'::jsonb),
    v_is_correct,
    case when v_is_correct then 'recorded' else 'recorded' end,
    v_now
  );

  if not v_is_correct then
    insert into public.match_events (match_id, event_type, team, message, payload, created_at)
    values (
      p_match_id,
      'answer_wrong',
      v_member.team,
      coalesce(v_profile.nickname, '玩家') || ' 答错了，1 秒后再试。',
      '{}'::jsonb,
      clock_timestamp()
    );

    return jsonb_build_object('ok', false, 'message', '不对，再想一想');
  end if;

  v_target_team := case when v_member.team = 'red' then 'blue' else 'red' end;

  select *
  into v_attacker
  from public.match_teams
  where match_id = p_match_id
    and team = v_member.team
  for update;

  select *
  into v_defender
  from public.match_teams
  where match_id = p_match_id
    and team = v_target_team
  for update;

  v_damage := greatest(0, round(v_question.damage * v_attacker.damage_multiplier));

  update public.match_teams
  set hp_current = greatest(0, hp_current - v_damage)
  where id = v_defender.id
  returning *
  into v_defender;

  update public.match_questions
  set answered_by_team = v_member.team
  where id = v_question.id;

  update public.matches
  set last_hit_team = v_member.team
  where id = p_match_id;

  insert into public.match_events (match_id, event_type, team, message, payload, created_at)
  values (
    p_match_id,
    'answer_correct',
    v_member.team,
    coalesce(v_profile.nickname, '玩家') || ' 抢先答对了，' || case when v_member.team = 'red' then '红队' else '蓝队' end || '发起进攻！',
    jsonb_build_object('targetTeam', v_target_team, 'damage', v_damage),
    clock_timestamp()
  );

  insert into public.match_events (match_id, event_type, team, message, payload, created_at)
  values (
    p_match_id,
    'hp_changed',
    v_member.team,
    '红队 ' ||
      (select hp_current::text from public.match_teams where match_id = p_match_id and team = 'red') ||
      ' / 蓝队 ' ||
      (select hp_current::text from public.match_teams where match_id = p_match_id and team = 'blue'),
    jsonb_build_object('targetTeam', v_target_team, 'damage', v_damage),
    clock_timestamp()
  );

  if v_defender.hp_current = 0 then
    perform public.game_finish_match(p_match_id, 'hp_zero', v_member.team);
    return jsonb_build_object('ok', true, 'message', '命中了，直接拿下这一局！');
  end if;

  perform public.game_insert_next_question(p_match_id, clock_timestamp());

  return jsonb_build_object('ok', true, 'message', '答对了，继续下一题');
end;
$$;

create or replace function public.game_tick_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_question public.match_questions%rowtype;
  v_now timestamptz := clock_timestamp();
  v_red public.match_teams%rowtype;
  v_blue public.match_teams%rowtype;
begin
  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    return jsonb_build_object('phase', null);
  end if;

  if v_match.phase = 'finished' then
    return jsonb_build_object('phase', 'finished');
  end if;

  if v_now >= v_match.ends_at then
    perform public.game_finish_match(p_match_id, 'time_up', null);
    return jsonb_build_object('phase', 'finished');
  end if;

  if v_match.phase = 'countdown' and v_now >= v_match.started_at + interval '3 seconds' then
    update public.matches
    set phase = 'active'
    where id = p_match_id;
    return jsonb_build_object('phase', 'active');
  end if;

  if v_match.phase <> 'active' then
    return jsonb_build_object('phase', v_match.phase);
  end if;

  select *
  into v_question
  from public.match_questions
  where id = v_match.current_question_id
  for update;

  if not found then
    return jsonb_build_object('phase', v_match.phase);
  end if;

  if v_question.answered_by_team is not null or v_now < v_question.deadline_at then
    return jsonb_build_object('phase', v_match.phase);
  end if;

  select *
  into v_red
  from public.match_teams
  where match_id = p_match_id
    and team = 'red'
  for update;

  select *
  into v_blue
  from public.match_teams
  where match_id = p_match_id
    and team = 'blue'
  for update;

  update public.match_teams
  set hp_current = greatest(0, hp_current - 2)
  where id in (v_red.id, v_blue.id);

  select *
  into v_red
  from public.match_teams
  where id = v_red.id;

  select *
  into v_blue
  from public.match_teams
  where id = v_blue.id;

  insert into public.match_events (match_id, event_type, message, payload, created_at)
  values (
    p_match_id,
    'question_timeout',
    '这题没人答对，双方都掉了 2 点血。',
    '{}'::jsonb,
    clock_timestamp()
  );

  insert into public.match_events (match_id, event_type, message, payload, created_at)
  values (
    p_match_id,
    'hp_changed',
    '红队 ' || v_red.hp_current::text || ' / 蓝队 ' || v_blue.hp_current::text,
    '{}'::jsonb,
    clock_timestamp()
  );

  if v_red.hp_current = 0 or v_blue.hp_current = 0 then
    perform public.game_finish_match(p_match_id, 'hp_zero', null);
    return jsonb_build_object('phase', 'finished');
  end if;

  perform public.game_insert_next_question(p_match_id, clock_timestamp());
  return jsonb_build_object('phase', 'active');
end;
$$;

create or replace function public.game_restart_room(p_room_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_room
  from public.rooms
  where code = upper(trim(coalesce(p_room_code, '')))
  for update;

  if not found then
    return;
  end if;

  if not exists (
    select 1
    from public.room_members
    where room_id = v_room.id
      and player_id = v_uid
  ) then
    raise exception 'ROOM_FORBIDDEN';
  end if;

  update public.rooms
  set status = 'open',
      active_match_id = null
  where id = v_room.id;
end;
$$;

grant execute on function public.ensure_player_profile(text) to authenticated;
grant execute on function public.game_room_snapshot(text) to authenticated;
grant execute on function public.game_match_snapshot(uuid) to authenticated;
grant execute on function public.game_create_room(integer, text) to authenticated;
grant execute on function public.game_join_room(text, text) to authenticated;
grant execute on function public.game_switch_team(text, public.team_name) to authenticated;
grant execute on function public.game_start_match(text) to authenticated;
grant execute on function public.game_submit_answer(uuid, jsonb) to authenticated;
grant execute on function public.game_tick_match(uuid) to authenticated;
grant execute on function public.game_restart_room(text) to authenticated;

alter publication supabase_realtime add table public.answer_submissions;

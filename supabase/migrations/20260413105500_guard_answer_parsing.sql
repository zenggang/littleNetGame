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
    v_is_correct := case
      when coalesce(p_answer_payload ->> 'value', '') ~ '^[0-9]+$'
        then (p_answer_payload ->> 'value')::integer = (v_question.correct_answer ->> 'value')::integer
      else false
    end;
  else
    v_is_correct := case
      when coalesce(p_answer_payload ->> 'quotient', '') ~ '^[0-9]+$'
        and coalesce(p_answer_payload ->> 'remainder', '') ~ '^[0-9]+$'
        then (p_answer_payload ->> 'quotient')::integer = (v_question.correct_answer ->> 'quotient')::integer
          and (p_answer_payload ->> 'remainder')::integer = (v_question.correct_answer ->> 'remainder')::integer
      else false
    end;
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
    'recorded',
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

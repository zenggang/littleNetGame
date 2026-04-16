create table if not exists public.content_packs (
  id text primary key,
  subject_code text not null check (subject_code in ('math', 'chinese', 'english')),
  grade_code text not null check (grade_code in ('g2', 'g3', 'g4')),
  title text not null,
  question_types text[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.rooms
  add column if not exists subject_code text not null default 'math',
  add column if not exists grade_code text not null default 'g2',
  add column if not exists content_pack_id text not null default 'math-g2-core',
  add column if not exists ruleset_id text not null default 'classic-archer-v1';

alter table public.matches
  add column if not exists subject_code text not null default 'math',
  add column if not exists grade_code text not null default 'g2',
  add column if not exists content_pack_id text not null default 'math-g2-core',
  add column if not exists ruleset_id text not null default 'classic-archer-v1';

insert into public.content_packs (id, subject_code, grade_code, title, question_types)
values ('math-g2-core', 'math', 'g2', '二年级数学基础包', array['single-number', 'quotient-remainder'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_packs_subject_grade_id_key'
      and conrelid = 'public.content_packs'::regclass
  ) then
    alter table public.content_packs
      add constraint content_packs_subject_grade_id_key
      unique (subject_code, grade_code, id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_content_pack_id_fkey'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_content_pack_id_fkey
      foreign key (content_pack_id) references public.content_packs (id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_subject_grade_content_pack_fkey'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_subject_grade_content_pack_fkey
      foreign key (subject_code, grade_code, content_pack_id)
      references public.content_packs (subject_code, grade_code, id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_subject_grade_content_pack_fkey'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_subject_grade_content_pack_fkey
      foreign key (subject_code, grade_code, content_pack_id)
      references public.content_packs (subject_code, grade_code, id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_content_pack_id_fkey'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_content_pack_id_fkey
      foreign key (content_pack_id) references public.content_packs (id);
  end if;
end
$$;

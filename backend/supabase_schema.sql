-- milo's case files (oct 22 2026). supabase, service-role access only:
-- the backend speaks for milo; nobody else reads the missions.
-- every attempt, every channel, every polite follow-up, written down.

create extension if not exists "pgcrypto";

-- the missions: one brief, one dossier, one clock.
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brief text not null,
  problem text not null default '',
  attempts text[] not null default '{}',
  target_url text,
  them_email text,
  ticket_url text,
  forum_url text,
  ticket_ref text,
  channel text not null default 'unassigned'
    check (channel in ('browser', 'email', 'discord', 'portal', 'forum', 'phone', 'unassigned')),
  status text not null default 'briefed'
    check (status in ('briefed', 'working', 'waiting_on_them', 'boss_decision', 'resolved', 'stood_down')),
  urgency text not null default 'whenever',
  identity text not null default 'milo',
  last_contact_at timestamptz,
  follow_up_count int not null default 0,
  resolution text,
  boss_decision_question text,
  claim_token text,
  claimed_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- the receipts: screenshots, error logs, links, what the page showed.
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  kind text not null check (kind in ('screenshot', 'log', 'text', 'link', 'file')),
  label text not null,
  content text,
  url text,
  captured_at timestamptz not null default now()
);

-- the whole conversation, both sides, every channel.
create table if not exists public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null,
  body text not null,
  message_id text,
  trigger text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_evidence_mission on public.evidence(mission_id);
create index if not exists idx_thread_mission on public.thread_messages(mission_id);
create index if not exists idx_thread_message_id on public.thread_messages(message_id);
create index if not exists idx_missions_status on public.missions(status);

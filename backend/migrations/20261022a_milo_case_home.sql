-- milo migration 20261022a (oct 22 2026): the case home and the wider
-- channel enum. run in the supabase dashboard if the tables exist
-- from the first schema; a fresh install can just use
-- supabase_schema.sql.

alter table public.missions
  add column if not exists ticket_url text,
  add column if not exists forum_url text,
  add column if not exists slack_thread_ts text;

alter table public.missions
  drop constraint if exists missions_channel_check;

alter table public.missions
  add constraint missions_channel_check check (
    channel in ('browser', 'email', 'discord', 'slack', 'portal', 'forum', 'phone', 'unassigned')
  );

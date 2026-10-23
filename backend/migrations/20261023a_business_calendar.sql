-- milo's follow-up clock runs on THEIR calendar, not ours: their
-- weekend, their timezone, their stated hours. run this in the
-- supabase dashboard before deploy.

alter table missions
  add column if not exists business_calendar jsonb;

comment on column missions.business_calendar is
  'their business calendar as detected on the walk: weekend day numbers, iana tz, work hours, and source (stated / country / assumed)';

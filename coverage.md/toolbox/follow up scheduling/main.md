# follow up scheduling

status: working

## which two days (oct 23 2026)

the clock now runs on THEIR calendar, not ours:

- `business_calendar.ts`: the door's own stated hours are believed
  first (labeled stated), the verified country table second (the
  gulf sun-thu, iran and afghanistan thu-fri, egypt and israel
  fri-sat, nepal sat only), and the honest default third (assumed).
- the cadence counts their business days: +2 days from their
  thursday lands their monday. bumps land on their working
  mornings only, in their timezone, so friday 9am here can be
  10pm there and nothing fires, and one weekend never gets two
  bumps.
- pinned in `business_calendar_test.ts`, one rule per test. run
  `migrations/20261023a_business_calendar.sql` before deploy.

the schedule is persistent, not pushy. never more than two
follow-ups in one day, and none inside working hours the boss did
not pick.

## what is built

`backend/src/services/missions.ts`:

- `nextFollowUpHours(count)`: the widening gap between contacts
- `isFollowUpDue(lastContactAt, followUpCount, now)`: the due check
- `followUpLine(count)`: the six lines the site shipped, verbatim,
  from "just checking whether there is an update" up the ladder to
  the backlog line

the scheduler in `backend/src/scheduler/mission_manager.ts` claims
due missions atomically (the prixie claim loop), so two passes never
double-send. every channel leg (email, portal, discord, slack,
forum) calls the same clock. pinned across `missions_test.ts` and
`mission_manager_test.ts`.

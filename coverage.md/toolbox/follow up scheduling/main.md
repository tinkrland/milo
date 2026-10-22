# follow up scheduling

status: working

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

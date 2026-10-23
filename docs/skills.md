# milo's skills

the behavioral skills, each one built and pinned in the engine
instead of left as prose on the landing page. every row names where
the code lives and where the test pins it. read this as the answer
to "does he actually do that": if it is not in this file, it is not
built.

## persistence, professionally

he follows up on a cadence and stays polite about it, and the
cadence is measured in THEIR working days, never in raw hours.

- code: `src/services/missions.ts` (the cadence and the lines),
  `src/services/business_calendar.ts` (which days count)
- pinned: `missions_test.ts`, `business_calendar_test.ts`
- the lines never beg, never threaten, never dramatize. the last
  one ("i understand there may be a backlog") is the register he
  keeps forever.

## knowing WHICH two days

a follow-up clock that counts "its been 2 days" across a weekend is
just pestering with extra steps. his calendar smarts:

1. **their own page is believed first.** "hours: mon-fri 9-6 gmt+8"
   read off the support door is the best evidence there is
   (`parseStatedHours`), and the calendar is labeled `stated`.
2. **the country table, verified** (reuters, al jazeera, wikipedia,
   checked oct 23 2026), as the fallback: the gulf runs
   sunday-thursday (saudi, qatar, kuwait, bahrain), iran and
   afghanistan rest thursday-friday, egypt and israel friday
   and saturday, nepal takes saturday only, much of south asia
   and latin america takes sunday only. labeled `country`.
3. **no evidence, no guess dressed as knowledge.** the default is
   the boss's zone and the universal weekend, labeled `assumed`.
4. **their timezone, not his.** a bump due friday morning in new
   york is friday night in singapore: their workday is over and
   nothing fires. bumps only exist inside their working hours.
5. **no bump over the weekend, ever twice.** bumps land on working
   mornings only, so one weekend gets at most one bump, aimed at
   the morning the desks reopen.
6. **the cadence is business days.** "+2 days" from their thursday
   lands their monday. from their wednesday in the thu-fri-weekend
   world, it lands their saturday, which is a working day there,
   and he knows it.

- code: `src/services/business_calendar.ts`, wired into the tick in
  `src/scheduler/mission_manager.ts` (`isFollowUpDueSmart`) and
  detected on the walk (`detectBusinessCalendar` on the door page's
  own text, stored on the mission).
- pinned: `business_calendar_test.ts`, one test per rule above.
- deploy: run `migrations/20261023a_business_calendar.sql` first.

## sent around in circles, detected instead of endured

most support systems do not say no, they send you in a loop: the
same form letter with a new ticket number, a bounce back to the
channel you came from, "please email us" pointing at the address
you already emailed. he keeps score on all of it:

- the same template three or more times (ticket ids, dates and
  links normalized away so "request #41112" and "request #87350"
  are one template) is one answer repeated, not three
- a bounce back to a channel he already used is a loop
- a named door he already visited, named again, is a loop
- if nothing substantive has EVER arrived, that is the strongest
  signal of all

what he does about it: the first time, the polite follow-up is
replaced by one plain escalation that names the circle, restates
the problem's salient first sentence, and asks who owns the case.
the second time, the mission parks with the boss with the evidence,
because repeating an escalation is just pestering with extra steps.

- code: `src/services/circle_detection.ts`, wired into every
  follow-up in `src/scheduler/mission_manager.ts`
- pinned: `circle_detection_test.ts`, plus two dispatcher tests in
  `mission_manager_test.ts` (escalate once, park the second time)

## sticking to salient points

every follow-up carries the problem's first sentence, because the
next human who reads the case is new to it and should not have to
dig for what "this" is. the chat ladder does the same (the handoff
is the whole story in one message, and the insists restate the
problem verbatim rather than arguing the bot's points).

- code: `followUpLine(count, problem)` in `src/services/missions.ts`,
  `composeHandoff` and the insist lines in `src/services/coax.ts`
- pinned: `missions_test.ts`, `coax_test.ts`, the dispatcher tests

## the skills not in this file yet

the ones the landing page promises and the engine has not built:
screenshot annotation (researched: sharp plus svg, in
`docs/research/toolbox-oss.md`), and the first live runs of the
chat widget and the portal follow-up, which are built and pinned
but have never met a real vendor. the honest ledger for those is
`coverage.md/` and `backend/README.md`.

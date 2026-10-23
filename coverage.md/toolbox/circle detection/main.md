---
title: circle detection
summary: being sent around in circles is detected, named once, then parked with the boss
---

# circle detection

status: working (built and pinned, dispatcher-wired)

## what is built

`src/services/circle_detection.ts`:

- `templateFingerprint`: the form letter behind the form letter,
  ticket ids, dates and links normalized so "request #41112" and
  "request #87350" are one template
- `detectCircling`: reads the whole message history and names the
  loops: the same template three times, a bounce back to a channel
  he already used, a named door he already visited, and the
  nothing-substantive-ever case
- `circleEscalationLine`: the plain one: names the circle, restates
  the salient first sentence, asks who owns the case

`src/scheduler/mission_manager.ts` wires it into every follow-up:
escalate once, park with the boss the second time, because
repeating an escalation is just pestering with extra steps.

pinned in `circle_detection_test.ts` and two dispatcher tests in
`mission_manager_test.ts`.

## what is not

a live loop has never been observed by the engine; the detector is
pinned on the shapes every vendor support system actually uses.

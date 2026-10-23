# milo coverage

what milo can do today, what is half built, and what is only prose.
grounded in the repo, not the pitch: every row names the code that
backs it and the test that pins it. the shape follows prixie's
coverage.md, folder edition.

## legend

- working: the rules are coded, the transport is real, a test pins it
- partial: the rules are coded and pinned; the transport or one leg
  is a seam that fails honestly closed
- designed: the shape is written down, the code is not
- planned: prose says it, nothing else does

## toolbox

- [pdf consolidation](toolbox/pdf%20consolidation/main.md): partial
- [screenshot annotation](toolbox/screenshot%20annotation/main.md): designed
- [attachment size limits](toolbox/attachment%20size%20limits/main.md): working
- [follow up scheduling](toolbox/follow%20up%20scheduling/main.md): working
- [circle detection](toolbox/circle%20detection/main.md): working
- [escalation requests](toolbox/escalation%20requests/main.md): working

## platforms

- [email](platforms/email/main.md): working
- [human support chat](platforms/human%20support%20chat/main.md): working
- [ai support chat](platforms/ai%20support%20chat/main.md): working
- [ticket queue w form](platforms/ticket%20queue%20w%20form/main.md): working
- [discord support](platforms/discord%20support/main.md): partial
- [slack support](platforms/slack%20support/main.md): working
- [phone](platforms/phone/main.md): partial
- [messages](platforms/messages/main.md): designed

## the walk

finding where tf the support thing is comes first, and it is built:
`support_discovery.ts` ranks the footer, probes the common doors,
and verdicts every landing. it is the front door of every browser
platform above, pinned in its own test.

the behavioral skills, each mapped to code and pinned tests, live in docs/skills.md. statuses were read off the code on oct 23 2026. when a claim
changes, change the row with it.

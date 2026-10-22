# phone

status: partial

dials the number, navigates the phone tree, waits on hold
(unfortunately), speaks to a human, takes notes while waiting.

## what is built

`backend/src/services/ivr.ts`, on the livekit sip seam:

- `realSipTransport` + `sipConfigured`: dispatch is real, fails
  closed without the livekit keys
- `chooseDigit`: the menu rule, human door beats everything, then
  the problem's own category, no match means re-listen, never guess
  blind
- `isHoldMusic` + `HOLD_LIMIT_MINUTES`: hold music is recognized and
  waited through, up to a limit
- `isHumanVoice`, `composeCallGoal`, `voicemailLine`: the goal states
  one message, and voicemail leaves the whole story

the identity rule stands at the phone line: on behalf, never as.

## what is not

the in-call loop (dtmf out, speech to text in, hangup) wires at
deploy through prixie's lazy rtc-node factory; the rules are pinned,
the live transport is the deploy seam. listed in `backend/README.md`.

# ai support chat

status: working

milo talks to the bot. the bot cannot help. milo asks for a human.

## what is built

`backend/src/services/coax.ts`, the whole ladder, pinned in
`coax_test.ts`:

- explain once with the attempts riding (`explainLine`)
- `isFormLetterClosure`: three polite insisters through the bot's
  form letters ("your request has been received" is the receipt of
  silence)
- `demand_human` once, at closure, never mid-answer
- `findChannelPointer`: when the bot walls and names another door
  ("email billing@..."), the mission bounces there instead of
  parking, evidence intact

## what is now wired

`chat_widget.ts` is the transport: the turns go in and out of a real
widget through the cdp seam (`cdpWidgetTransport`), the loop rides
the follow-up turn budget, and the dispatch records the outcome
(answered, human, bounce, closed, silence). pinned fake-driven in
`chat_widget_test.ts`.

## what is not

a live run against a vendor widget. the same honest caveat as every
walk: built, pinned, the first live fill is the proof.

# ai support chat

status: partial

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

## what is not

the widget transport that feeds it turns live. the state machine
takes messages in and gives turns out; the multi-turn wiring is the
same gap as the human chat row.

# email

status: working

composes the message, replies in thread, forwards evidence, tracks
the conversation, follows up when the thread goes cold.

## what is built

`backend/src/services/agentmail.ts` (the prixie seam, ported):

- `realSender()` behind `MailSender`, fails closed without
  `AGENTMAIL_API_KEY`
- `handleInbound`: reads replies, `isFromBoss` gates the boss's own
  words, `classifyReply` (in `missions.ts`) sorts the answer from the
  form letter
- `extractTicketRef`: ticket numbers ride every message after the
  first

the follow-up leg lives in `mission_manager.ts`: an email mission
with a cold thread gets the next line on the cadence. pinned in
`agentmail_test.ts` and `mission_manager_test.ts`.

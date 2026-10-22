# escalation requests

status: working

when the front line cannot help, milo climbs. the ladder on the
site is four levels: the chatbot, the front line, tier two,
engineering.

## what is built

- `coax.ts` `nextCoaxTurn`: level one is the whole coax engine.
  explain once, insist politely through three form letters, then
  `demand_human` once at closure. a human joining gets
  `composeHandoff`, the whole story in one message, attempts and
  ticket riding, so nobody re-asks
- `missions.ts` `followUpLine`: levels two through four ride the
  follow-up cadence, "has this been escalated to the appropriate
  team" is literally line five
- `agentmail.ts` `extractTicketRef`: tier two references the ticket
  number because the number travels with the mission

pinned in `coax_test.ts` and `missions_test.ts`.

## what is not

a separate escalation dispatcher. the climb rides the follow-up
clock; nothing today escalates faster than the cadence allows.

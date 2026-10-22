# discord support

status: partial

joins the server, opens a ticket, navigates the bot-first triage,
waits in the help channel, pings the right role when allowed.

## what is built

`backend/src/services/discord_support.ts`:

- the REST transport, `postMessage` once + `readThread` back, fails
  closed without `DISCORD_BOT_TOKEN`
- `readThreadMessages`: bot replies never count as answers
- `shouldBumpThread`: at most two calm bumps, a human reply parks
  with the boss
- `rolePingMention`: role pings ride only when the channel allows,
  and @everyone and @here never ride, ever

pinned in `discord_support_test.ts`.

## what is not

- the gateway watcher (MESSAGE_CREATE, prixie's `discord_watcher`
  shape): reading is a pull today, not a listener
- the ticket-bot triage: opening a ticket means clicking a button
  the REST api cannot click; the rule that will ride it is pinned
  and waiting on the gateway

# slack support

status: working

the resume's stack row lists slack next to discord. a workspace's
#help channel is a door like any other.

## what is built

`backend/src/services/slack_support.ts` (same shape as the discord
leg, deliberately):

- the REST transport: `chat.postMessage` once,
  `conversations.history` / `conversations.replies` back, fails
  closed without `SLACK_BOT_TOKEN`
- `readSlackThread`: bot messages never count as answers
- `shouldBumpSlack`: at most two calm bumps, a human reply parks
  with the boss
- no @channel and no @here, on any channel, in any mood

the follow-up dispatch in `mission_manager.ts` routes `channel:
"slack"` with a channel id in `target_url`, thread ts riding on
`slack_thread_ts`. pinned in `slack_support_test.ts`.

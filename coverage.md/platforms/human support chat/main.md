# human support chat

status: partial

when a human answers the widget, the whole story rides once and
nobody re-asks.

## what is built

- `support_sites.ts` `openChatWidget`: finds and opens the widget on
  the page
- `coax.ts` `composeHandoff` + `isAnswerRelevant`: the human join
  message, and the check that a reply actually addresses the problem
- `missions.ts` `classifyReply`: human words park the mission with
  the boss; silence is a receipt, not an answer

## what is not

the multi-turn queue. the widget's own message loop (send, wait,
read, send again) is not wired to the coax engine yet; today the
state machine is pinned but the widget transport is a seam. listed
in `backend/README.md` as an honest gap.

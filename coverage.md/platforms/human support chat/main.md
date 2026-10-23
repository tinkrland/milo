# human support chat

status: working

when a human answers the widget, the whole story rides once and
nobody re-asks.

## what is built

- `support_sites.ts` `openChatWidget`: finds and opens the widget on
  the page
- `chat_widget.ts`: the whole wire. `sendWidgetMessage` types into
  the vendor input shapes and sends, `pollWidgetMessages` reads the
  message containers back out, and `runCoaxInWidget` runs the loop:
  send, wait within the turn budget, read, send again
- `coax.ts` `composeHandoff` + `isAnswerRelevant`: the human join
  message, and the check that a reply actually addresses the problem
- the dispatch (`mission_manager.ts`): a human join hands off the
  story and parks the case with the boss

pinned in `chat_widget_test.ts` with a fake transport: the handoff
fires once, the human answer parks, the widget that goes silent is
reported, not begged.

## what is not

a live run. built, pinned, never yet pointed at a real widget: the
first live fill is the proof, and it is the same status prixie's
flowing forms carried until her first live submit.

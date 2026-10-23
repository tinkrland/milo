# toolbox oss research

question (anne, oct 23 2026): the toolbox items might be skilled, or
jerryrigged from something existing and open-source, instead of
hand-built. answer below, registry-verified. the verification method:
`npm view <pkg> version license` plus the publish timestamps, read
oct 23 2026. every claim names where it was checked.

## the seams the plugs must fit

the engine already owns the rules; the plugs are renderers and
transports behind seams that fail closed:

- `PdfRenderer` in `evidence.ts`: `noRenderer()` refuses to pretend a
  pdf was written. anything slotted in must produce real bytes and
  still respect `planConsolidation`'s budget.
- the walk's screenshot is already captured (`takeScreenshot`,
  browserbase). annotation would be a pure pass over the captured
  bytes before consolidation sees them.
- character limits (`compressToLimit`, `composeIssueMessage`) are
  built and pinned; nothing external needed.

## pdf consolidation: pdf-lib

candidates checked on the registry (oct 23 2026):

| package | version | license | last publish |
| --- | --- | --- | --- |
| pdf-lib | 1.17.1 | MIT | may 2022 |
| pdfkit | 0.20.2 | MIT | active |
| jspdf | 4.2.1 | MIT | active |

- **pdf-lib** is the fit: pure typescript, zero native dependencies,
  embeds png and jpg directly (`embedPng`/`embedJpg`), creates pages,
  draws text. dormant since may 2022, but it is complete, not
  abandoned; it does one thing and the api has not needed to move.
- pdfkit is a streaming text-pdf generator: it wants to be a document
  writer, not an evidence consolidator. jspdf is browser-first and
  carries the kitchen sink.
- the seam it plugs into: a `pdfLibRenderer()` behind `PdfRenderer`
  that walks `planConsolidation`'s output: one image per page, the
  label and capture time as a caption line, nothing invented.
- verdict: **plug pdf-lib. hand-build the walk that feeds it.**

## screenshot annotation: sharp plus an svg overlay

no oss package does "arrow on the broken button" cleanly; the honest
shape is two primitives:

| package | version | license | last publish |
| --- | --- | --- | --- |
| sharp | 0.35.5 | Apache-2.0 | sept 2026 |

- **sharp** is the fit: crop to the region of interest, resize to a
  reasonable width, and composite an svg overlay (a box and an arrow
  are two svg elements) onto the png. one library, one pass.
- the alternative everyone reaches for (canvas in a headless browser)
  means a browser session per annotation; milo already closes his
  session before evidence ships. sharp is process-local.
- caveat: sharp is a native module (libvips). deno runs it via npm
  compat, but it is the one dependency in this plan that wants a real
  container. flagged, not hidden.
- verdict: **plug sharp for the pixels. hand-draw the two svg
  elements. the "what to point at" is the walk's job, and no library
  does that.**

## attachment size limits and follow-up scheduling

already built and pinned; no plug needed. the compression of prose
(`compressToLimit`) has no oss equivalent worth the dependency, and
the cadence rules are the product.

## the messages door: agent-messenger

checked oct 23 2026: github.com/agent-messenger/agent-messenger, MIT,
244 stars, 1803 commits, active. one CLI and typescript SDK for 12
platforms: slack, discord, teams, webex, telegram, whatsapp, line,
wechat, imessage, instagram, kakaotalk, channel talk.

- **the useful leg is `agent-imessage`** (runs on a mac via the
  imsg tool): it is the transport milo's empty `messages/` row wants,
  and nothing else in the research has it. telegram (user account
  via tdlib) and whatsapp (qr via baileys) are bonus doors.
- the interface matches the engine's shape: `message send`, `message
  search`, `channel list`, `snapshot`, one consistent command style
  across platforms, json out by default. a door leg is a thin
  adapter from those to the mission dispatch's send-once/read-back
  contract.
- it ships agent skills per CLI, which is anne's "skilled" instinct
  exactly right: each platform leg is one skill file and one shell
  command per action.

### the two catches, stated plainly

1. **identity.** its thesis is "your agent messages as you": it
   reads the boss's own session tokens and acts with the boss's name
   and permissions. milo's rule is the opposite: on behalf, never
   as. if this ever rides, it rides from **milo's own accounts**
   (a dedicated imessage/telegram/whatsapp presence milo owns), and
   never from the boss's credentials. the boss's accounts are not
   milo's hands.
2. **platform risk.** whatsapp via baileys is against whatsapp's
   terms and carries ban risk; slack/discord token extraction is
   gray. the repo's own qr sign-in path is the platform's official
   flow and is the one to prefer. telegram tdlib is a native binary
   (container weight), imessage needs a mac running.

- verdict: **the messages/ row's researched path. plug the imessage
  leg from a milo-owned account; leave whatsapp parked until anne
  accepts the ban risk in writing.**

## what stays hand-built

finding where tf the support thing is. no library ranks a footer,
verdicts a help center, or reads a zendesk form's own rules off the
page. that is `support_discovery.ts` and `support_sites.ts`, built
and pinned; the oss above only ever rides behind the doors they find.

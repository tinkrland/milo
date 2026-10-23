# milo backend

> you have a problem. milo's on it.

milo is a personal henchman agent: he navigates support systems (chat
widgets, ticket portals, email, and eventually the phone line) on the
boss's behalf, with receipts. this backend is the mission engine, and
it mirrors prixie's deliberately: same stack (deno + hono + supabase),
same house rules (protocol-pure halves, injectable seams, fails
closed), same consent policy riding every page he ever opens.

---

## architecture & tech stack

- **runtime:** [Deno](https://deno.com) (TypeScript native)
- **web framework:** [Hono](https://hono.dev) (`npm:hono`)
- **database:** [Supabase](https://supabase.com) (`npm:@supabase/supabase-js`)
- **browser engine:** [Browserbase](https://browserbase.com) (the walk engine: support pages, chat widgets, forms)
- **behavioral skills:** [docs/skills.md](../docs/skills.md) (persistence, which two days, circle detection, salience, each mapped to code and pinned tests)
- **mail:** agentmail-style inbox (briefs in, words out, replies back)
- **phone leg:** [LiveKit SIP](https://livekit.io) (milo owns the IVR navigation: menu tree in, DTMF out, hold patience; fails closed without keys)
- **zero platform lock-in:** deployable anywhere deno runs

## the house rules, in code

- **dispatched, not autonomous.** "milo, stand down" is final, and
  refunds/payments/account changes park as `boss_decision` BEFORE any
  walk. he asks first.
- **professional persistence.** the follow-up cadence is the landing
  page's own rhythm (3h, 3h, a day, two days, then weekly), and the
  lines are calm and specific: "hi, just checking whether there is
  an update".
- **he can count to 500.** character limits are honored at sentence
  boundaries, then word boundaries, never mid-word. the form's own
  maxlength is the law.
- **give him the mess.** evidence consolidation plans around the
  form's real constraints: one attachment, pdf only, under 2mb. what
  cannot ride is dropped WITH a receipt, never silently.
- **he never acts AS the boss.** forms get `MILO_IDENTITY` (default
  milo); the phone states "calling on behalf", never "i am".
- **coax, don't shout.** most support walls are the company's own ai
  agent. the loop is a state machine: explain once, insist politely,
  demand the human after three form letters, hand the human the whole
  story in one message, and bounce to the door the bot names when it
  walls.
- **the status is read, never assumed.** a portal ticket's follow-up
  walks back to the ticket page first: pending means a human answered
  and it is the boss's turn, solved closes the case, only a quiet open
  ticket earns the reply.
- **fails closed.** no creds means the leg reports "not configured",
  never pretends to work. the health route says exactly which legs are
  on.

## directory structure

```
backend/
├── deno.json              # deno config & tasks
├── supabase_schema.sql    # missions, evidence, thread_messages
├── README.md
└── src/
    ├── index.ts                    # hono server + optional autotick
    ├── services/
    │   ├── browserbase.ts          # the walk engine (sessions, cdp, support primitives)
    │   ├── consent.ts              # the standing consent policy (from prixie, verbatim)
    │   ├── link_safety.ts          # every url he opens passes this gate, fails closed
    │   ├── missions.ts             # the pure engine: briefs, status, cadence, limits
    │   ├── agentmail.ts            # the mailbox: briefs in, words out, replies matched
    │   ├── supabase.ts             # the case files + the claim lease
    │   ├── evidence.ts             # consolidation planning against real constraints
    │   ├── support_discovery.ts    # finding where tf the support thing is: ranked links, probed paths, door verdicts
    │   ├── support_sites.ts        # the walks: support page, chat widget, ticket form
    │   ├── chat_widget.ts         # the widget queue, wired: send, wait, read, send again
    │   ├── business_calendar.ts  # WHICH two days: their weekend, their timezone, their stated hours
    │   ├── circle_detection.ts    # sent around in circles: detected, named once, then parked with the boss
    │   ├── coax.ts                 # the ai-agent coax loop: explain, insist, demand the human
    │   ├── portal_followup.ts      # zendesk and cousins: status read off the page, reply in thread
    │   ├── forums.ts               # discourse walks: post the question, read the topic back
    │   ├── discord_support.ts      # the support server: post the question, watch the thread
    │   ├── slack_support.ts        # the #help channel: same shape as discord
    │   └── ivr.ts                  # the livekit sip phone leg: milo at the menu wheel
    ├── scheduler/
    │   └── mission_manager.ts      # the dispatcher: claim, execute, follow up
    └── routes/
        ├── missions.ts             # brief / dispatch / decide / stand down / tick
        └── webhooks/agentmail.ts   # inbound mail (shared secret)
```

## the mission lifecycle

```
briefed -> working -> waiting_on_them -> resolved
              |            |
              +-> boss_decision (parked, the boss answers)
stood_down (final, always honored)
```

- a brief arrives (email to milo's inbox, or `POST /api/missions`).
  a paragraph of frustrated rambling is a real brief: `parseBrief`
  sorts what broke from what was already tried, and the attempts ride
  the FIRST message so "have you tried restarting" is never asked.
- the dispatcher claims the mission (15-minute lease, one milo per
  mission) and walks the support site: consent banner declined, the
  support door found, the chat widget or ticket form read and filled
  honestly, evidence captured.
- submitted: the follow-up clock starts. due follow-ups send one
  calm line and reset the clock.
- inbound replies are matched by message id or ticket number and
  classified: answer, progress, or the receipt of silence
  ("we have received your enquiry").

## environment

| variable | leg |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | the case files (required for anything) |
| `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` | the walks |
| `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` | outbound mail |
| `AGENTMAIL_WEBHOOK_SECRET` | inbound mail |
| `MILO_BOSS_EMAIL` | who counts as the boss (exact address) |
| `MILO_IDENTITY` | the name he acts as (default `milo`) |
| `LIVEKIT_SIP_TRUNK_ID`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | the phone leg (optional, fails closed) |
| `DISCORD_BOT_TOKEN` | the discord leg (optional, fails closed) |
| `SLACK_BOT_TOKEN` | the slack leg (optional, fails closed) |
| `MILO_AUTOTICK=1`, `MILO_TICK_MINUTES` | the built-in follow-up clock |

## run

```
deno task start        # serve on $PORT (default 8000)
deno task test         # 40 tests, pure halves + dispatcher with fakes
```

routes:

- `POST /api/missions` — brief him (`{ brief, title?, dispatch? }`)
- `GET  /api/missions/:id` — the dossier: mission, evidence, thread
- `POST /api/missions/:id/dispatch` — send him in
- `POST /api/missions/:id/stand_down` — stand him down (final)
- `POST /api/missions/:id/decide` — answer a parked question
- `POST /api/tick` — one dispatcher pass (the scheduler, by hand)
- `POST /webhooks/agentmail` — inbound mail (x-webhook-secret)
- `GET  /api/health` — which legs are honestly configured

## deployment

run `supabase_schema.sql` in the supabase dashboard, set the env vars
above, deploy anywhere deno runs (deno deploy, railway, a container).
`MILO_AUTOTICK=1` turns on the built-in clock; otherwise point any
scheduler at `POST /api/tick` every few minutes.

## what is not built yet (honestly)

- the follow-up clock now runs on the company's own calendar
  (business_calendar.ts: their stated hours, the verified country
  table, their timezone; no bump lands twice over one weekend). the
  one migration that must run first is
  migrations/20261023a_business_calendar.sql. what is not built is
  the first LIVE observation of a wrong-weekend company: the rules
  are pinned on verified work weeks, not on a live zendesk yet

- the chat widget's first live run: the coax loop is wired now
  (chat_widget.ts: send, wait, read, send again, through the cdp
  seam), pinned fake-driven; it has never met a real vendor widget,
  and the first live fill is the proof
- the screenshot annotation half: sharp plus an svg overlay is the
  researched plug (docs/research/toolbox-oss.md); not wired
- the livekit rtc wiring: the sip seam's dispatch call is real, the
  dtmf/stt/hangup halves ride prixie's lazy rtc-node factory at
  deploy time (the same pattern the voice branch uses); no keys means
  no calls, reported not faked
- the discord gateway listener: posting and reading are real through
  the REST transport; the live MESSAGE_CREATE watcher is prixie's
  discord_watcher shape and ports next
- the discord ticket-bot triage ("opens a ticket", "pings the right
  role when allowed"): the role-ping rule is coded (allowed only,
  @everyone/@here never), but the ticket-bot buttons need the gateway
  listener; the rule that rides it is pinned
- milo's own identity on forms that demand the boss's real name is
  `MILO_IDENTITY` and an open policy question, not a silent guess

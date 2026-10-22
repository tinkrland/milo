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
- **mail:** agentmail-style inbox (briefs in, words out, replies back)
- **phone leg:** [CALL-E](https://heycall-e.com) seam (plan/confirm/run; fails closed without a key)
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
    │   ├── support_sites.ts        # the walks: support page, chat widget, ticket form
    │   └── call_e.ts               # the phone seam (plan/confirm/run, fails closed)
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
| `CALLE_API_KEY` | the phone leg (optional, fails closed) |
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

- the discord watcher (a support server's channel is a door like any
  other; the browser walk is the engine, the listener is not)
- the live walkthrough of the chat widget queue (the widget opens and
  the form walk works; multi-turn widget chat needs the walk to loop)
- the call-e run is a seam only: the plan/confirm/run contract is
  coded and tested fails-closed, but no key means no calls
- milo's own identity on forms that demand the boss's real name is
  `MILO_IDENTITY` and an open policy question, not a silent guess

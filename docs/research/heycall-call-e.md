# heycall-e (CALL-E) research for milo

## what it is

CALL-E (heycall-e.com, github.com/CALLE-AI) is a hosted ai agent for goal-driven phone calls: you describe a goal, it plans, dials, adapts live, navigates ivr with dtmf, waits on hold, handles voicemail/screening/transfers, and returns a schema-validated structured result plus a timestamped transcript. this is exactly milo's "automated phone systems (unfortunately)" roadmap item, as a product.

the strategic read: CALL-E is to milo what recall.ai is to prixie. the phone leg does not have to be built, it can be dispatched. milo adds the brief, the persistence, and the cross-channel case memory on top.

## what's open vs closed

- github.com/CALLE-AI/call-e-integrations: MIT licensed (copyright 2026 CALL-E contributors). integrations, sdks, mcp clients, docs, examples, not the call engine.
- the actual call engine (dialing, ivr detection, live conversation, hold, transfers) runs on their hosted service: api.heycall-e.com, mcp at seleven-mcp-sg.airudder.com (airudder is the infra behind it). no source for the engine itself, an api key and credits (100 free = $1 at signup).
- ts sdk: @call-e/calle (npm), python: calle-ai (pip). python needs 3.11+.

## the takable contract (this is the good part)

the MIT repo's real value is the protocol design, which matches milo's house rules almost word for word:

1. **the confirm-token gate.** plan_call(goal, phone) returns plan_id + confirm_token + ready_to_run. no call is placed. run_call requires the exact pair. this is "commanding officer: you. nothing leaves without a brief" as an api contract. milo should copy this shape for every consequential action: the plan exists without the world changing, the boss (or policy) signs, then it runs.
2. **one idempotency key per intent.** "reuse it only for the same request; a new key can create another call" + 422 input_incomplete when facts are missing, with the missing facts listed so the caller can collect and resubmit. that is milo's "smart goal clarification" phase (it asks for recipient, timing, language, success criteria before dialing) and his briefing form, in one pattern.
3. **the resumable run loop.** persist run_id, poll get_call_run (wait ~60s, then every 5-10s), server-directed delays and stop instructions take precedence over the cadence, never call run_call twice after a timeout, resume after a local crash. this is prixie's claimForDeploy / resetStaleDeployClaims / touchDeployClaim lease pattern restated for phone calls. the status vocabulary is honest: result_status pending/available/unavailable/not_applicable, call_outcome includes DECLINED, VOICEMAIL, BUSY, EXPIRED, and "completed alone does not establish result readiness or business success".
4. **schema-validated results.** result_schema is a closed object of scalar fields (additionalProperties: false, no nesting), returned filled in. milo's debrief ("they responded: x, ticket escalated: y, next follow-up due: z") is this schema. prixie's capture requests can adopt the same closed-schema discipline.
5. **transcript with offsets.** [{offset_seconds, speaker, text}] is the same shape recap already cites with h:mm:ss. a phone transcript drops into the existing recap ingest unchanged.
6. **webhooks + metadata.** pass webhook_url on create for completion delivery; metadata carries workflow_run_id through. same as prixie's agentmail shared-secret webhook route.

## the integration surfaces

- sdk (ts + python): CalleClient.calls.create(task, phone, resultSchema, {idempotencyKey}) then calls.waitForResult(id). typed exceptions: CalleAPIError, AuthenticationError, RateLimitError, ConnectionError, TimeoutError, WebhookSignatureError (current webhooks unsigned; signature verify is legacy).
- api: POST /v2/calls (202), GET /v2/calls/{id}, GET /v2/calls/{id}/events, POST /v2/calls/{id}/cancel (cancel only before provider submission; active calls cannot be hung up).
- mcp: streamable http, three tools (plan_call, run_call, get_call_run), oauth. plan/run/get is the whole contract.
- agent skills: claude code, codex, cursor, openclaw, plus a cli (@call-e/cli) and @call-e/core (token cache, broker session, mcp client helpers, all MIT and readable).

## what milo can literally take (MIT)

- the plan/confirm/run state machine and its status vocabulary, for milo's own mission engine regardless of whether he uses their phone service.
- the idempotency + 422-collect-missing-facts pattern for his briefs.
- the closed result-schema discipline for debriefs.
- @call-e/core's broker-client / token-cache / http helpers if he goes the mcp route (tokenIsUsable, per-request tool timeouts).
- their docs' polling cadence rules ("server-directed delays take precedence", "ask before a requested retry; do not place another call automatically"), which read like they were written for an agent like milo.

## cautions

- the engine is closed: taking the capabilities means using the service (api key, credits, their number governance, rate limits, blocklists, kill switches) or reimplementing. in-task optimization and goal-driven long tasks are listed as in development, not generally available.
- safety notes in the docs are already what milo should say: only call numbers you own or are authorized to call, a retry needs the boss's ok, an active call cannot be canceled through the api.
- payment identity question stays open either way: a support line will ask who is calling. prixie's rule (never acts as the owner) collides with "this is milo, calling on behalf of [boss]". that is anne's call to make.

## livekit note

the alternative to CALL-E for the phone leg is livekit agents with sip trunking, where milo owns the whole stack but builds ivr/hold/human-detection himself. see research-livekit-ivr.md. the two are not mutually exclusive: CALL-E is the fastest dispatchable phone leg (recall.ai pattern), livekit is the own-the-stack path (the voice branch already owns the audio transport). milo's prose ("borrows the family toolbox, owns none of it") actually argues for the CALL-E pattern: he dispatches, he does not own the phone system.

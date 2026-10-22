# prixie -> milo reuse map

milo is prixie's sister app: prixie stands in where presence is the requirement, milo goes to war where the requirement is persistence. same family, same house rules. prixie's repo is one person, several surfaces, one per branch (main = proxy, voice, video, socmed, recap, context). milo can inherit the toolbox the same way the surfaces inherit the context: tools separate from processes, protocol-pure halves behind injectable seams, fakes never claiming a transport loaded, everything fails closed.

what follows is mapped to milo's own roadmap (the "handled", "in training", and "declined" lists on /roadmap), so the reuse is ordered by usefulness, not by accident.

## tier 1: ships milo's "already on duty" list almost verbatim

### browser access: browserbase.ts + browserbase_extended.ts (main)
the join engine prixie already has is 80 percent of milo's browser leg. primitives in browserbase.ts: createSession, navigateTo, readPageText, findAndClick, findAndType, cdpExecute. milo's version of "join a zoom" is "open the support portal, find the chat widget, wait in the queue, fill the form". same session loop, different target. browserbase_extended.ts already solved the harder versions: late join (milo joins an ongoing thread mid-conversation), the pre-join participant count gate (queue detection), twitch join (dismiss banners, never log in). the act is identical: open a page in her own session, act on it, keep the receipts.

### consent.ts (main): the walk rides every navigation
milo will be on other people's websites constantly. prixie's consent policy (reject-all > only-necessary > close, never agreed, never a newsletter) transfers as a standing rule with zero changes: consentChoice, newsletterOptIn, newsletterDirection, dismissConsentBanners, alignNewsletterBoxes. receipts carry the record. this is a policy module every surface shares, and milo is just another surface.

### evidence handling: screenshots.ts + screenshot_engines.ts (main)
milo's "give him the mess" cards (7 screenshots, pdf created, evidence consolidated, message compressed) are prixie's capture pipeline wearing a hat. screenshots.ts is already decoupled from any one engine (ScreenshotEngine.capture(sessionRef), engines register by name, browserbase today, playwright a plausible third). milo's dossier per mission is a capture request with a wider brief: not "the access code in the call" but "the ticket number, the escalation, the confirmation email".

### email inbox + relay: agentmail.ts (main)
this is the single most directly reusable file. agentmail is prixie's dedicated inbox: real mailbox, inbound webhook api, extractMeetingUrl/detectPlatform pattern, shared-secret webhook, outbound rest already in notify.ts. milo IS an email-first agent: brief arrives, thread is kept, follow-ups are sent, "we have received your enquiry" gets receipts. the pure half (parse the message, extract the case, decide the reply) is new; the transport, the mailbox, the webhook, and the identity rules (form_email.ts: never acts AS the owner, only reports TO the owner) are done.

### professional persistence: scheduler/meeting_manager.ts + notify.ts (main)
"he follows up... annoyingly well" is prixie's meeting manager pattern with a different clock: claimForDeploy / resetStaleDeployClaims / touchDeployClaim is exactly "one milo per mission, the mission rides entry" (prixie main 8c37941 already made this exact fix for bots). the polite follow-up cadence ("hi, just checking whether there is an update") is a scheduled follow-up trigger, the same shape as the join trigger. notify.ts's honest contract (stored first, notify failure never takes the path down, no creds = warn not crash) is milo's "i'll keep an eye on it" behavior stated as code.

## tier 2: ships the "in training" list

### discord tickets: discord_watcher.ts (main)
already built for prixie (one gateway connection per server, VOICE_STATE_UPDATE + GUILD_SCHEDULED_EVENTS only, pure protocol half + thin socket loop, DISCORD_BOT_TOKEN unset = closed). milo's "discord tickets" roadmap item is the same watcher pointed at ticket channels instead of voice rooms. the honest limit is already verified and carries over: bots cannot see dm/group-dm calls, and no api lets an app rsvp a user.

### phone calls + automated phone systems: voice branch + retelldb
prixie's voice branch already owns the audio leg: server/audio_transport.ts (lazy rtc-node behind RtcFactory, mono pcm in/out, publish TTS, subscribe for STT), server/room.ts (mints a session token for the session's own room, creds read at call time), persona/voice_adapter.ts (the seam from context). the missing piece for milo is the dial-out leg: a sip trunk that places an outbound call to a pstn number and connects that transport to it. livekit's agents sdk is the natural fit for this (dispatch a job to dial a number, dtmf for the ivr keypad, hold detection via silence/transcript). the one voice lesson that transfers directly: barging and interruption are assembly.ai's problem, never custom logic. hold music is a solved problem for someone with no sense of time, but "when to speak" is not, and that is a solved-seam problem in prixie's repo already.

### "milo remembers": retelldb + memorium (context branch)
the context branch is one persona memory system every surface pulls byte-identical via tools/sync-context.sh and never edits. milo's "he stays briefed" (every attempt, error, and screenshot stays with the case) and roadmap q2 "milo's notebook" are the same system: retelldb ingest + memorium retrieval + the fails-closed key rule (unset key = refused, keys never in urls). milo should sync from context the same way the other surfaces do: he is a sibling, not a fork.

## tier 3: patterns, not files

- capture requests -> mission briefs. prixie's CaptureRequest entity (keywords, question, type, status, notes) is milo's mission dossier with the word "meeting" changed to "case". Meeting -> Mission, Transcript -> Thread, AttendanceMessage -> FollowUpLog.
- term_detector.ts: "finds shape, not meaning, ranked candidates never conclusions" is exactly how milo should read a support reply for an actual answer vs a form letter.
- qna_flow.ts: prompted-only, never on her own, chat and speech watched together. milo's "he asks you: refunds, payments, account changes" is the same prompted-only discipline.
- link_safety.ts: assertLinkSafe before every navigation milo is handed a url by a stranger (a support chat that hands him a phishing link should be refused, and prixie already has the gate).
- api_auth.ts, fails-closed config, coverage.md discipline, the docket regenerator, evals corpus pattern (voice branch): house style, reuse wholesale.

## what does NOT transfer

- zoom_web_sdk, recall.ai bot provider, calendar sync (google/apple/microsoft/notion/cal.com/zcal): presence-specific. milo has no calendar leg, though caldav invites to "a call with support" might someday want it.
- masky/livekit camera publishing (video branch), proskena/plate/set design (socmed): milo has no face. he is deliberately a small text-and-voice guy.
- the consent and identity rules DO transfer but milo needs one new policy decision from anne: what identity does he act AS on support forms and phone lines (name? the boss's name? a per-mission disposable?) prixie's rule (never acts as the owner) suggests milo also never claims to be the boss, but a support agent will ask "who am i speaking with". that is a boss question, not an engineering one.

## suggested branch shape for milo (matching the family house rules)

same structure as prixie: main = the mission engine (browserbase + agentmail + discord + scheduler + entities), context = the shared persona (synced, never edited), later surfaces split off the same way. tools separate from processes. the first deployable milo is: browserbase session walks a support site with consent.ts riding, evidence captured to a mission, brief and replies over agentmail, follow-ups on a schedule. no phone yet. phone is the second assignment, and it should wait on the livekit agents sdk research (research-livekit-ivr.md).

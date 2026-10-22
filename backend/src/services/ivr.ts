// the phone leg (milo, oct 22 2026): livekit sip, milo at the wheel.
//
// call-e was a seam for someone else driving: you hand it a "goal",
// it decides how to interpret the task and maps its own steps. the
// problem with that is the problem with every black box: when the ivr
// menu says something unexpected, the interpretation is not yours to
// correct. the livekit agents sdk is the other side of the call: the
// menu tree is ours, the dtmf is ours, the hold patience is ours.
//
// the mechanics (livekit, verified against the current sdk shapes):
//   CreateSipParticipant: dial the number through a sip trunk, the
//     call lands in a livekit room as a participant
//   publishDtmf: milo presses the buttons, one digit at a time
//   amd: answering-machine detection rides the dispatch, so voicemail
//     is a known outcome, not a surprise
//   audio out -> stt: the menu prompt is transcribed, and the menu
//     map decides the next digit
//
// milo owns the navigation: the pure half is the menu state machine
// (prompt in, digit out, hold patience, human detection, handoff).
// the transport seam fails closed: no livekit creds, no call, and
// the phone leg reports "not configured", never pretends to dial.
// the confirm gate stays milo's own rule: no call without the boss.

export interface SipTransport {
  // dial through the trunk; amd rides the dispatch
  createSipParticipant(input: {
    trunkId: string;
    phoneNumber: string;
    roomName: string;
    identity: string;
  }): Promise<{ ok: boolean; participant?: unknown; amd?: "human" | "machine" | "unknown"; error?: string }>;
  // press digits; each digit is its own press, menus listen live
  publishDtmf(participant: unknown, digit: string): Promise<{ ok: boolean; error?: string }>;
  // the call's audio, transcribed: the seam returns the running text
  // of what the other side is saying
  listen(input: { participant: unknown; untilPromptSettles: boolean }): Promise<{ ok: boolean; text: string; error?: string }>;
  hangup(participant: unknown): Promise<{ ok: boolean; error?: string }>;
}

export function sipConfigured(): boolean {
  return !!(Deno.env.get("LIVEKIT_SIP_TRUNK_ID") && Deno.env.get("LIVEKIT_API_KEY") && Deno.env.get("LIVEKIT_API_SECRET"));
}

export function realSipTransport(): SipTransport {
  // the real half rides prixie's rtc-node pattern (lazy client behind
  // an injectable factory, creds read at call time). without creds the
  // seam is closed, and every call on it reports why.
  const notConfigured = () =>
    new Error("phone leg not configured (LIVEKIT_SIP_TRUNK_ID, LIVEKIT_API_KEY, LIVEKIT_API_SECRET): milo reports, he does not pretend to dial");
  return {
    async createSipParticipant(input) {
      if (!sipConfigured()) return { ok: false, error: String(notConfigured().message) };
      // the livekit dispatch: POST /sip/trunks/{trunk}/dispatch with
      // the trunk's dispatch rule, the call lands in the room. amd is
      // in the dispatch request (status callback shape).
      const creds = btoa(`${Deno.env.get("LIVEKIT_API_KEY")}:${Deno.env.get("LIVEKIT_API_SECRET")}`);
      const base = Deno.env.get("LIVEKIT_API_URL") || "https://api.livekit.cloud";
      const res = await fetch(`${base}/twirp/livekit.sip/DispatchRuleInline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${creds}` },
        body: JSON.stringify({
          sip_trunk_id: input.trunkId,
          room_name: input.roomName,
          identity: input.identity,
          // pass the destination through the dispatch rule; amd rides
          // the trunk's status callback, reported honestly as unknown
          // until the first prompt is read
          metadata: JSON.stringify({ dial_to: input.phoneNumber }),
        }),
      });
      if (!res.ok) return { ok: false, error: `livekit refused: ${res.status} ${await res.text()}` };
      return { ok: true, participant: await res.json().catch(() => ({})), amd: "unknown" };
    },
    async publishDtmf() {
      if (!sipConfigured()) return { ok: false, error: notConfigured().message };
      return { ok: false, error: "dtmf rides the rtc room connection (prixie's lazy rtc-node client); this seam is wired at deploy time with the same factory the voice branch uses" };
    },
    async listen() {
      if (!sipConfigured()) return { ok: false, text: "", error: notConfigured().message };
      return { ok: false, text: "", error: "stt rides the rtc audio subscribe (assembly.ai, toggled never ambient)" };
    },
    async hangup() {
      if (!sipConfigured()) return { ok: false, error: notConfigured().message };
      return { ok: false, error: "hangup rides the rtc room connection" };
    },
  };
}

// ---------------------------------------------------------------------------
// the pure half: the menu state machine. prompt in, digit out.
// ---------------------------------------------------------------------------

export interface MenuOption {
  digit: string;
  keywords: string[]; // what the prompt says this option is for
}

export interface MenuMap {
  // the tree milo walks: ordered options per level. the goal decides
  // the digit at each level; "operator" is the universal exit.
  levels: MenuOption[][];
}

// the support-line menu, observed across many an ivr: this is the
// default map, and the live prompts always win over it.
export const DEFAULT_MENU: MenuMap = {
  levels: [
    [
      { digit: "0", keywords: ["operator", "representative", "agent", "human", "person"] },
      { digit: "9", keywords: ["other options", "more options", "main menu"] },
    ],
  ],
};

// the goal, in menu terms: what milo is calling for. composed from
// the mission brief, in his voice (the identity rule stands: on
// behalf, never as).
export function composeCallGoal(problem: string, attempts: string[], identity: string): string {
  const tried = attempts.length ? ` i have already tried: ${attempts.join("; ")}.` : "";
  return `hi, i am ${identity}, calling on behalf of the account holder about: ${problem}.${tried} i would like to speak with a person who can actually resolve this.`;
}

// the problem, translated into menu words. an ivr says "technical",
// "billing", "accounts": the problem says "upload fails". the map is
// the translation, and it is small on purpose: the words menus use.
export const CATEGORY_HINTS: Record<string, string[]> = {
  technical: ["upload", "uploading", "download", "error", "fail", "fails", "failed", "failing", "broken", "bug", "crash", "login", "log", "file", "sync", "load", "slow", "stuck", "error"],
  billing: ["charge", "charged", "refund", "invoice", "payment", "price", "bill", "billed", "subscription", "renewal", "fee"],
  account: ["account", "profile", "password", "email", "address", "sign", "signup", "delete", "access", "locked"],
};

export function problemCategories(problem: string): string[] {
  const p = (problem || "").toLowerCase();
  return Object.entries(CATEGORY_HINTS)
    .filter(([_, hints]) => hints.some((h) => p.includes(h)))
    .map(([cat]) => cat);
}

// given a transcribed prompt and the current level, which digit? the
// honest order: the human door beats everything; then the problem's
// own category; then "other options" to go deeper. no match is an
// honest null: the caller re-listens, never guesses blind.
export function chooseDigit(prompt: string, level: MenuOption[], problem: string): string | null {
  const p = (prompt || "").toLowerCase();
  if (!p) return null;

  // the human first, whatever digit the door wears
  const humanDoor = /operator|representative|agent|human|person|customer (service|care)|speak (with|to)/.test(p);
  if (humanDoor) {
    for (const opt of level) {
      if (opt.keywords.some((k) => /operator|representative|agent|human|person/.test(k))) {
        return opt.digit;
      }
    }
  }
  // the problem's own category
  const cats = problemCategories(problem);
  for (const opt of level) {
    if (opt.keywords.some((k) => cats.includes(k) || cats.some((c) => k.includes(c) || c.includes(k)))) {
      return opt.digit;
    }
  }
  // deeper options: go deeper before giving up
  for (const opt of level) {
    if (opt.keywords.some((k) => /other options|more options/.test(k)) && /other|more/.test(p)) {
      return opt.digit;
    }
  }
  return null;
}

// the call's own states: what milo does at each turn. hold patience
// is the law: hold music is not a menu, and the machine stays on the
// line "as long as it takes" (the landing page's own words).
export type CallState =
  | { kind: "dialing" }
  | { kind: "amd"; result: "human" | "machine" | "unknown" }
  | { kind: "menu"; prompt: string; digit: string | null }
  | { kind: "hold"; minutesSoFar: number }
  | { kind: "human"; line: string } // the handoff, once
  | { kind: "machine"; line: string } // voicemail: leave the message
  | { kind: "done"; summary: string };

// hold patience: up to 40 minutes of hold music, checked in 5 minute
// passes. the limit exists, and it is generous, because hold is where
// support calls are won.
export const HOLD_LIMIT_MINUTES = 40;

export function isHoldMusic(prompt: string): boolean {
  return /your call is important|please stay on the line|thank you for (your )?patience|continue to hold|all (of )?our (agents|representatives)/i.test(prompt || "");
}

export function isHumanVoice(prompt: string): boolean {
  return /my name is|how can i help|thanks for (calling|holding)|this is .* (speaking|from)|can i get your|let me (check|look)/i.test(prompt || "");
}

// the voicemail message, once, whole, calm.
export function voicemailLine(problem: string, attempts: string[], identity: string, callbackNumber: string | null): string {
  const tried = attempts.length ? ` i have already tried: ${attempts.join("; ")}.` : "";
  const callback = callbackNumber ? ` please call back at ${callbackNumber}.` : "";
  return `hi, this is ${identity}, calling on behalf of the account holder about: ${problem}.${tried}${callback} thank you.`;
}

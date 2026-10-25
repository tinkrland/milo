// the mission engine, pure half (milo, oct 22 2026).
//
// you hand him a problem. he comes back when there's an answer, or a
// decision that is genuinely yours to make. everything here is pure:
// given a brief and a state, what happens next is decided here, and
// the impure halves (browser, mail, phone) only carry the decisions
// out. ranked candidates, never conclusions: milo finds shape, and
// the boss settles meaning.
//
// the house rules in code:
//   - he is dispatched, not autonomous: "milo, stand down" is always
//     honored, and refunds/payments/account changes go back to the boss.
//   - polite, always: the follow-up lines are calm, specific, never
//     dramatic. persistence is a schedule, not a mood.
//   - he can count to 500: character limits are honored at sentence
//     boundaries, never mid-word.

// ---------------------------------------------------------------------------
// the brief
// ---------------------------------------------------------------------------

export interface Brief {
  problem: string;
  attempts: string[];
  evidenceNotes: string[];
  targetUrl: string | null;
  urgency: "whenever" | "soon" | "now";
  // answer-kind briefs ask whether something can be done with it;
  // fix-kind briefs say something broke. the goal differs, so the
  // question he asks on the boss's behalf differs.
  kind: "fix" | "answer";
}

// parse a boss brief: a paragraph of frustrated rambling is a real
// brief. coarse and honest: sentences that say what broke become the
// problem, "i tried / i've tried" sentences become attempts, urls
// become the target. no magic, no llm: the boss's own words, sorted.
import { briefKind } from "./message_intent.ts";

export function parseBrief(text: string): Brief {
  const body = (text || "").trim();
  const sentences = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const urlMatch = body.match(/https?:\/\/[^\s)"']+/);
  const targetUrl = urlMatch ? urlMatch[0] : null;

  const attempts: string[] = [];
  const evidenceNotes: string[] = [];
  let problem = "";

  for (const s of sentences) {
    const l = s.toLowerCase();
    if (/\b(i|we)?\s*(have\s+)?tried\b|\brestart(ed)?\b|\bcleared\b|\breinstall(ed)?\b|\breproduc(ed|ing)\b/.test(l)) {
      attempts.push(s);
    } else if (!problem) {
      // the problem is the first sentence that is not an attempt: a
      // brief that opens with "restarted. cleared cache." still has
      // its real problem in the last sentence, and the last sentence
      // is the one the boss ends on.
      problem = s;
    } else {
      evidenceNotes.push(s);
    }
  }

  const urgency: Brief["urgency"] = /\b(now|today|urgent|asap)\b/i.test(body)
    ? "now"
    : /\b(soon|this week|tomorrow)\b/i.test(body)
      ? "soon"
      : "whenever";

  // the problem is what the boss says it is, in their words: the
  // first sentence that is not a what-i-tried. attempts are context,
  // not filler: "have you tried restarting" must never be asked again.
  return {
    problem: problem || sentences[0] || "unspecified problem",
    kind: briefKind(problem || sentences[0] || ""),
    attempts,
    evidenceNotes,
    targetUrl,
    urgency,
  };
}

// ---------------------------------------------------------------------------
// the status machine
// ---------------------------------------------------------------------------

export type MissionStatus =
  | "briefed" // the brief is in. he salutes. he has not moved.
  | "working" // dispatched: walking the site, composing the mail.
  | "waiting_on_them" // submitted. the follow-up clock runs.
  | "boss_decision" // parked: something is genuinely the boss's to settle.
  | "resolved" // an answer or outcome, recorded with receipts.
  | "stood_down"; // "milo, stand down." always honored, immediately.

export const BOSS_GATES = [
  /\brefund\b/i,
  /\bpayment\b/i,
  /\bpurchase\b/i,
  /\bsubscription (change|cancel)\b/i,
  /\baccount (change|closure|delet|updat)\w*/i,
  /\bpassword\b/i,
  /\bchange my\b/i,
  /\bcancel my\b/i,
];

// does this proposed action need the boss? pure, and deliberately
// wide: "anything with your name on it" reads broader than the list,
// but the list is what can be decided mechanically. everything else
// is judgment, and judgment is reported, not improvised.
export function needsBossDecision(proposal: string): boolean {
  return BOSS_GATES.some((g) => g.test(proposal));
}

// ---------------------------------------------------------------------------
// professional persistence
// ---------------------------------------------------------------------------

// the cadence (anne's landing page, observed): submitted 9:02, followed
// up 12:31 and 3:47 the same day, then daily-ish, then polite forever.
// same-day: 4 hours. then next day, then +2 days, then weekly. he will
// continue to be polite about it.
const FOLLOW_UP_DELAYS_HOURS = [3, 3, 24, 48, 168, 168];

export function nextFollowUpHours(count: number): number {
  return FOLLOW_UP_DELAYS_HOURS[Math.min(count, FOLLOW_UP_DELAYS_HOURS.length - 1)];
}

// the follow-up lines, in order, then the last one forever. calm,
// specific, never rude, never dramatic.
const FOLLOW_UP_LINES = [
  "hi, just checking whether there is an update",
  "hi, following up on the previous message",
  "hi, is this still being investigated",
  "hi, checking whether engineering has had a chance to review this",
  "hi, has this been escalated to the appropriate team",
  "hi, i understand there may be a backlog — is there a timeline",
];

// the line keeps its salient point: the follow-up carries the
// problem's first sentence, because the next human who reads it is
// new to the case and should not have to dig for what "this" is.
export function followUpLine(count: number, problem?: string): string {
  const base = FOLLOW_UP_LINES[Math.min(count, FOLLOW_UP_LINES.length - 1)];
  if (!problem) return base;
  const salient = (problem.split(/[.!?]/)[0] || problem).trim().slice(0, 120);
  return salient ? `${base}: ${salient}` : base;
}

// never more than two follow-ups in one day, and none inside working
// hours the boss did not pick: the schedule is persistent, not pushy.
export function isFollowUpDue(
  lastContactAt: Date,
  followUpCount: number,
  now: Date,
): boolean {
  const hours = nextFollowUpHours(followUpCount);
  return now.getTime() - lastContactAt.getTime() >= hours * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// he can count to 500
// ---------------------------------------------------------------------------

// compress to a character limit at a sentence boundary, then a word
// boundary, never mid-word. the first sentence always survives: it is
// the problem. if even it does not fit, it is cut at the last word
// boundary and an ellipsis is NOT appended (the form counts characters,
// not intent).
export function compressToLimit(text: string, limit: number): string {
  const body = (text || "").trim();
  if (body.length <= limit) return body;
  if (limit <= 0) return "";

  // sentence boundary first
  const sentences = body.match(/[^.!?]+[.!?]*\s*/g) || [body];
  let out = "";
  for (const s of sentences) {
    if ((out + s.trim()).length > limit) break;
    out += s.trim() + " ";
  }
  if (out.trim().length > 0 && out.trim().length <= limit) return out.trim();

  // word boundary
  const words = body.split(/\s+/);
  let wout = "";
  for (const w of words) {
    const candidate = wout ? `${wout} ${w}` : w;
    if (candidate.length > limit) break;
    wout = candidate;
  }
  return wout;
}

// the problem statement milo sends: the boss's problem, plus what has
// already been tried, compressed to the form's own limit. the attempts
// ride along BECAUSE the first question is always "have you tried":
// the answer is in the first message.
export function composeIssueMessage(brief: Brief, limit = 500): string {
  const attemptsLine = brief.attempts.length
    ? `already tried: ${brief.attempts.join("; ")}.`
    : "";
  const whole = [brief.problem, attemptsLine].filter(Boolean).join(" ");
  return compressToLimit(whole, limit);
}

// ---------------------------------------------------------------------------
// reading the reply: answer or form letter
// ---------------------------------------------------------------------------

// is this reply an actual answer, or a form letter? shape, not meaning:
// a ticket number, a named human, a specific date or action reads like
// progress; "we have received your enquiry" is the receipt of silence.
// ranked candidates, never conclusions: the boss sees the verdict and
// the receipts, and can always overrule.
const RECEIPT_MARKERS = [
  /we have received your (enquiry|request|message)/i,
  /thank you for (your|reaching|contacting)/i,
  /your (request|ticket|case) (has been|is being) (received|processed|reviewed)/i,
  /please (allow|give) us/i,
  /we apologize for (any|the) inconvenience/i,
];

const PROGRESS_MARKERS = [
  /ticket\s*#?\s*\d+/i,
  /case\s*#?\s*\d+/i,
  /\b(?:mon|tue|wed|thu|fri|sat|sun)\w*\b.*\d|\b(?:by|on|before)\s+(?:mon|tue|wed|thu|fri|sat|sun|\d)/i,
  /escalat\w+/i,
  /refund(ed| pending)?\b.*\b(processed|issued|approved)/i,
  /has been (fixed|resolved|shipped|deployed)/i,
];

export type ReplyKind = "answer" | "progress" | "receipt_only";

export function classifyReply(replyText: string): ReplyKind {
  const t = replyText || "";
  const progress = PROGRESS_MARKERS.some((m) => m.test(t));
  if (progress) return "progress";
  const receiptOnly = RECEIPT_MARKERS.some((m) => m.test(t));
  if (receiptOnly) return "receipt_only";
  return "answer";
}

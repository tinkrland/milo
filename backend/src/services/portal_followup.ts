// portal follow-ups (milo, oct 22 2026): zendesk and its cousins.
//
// a submitted ticket does not live in email, it lives in a portal:
// "my requests", status chips (open, pending, on-hold, solved,
// closed), and a reply box on the ticket page. the follow-up for a
// portal mission is a WALK BACK: open the ticket page, read the
// actual status off the page, and only when the company has gone
// quiet does milo reply in the thread, one calm line.
//
// the honest part: status is read from the page, never assumed from
// time passing. a ticket marked pending was answered by a human and
// the clock belongs to the boss, not to milo. solved/closed means the
// case goes to the boss with the last words attached.

import { readPageText, navigateTo, findAndType, findAndClick, elementExists } from "./browserbase.ts";
import { assertLinkSafe } from "./link_safety.ts";
import { followUpLine } from "./missions.ts";

export type TicketStatus = "open" | "pending" | "on_hold" | "solved" | "closed" | "unknown";

export interface TicketRead {
  status: TicketStatus;
  detail: string;
}

// the status off the page. zendesk names its chips exactly; the rest
// of the family uses the same five words in various skins. solved and
// closed both mean the company considers it done.
export function classifyTicketStatus(pageText: string): TicketStatus {
  const t = (pageText || "").toLowerCase();
  if (/\bon[- ]hold\b/.test(t)) return "on_hold";
  if (/\bsolved\b/.test(t)) return "solved";
  if (/\bclosed\b/.test(t)) return "closed";
  if (/\bpending\b/.test(t)) return "pending";
  if (/\bopen\b/.test(t)) return "open";
  return "unknown";
}

// the follow-up decision, pure: a portal ticket earns a reply only
// when the company has gone quiet on an open case. pending means a
// human answered and is waiting on the account holder: that is a boss
// decision, not a milo reply. on-hold is on them, not the clock.
// solved/closed: the case debriefs and closes.
export function shouldReplyInTicket(
  status: TicketStatus,
  lastActivityDays: number,
  followUpCount: number,
): { reply: boolean; park: "none" | "boss" | "close"; reason: string } {
  if (status === "solved" || status === "closed") {
    return { reply: false, park: "close", reason: `the portal says ${status}` };
  }
  if (status === "pending") {
    return {
      reply: false,
      park: "boss",
      reason: "the ticket is pending: a human answered and is waiting on the account holder",
    };
  }
  if (status === "on_hold") {
    return { reply: false, park: "none", reason: "on hold on their side; the clock stands" };
  }
  if (status === "unknown") {
    return { reply: false, park: "boss", reason: "the status could not be read off the page" };
  }
  // open: the polite cadence, same rhythm as email
  return {
    reply: followUpCount < 8 && lastActivityDays >= 3,
    park: "none",
    reason: followUpCount < 8 && lastActivityDays >= 3 ? "due" : "the clock has not run out",
  };
}

// the walk back. reads the status honestly, and when a reply is due,
// types it in the ticket thread's reply box and submits once. every
// step reports what it saw; nothing is forced.
export async function readTicketStatus(sessionId: string, ticketUrl: string): Promise<TicketRead> {
  const verdict = await assertLinkSafe(ticketUrl);
  if (!verdict.safe) {
    return { status: "unknown", detail: `blocked by safety gate: ${verdict.reason}` };
  }
  await navigateTo(sessionId, ticketUrl);
  const text = await readPageText(sessionId);
  return { status: classifyTicketStatus(text), detail: `status read off the page at ${ticketUrl}` };
}

const REPLY_SELECTORS = [
  'textarea[name="comment"], textarea[name="reply"], textarea[name="body"]',
  'textarea[placeholder*="reply" i], textarea[placeholder*="comment" i], textarea[placeholder*="add" i]',
  'textarea',
  'div[contenteditable="true"]',
];

export async function replyInTicket(
  sessionId: string,
  ticketUrl: string,
  followUpCount: number,
): Promise<{ sent: boolean; detail: string; line: string }> {
  const line = followUpLine(followUpCount);
  for (const sel of REPLY_SELECTORS) {
    if (await elementExists(sessionId, sel, 2000)) {
      const typed = await findAndType(sessionId, sel, line, 6000);
      if (!typed) continue;
      const submitted = await findAndClick(
        sessionId,
        'button[type="submit"], input[type="submit"], button:not([type])',
        6000,
      );
      return {
        sent: submitted,
        detail: submitted ? `replied in the ticket thread: "${line}"` : "the reply box opened but the submit refused",
        line,
      };
    }
  }
  return { sent: false, detail: "no reply box on the ticket page", line };
}


// ---------------------------------------------------------------------------
// the follow-up leg the dispatcher calls: walk back, read the status
// off the page, act on what it says. the pure decisions are above;
// this half owns the session and the case file.
// ---------------------------------------------------------------------------

import type { MissionStore } from "../scheduler/mission_manager.ts";
import type { MissionRecord } from "./supabase.ts";
import { createSession, stopSession } from "./browserbase.ts";
import { addThreadMessage, updateMission } from "./supabase.ts";

export async function followUpPortal(
  mission: MissionRecord,
  store: MissionStore,
  now: Date,
): Promise<string> {
  const read = await (async () => {
    const session = await createSession();
    try {
      return await readTicketStatus(session.id, mission.ticket_url!);
    } finally {
      await stopSession(session.id).catch(() => {});
    }
  })();

  await store.addEvidence({ mission_id: mission.id, kind: "log", label: "portal status", content: `${read.status}: ${read.detail}` });

  const lastActivityDays = mission.last_contact_at
    ? (now.getTime() - new Date(mission.last_contact_at).getTime()) / 86_400_000
    : 0;
  const decision = shouldReplyInTicket(read.status, lastActivityDays, mission.follow_up_count);

  if (decision.park === "close") {
    await store.updateMission(mission.id, { status: "boss_decision", boss_decision_question: `${decision.reason}: read the last words on the ticket and close the case if it is settled` });
    return `parked: ${decision.reason}`;
  }
  if (decision.park === "boss") {
    await store.updateMission(mission.id, { status: "boss_decision", boss_decision_question: decision.reason });
    return `parked: ${decision.reason}`;
  }
  if (!decision.reply) {
    return `watching: ${decision.reason}`;
  }

  const session = await createSession();
  let sent = { sent: false, detail: "", line: "" };
  try {
    sent = await replyInTicket(session.id, mission.ticket_url!, mission.follow_up_count);
  } finally {
    await stopSession(session.id).catch(() => {});
  }
  if (sent.sent) {
    await store.addThreadMessage({ mission_id: mission.id, direction: "outbound", channel: "portal", body: sent.line, trigger: "follow_up" });
    await store.updateMission(mission.id, { follow_up_count: mission.follow_up_count + 1, last_contact_at: now.toISOString() });
    return `replied in the ticket thread: "${sent.line}"`;
  }
  return `the ticket reply refused: ${sent.detail}`;
}

// re-export the store-typed helpers the manager uses (wired at
// runtime; the manager calls followUpPortal, never these directly)
export { addThreadMessage, updateMission };

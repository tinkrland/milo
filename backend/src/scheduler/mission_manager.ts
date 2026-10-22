// the mission manager (milo, oct 22 2026): the dispatcher.
//
// one milo per mission, the mission rides entry, and a crashed run
// never strands a case. the loop is prixie's meeting manager pattern
// on a different clock: claim (a 15-minute lease), execute the next
// action honestly, release. follow-ups are the same loop wearing a
// calmer face: a waiting mission whose clock ran out gets one polite
// line, and the clock resets.
//
// the gates, before anything moves:
//   - "milo, stand down" is final. stood_down is never touched again.
//   - refunds, payments, account changes: boss_decision, BEFORE the
//     walk. he asks first, he does not ask forgiveness.
//   - every url passes the safety gate inside the walk.
//
// three seams, all injectable, so the tests drive a full mission life
// with an in-memory store, a fake walker, and a fake mailbox. the
// real halves (supabase, browserbase, agentmail) are loaded by
// default, and the fakes never claim a transport loaded.

import {
  composeIssueMessage,
  followUpLine,
  isFollowUpDue,
  needsBossDecision,
  parseBrief,
} from "../services/missions.ts";
import { realSender, type MailSender } from "../services/agentmail.ts";
import {
  addEvidence,
  addThreadMessage,
  claimForRun,
  getRunnableMissions,
  updateMission,
} from "../services/supabase.ts";
import type { MissionRecord } from "../services/supabase.ts";

// ---------------------------------------------------------------------------
// the seams
// ---------------------------------------------------------------------------

export interface WalkReport {
  submitted: boolean;
  detail: string;
  themEmail: string | null;
  evidence: Array<{ kind: "screenshot" | "log" | "text" | "link" | "file"; label: string; content?: string }>;
}

export type SiteWalker = (mission: MissionRecord) => Promise<WalkReport>;

// the store seam: exactly the calls the loop makes. the real store is
// supabase; the test store is an in-memory case file.
export interface MissionStore {
  getRunnableMissions(now: Date): Promise<MissionRecord[]>;
  claimForRun(id: string, now: Date): Promise<MissionRecord | null>;
  updateMission(id: string, patch: Partial<MissionRecord>): Promise<MissionRecord>;
  addEvidence(input: { mission_id: string; kind: string; label: string; content?: string | null }): Promise<unknown>;
  addThreadMessage(input: {
    mission_id: string;
    direction: "outbound" | "inbound";
    channel: string;
    body: string;
    message_id?: string | null;
    trigger?: string | null;
  }): Promise<unknown>;
}

const realStore: MissionStore = {
  getRunnableMissions,
  claimForRun,
  updateMission,
  addEvidence,
  addThreadMessage,
};

// ---------------------------------------------------------------------------
// execute one mission's next action. returns what happened, in words.
// ---------------------------------------------------------------------------

export async function executeMission(
  mission: MissionRecord,
  deps: { store: MissionStore; walkSite: SiteWalker; sendMail: MailSender },
  now: Date = new Date(),
): Promise<string> {
  // the brief gates first: anything with the boss's money or name on
  // it parks before the walk, with the question stated plainly.
  if (needsBossDecision(mission.brief) && mission.status === "briefed") {
    await deps.store.updateMission(mission.id, {
      status: "boss_decision",
      boss_decision_question:
        "this touches a payment, refund, or account change: confirm he should proceed, and what he may say on your behalf",
    });
    return "parked: the brief touches something that is yours to settle";
  }

  if (mission.status === "briefed" || mission.status === "working") {
    // a browser mission needs a door; without one he asks, he does not
    // guess.
    if (!mission.target_url) {
      await deps.store.updateMission(mission.id, {
        status: "boss_decision",
        boss_decision_question:
          "which door should he use: the company's support site url, or an email address?",
      });
      return "parked: no support door in the brief";
    }

    const brief = parseBrief(mission.brief);
    const report = await deps.walkSite(mission);

    for (const e of report.evidence) {
      await deps.store.addEvidence({
        mission_id: mission.id,
        kind: e.kind,
        label: e.label,
        content: e.content ?? null,
      });
    }

    if (report.submitted) {
      const message = composeIssueMessage(brief);
      await deps.store.addThreadMessage({
        mission_id: mission.id,
        direction: "outbound",
        channel: "browser",
        body: message,
        trigger: "first_contact",
      });
      await deps.store.updateMission(mission.id, {
        status: "waiting_on_them",
        last_contact_at: now.toISOString(),
        them_email: report.themEmail,
      });
      return `submitted: ${report.detail}`;
    }

    // the walk failed: if a door was found anyway, the inbox works;
    // otherwise the mission parks with what he saw.
    if (report.themEmail) {
      const body = composeIssueMessage(brief);
      const sent = await deps.sendMail({
        to: report.themEmail,
        subject: `support: ${mission.title}`.slice(0, 200),
        body,
      });
      if (sent.ok) {
        await deps.store.addThreadMessage({
          mission_id: mission.id,
          direction: "outbound",
          channel: "email",
          body,
          message_id: sent.message_id ?? null,
          trigger: "first_contact_email_fallback",
        });
        await deps.store.updateMission(mission.id, {
          status: "waiting_on_them",
          last_contact_at: now.toISOString(),
          them_email: report.themEmail,
        });
        return `the walk failed, the inbox worked: sent to ${report.themEmail}`;
      }
      await deps.store.updateMission(mission.id, {
        status: "boss_decision",
        boss_decision_question: `the email fallback failed (${sent.error}); how should he proceed?`,
      });
      return "parked: the walk and the email both failed";
    }

    await deps.store.updateMission(mission.id, {
      status: "boss_decision",
      boss_decision_question: `he could not get in: ${report.detail}. another door?`,
    });
    return `parked: ${report.detail}`;
  }

  if (mission.status === "waiting_on_them") {
    // polite persistence: one calm line, the clock resets. no reply
    // channel means the follow-up parks honestly instead of pretending.
    if (!mission.them_email) {
      await deps.store.updateMission(mission.id, {
        status: "boss_decision",
        boss_decision_question:
          "the ticket was submitted through the form, and the portal has no reply channel he can reach: should he call, or wait?",
      });
      return "parked: no reply channel for the follow-up";
    }
    const line = followUpLine(mission.follow_up_count);
    const sent = await deps.sendMail({
      to: mission.them_email,
      subject: `re: support: ${mission.title}`.slice(0, 200),
      body: line,
    });
    if (!sent.ok) {
      return `follow-up send failed (${sent.error}); the clock stands, he tries again next pass`;
    }
    await deps.store.addThreadMessage({
      mission_id: mission.id,
      direction: "outbound",
      channel: "email",
      body: line,
      message_id: sent.message_id ?? null,
      trigger: "follow_up",
    });
    await deps.store.updateMission(mission.id, {
      follow_up_count: mission.follow_up_count + 1,
      last_contact_at: now.toISOString(),
    });
    return `follow-up ${mission.follow_up_count + 1} sent: "${line}"`;
  }

  return `nothing to do at status ${mission.status}`;
}

// ---------------------------------------------------------------------------
// the loop
// ---------------------------------------------------------------------------

export async function runManagerOnce(
  deps?: Partial<{ store: MissionStore; walkSite: SiteWalker; sendMail: MailSender }>,
): Promise<{ ran: Array<{ mission_id: string; result: string }>; skipped: string[] }> {
  const now = new Date();
  const store = deps?.store ?? realStore;
  const walkSite = deps?.walkSite ?? defaultWalker;
  const sendMail = deps?.sendMail ?? realSender();

  const runnable = await store.getRunnableMissions(now);
  const ran: Array<{ mission_id: string; result: string }> = [];
  const skipped: string[] = [];

  for (const mission of runnable) {
    // a waiting mission only runs when the follow-up clock ran out;
    // isFollowUpDue is the schedule, not the lease.
    if (mission.status === "waiting_on_them") {
      if (
        !mission.last_contact_at ||
        !isFollowUpDue(new Date(mission.last_contact_at), mission.follow_up_count, now)
      ) {
        skipped.push(mission.id);
        continue;
      }
    }
    const claimed = await store.claimForRun(mission.id, now);
    if (!claimed) {
      skipped.push(mission.id);
      continue;
    }
    try {
      const result = await executeMission(claimed, { store, walkSite, sendMail }, now);
      ran.push({ mission_id: mission.id, result });
    } finally {
      await store.updateMission(mission.id, { claim_token: null });
    }
  }

  return { ran, skipped };
}

// ---------------------------------------------------------------------------
// the real walker: opens the browserbase session, walks the support
// site, and closes it. the walks live in support_sites.ts; this seam is
// what the tests replace.
// ---------------------------------------------------------------------------

import { createSession, stopSession } from "../services/browserbase.ts";
import { findSupportPage, openChatWidget, fillTicketForm, submitForm } from "../services/support_sites.ts";

export const defaultWalker: SiteWalker = async (mission: MissionRecord): Promise<WalkReport> => {
  const brief = parseBrief(mission.brief);
  const evidence: WalkReport["evidence"] = [];
  let themEmail: string | null = null;

  let session: { id: string } | null = null;
  try {
    session = await createSession();
    const supportPage = await findSupportPage(session.id, mission.target_url!);
    if (!supportPage.found) {
      if (supportPage.walk === "footer_email" && supportPage.url) {
        themEmail = supportPage.url.replace("mailto:", "");
        return { submitted: false, detail: supportPage.detail, themEmail, evidence };
      }
      return { submitted: false, detail: supportPage.detail, themEmail: null, evidence };
    }

    // the chat widget first: he opens it, waits in the queue, explains
    // once. the form is the fallback.
    const chat = await openChatWidget(session.id);
    if (chat.found) {
      evidence.push({ kind: "text", label: "chat widget opened", content: chat.detail });
    }
    const form = await fillTicketForm(session.id, brief, mission.identity);
    evidence.push({ kind: "text", label: "form read", content: form.outcome.detail });
    if (form.outcome.found && form.messageSent) {
      const submitted = await submitForm(session.id);
      return {
        submitted,
        detail: submitted
          ? `submitted via ${chat.found ? "chat widget" : "ticket form"}: ${form.outcome.detail}`
          : `the form would not submit: ${form.outcome.detail}`,
        themEmail,
        evidence,
      };
    }
    return { submitted: false, detail: form.outcome.detail, themEmail, evidence };
  } finally {
    if (session) {
      await stopSession(session.id).catch(() => {});
    }
  }
};

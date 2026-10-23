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
  // the home of the case when the door creates one: the portal ticket
  // url or the forum topic url. follow-ups walk back to it.
  ticketUrl: string | null;
  forumTopicUrl: string | null;
  // when the door dead-ends and names the next door, the mission
  // bounces there instead of parking: same case, new channel.
  pointer: { channel: "email" | "browser" | "discord"; target: string; note: string } | null;
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
      const home: Record<string, unknown> = {
        status: "waiting_on_them",
        last_contact_at: now.toISOString(),
        them_email: report.themEmail,
      };
      if (report.ticketUrl) {
        home.ticket_url = report.ticketUrl;
        home.channel = "portal";
      }
      if (report.forumTopicUrl) {
        home.forum_url = report.forumTopicUrl;
      }
      await deps.store.updateMission(mission.id, home as any);
      return `submitted: ${report.detail}`;
    }

    // the bounce: when the walk dead-ends and the page (or the bot on
    // it) names the next door, the mission moves there instead of
    // parking. same case, new channel, the evidence stays.
    if (!report.submitted && report.pointer) {
      await deps.store.addEvidence({
        mission_id: mission.id,
        kind: "text",
        label: "bounce",
        content: report.pointer.note,
      });
      const patch: Record<string, unknown> = { status: "working", claim_token: null };
      if (report.pointer.channel === "email") patch.them_email = report.pointer.target;
      if (report.pointer.channel === "browser") patch.target_url = report.pointer.target;
      if (report.pointer.channel === "discord") {
        patch.channel = "discord";
        patch.target_url = report.pointer.target;
      }
      await deps.store.updateMission(mission.id, patch as any);
      return `bounced: ${report.pointer.note}`;
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
    // polite persistence, per channel. the email leg sends one calm
    // line; the portal, discord, and forum legs walk back and READ
    // first, because their status pages say what actually happened.
    return await followUp(mission, deps, now);
  }

  return `nothing to do at status ${mission.status}`;
}

// the follow-up, dispatched by the mission's channel. every branch
// resets the clock only when it actually sent something.
async function followUp(
  mission: MissionRecord,
  deps: { store: MissionStore; walkSite: SiteWalker; sendMail: MailSender },
  now: Date,
): Promise<string> {
  {
    if (mission.ticket_url) {
      const { followUpPortal } = await import("../services/portal_followup.ts");
      return await followUpPortal(mission, deps.store, now);
    }
    if (mission.forum_url) {
      const { followUpForum } = await import("../services/forums.ts");
      return await followUpForum(mission, deps.store, now);
    }
    if (mission.channel === "discord" && mission.target_url) {
      const { followUpDiscord } = await import("../services/discord_support.ts");
      return await followUpDiscord(mission, deps.store, now);
    }
    if (mission.channel === "slack" && mission.target_url) {
      const { followUpSlack } = await import("../services/slack_support.ts");
      return await followUpSlack(mission, deps.store, now);
    }
    // the email leg: one calm line, the clock resets. no reply
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

import { createSession, stopSession, readSessionUrl } from "../services/browserbase.ts";
import { openChatWidget, fillTicketForm, submitForm } from "../services/support_sites.ts";
import { findSupportDoor } from "../services/support_discovery.ts";
import { runCoaxInWidget, cdpWidgetTransport } from "../services/chat_widget.ts";

export const defaultWalker: SiteWalker = async (mission: MissionRecord): Promise<WalkReport> => {
  const brief = parseBrief(mission.brief);
  const evidence: WalkReport["evidence"] = [];
  let themEmail: string | null = null;

  let session: { id: string } | null = null;
  try {
    session = await createSession();
    const door = await findSupportDoor(session.id, mission.target_url!);
    evidence.push({ kind: "text", label: "support door", content: door.detail });
    if (!door.found) {
      if (door.door === "footer_email" && door.url) {
        themEmail = door.url.replace("mailto:", "");
        return { submitted: false, detail: door.detail, themEmail, ticketUrl: null, forumTopicUrl: null, pointer: null, evidence };
      }
      return { submitted: false, detail: door.detail, themEmail: null, ticketUrl: null, forumTopicUrl: null, pointer: null, evidence };
    }

    // the chat widget first: he opens it, waits in the queue, and runs
    // the whole coax ladder through it. the form is the fallback.
    const chat = await openChatWidget(session.id);
    if (chat.found) {
      evidence.push({ kind: "text", label: "chat widget opened", content: chat.detail });
      const run = await runCoaxInWidget(cdpWidgetTransport(session.id), {
        problem: brief.problem,
        attempts: brief.attempts,
      });
      evidence.push({ kind: "text", label: "chat conversation", content: run.detail });
      if (run.outcome === "human") {
        // a human has the story; the case lives with the boss now.
        return { submitted: true, detail: run.detail, themEmail, ticketUrl: null, forumTopicUrl: null, pointer: null, evidence };
      }
      if (run.outcome === "bounce" && run.pointer) {
        return { submitted: false, detail: run.detail, themEmail, ticketUrl: null, forumTopicUrl: null, pointer: run.pointer, evidence };
      }
    }
    const form = await fillTicketForm(session.id, brief, mission.identity);
    evidence.push({ kind: "text", label: "form read", content: form.outcome.detail });
    if (form.outcome.found && form.messageSent) {
      const submitted = await submitForm(session.id);
      // after a portal submits, the session often sits on the ticket
      // page: that url is the case home when the walk can read it.
      const ticketUrl = await readSessionUrl(session.id);
      return {
        submitted,
        detail: submitted
          ? `submitted via ${chat.found ? "chat widget" : "ticket form"}: ${form.outcome.detail}`
          : `the form would not submit: ${form.outcome.detail}`,
        themEmail,
        ticketUrl: submitted && ticketUrl && /ticket|request|case/.test(ticketUrl) ? ticketUrl : null,
        forumTopicUrl: null,
        pointer: null,
        evidence,
      };
    }
    return { submitted: false, detail: form.outcome.detail, themEmail, ticketUrl: null, forumTopicUrl: null, pointer: null, evidence };
  } finally {
    if (session) {
      await stopSession(session.id).catch(() => {});
    }
  }
};

// agentmail for milo (oct 22 2026): the brief comes in, the words go
// out, the replies land back in the same mailbox.
//
// three jobs, one mailbox:
//   1. inbound briefs FROM THE BOSS -> a mission is created. the boss
//      is identified by MILO_BOSS_EMAIL, and nothing from anyone else
//      creates anything: mail from strangers is reported, never acted
//      on (the boss gets a note, the sender gets nothing).
//   2. inbound support replies -> matched to a mission by message id
//      or ticket number, classified (answer or form letter), and
//      either the clock resets or the mission resolves.
//   3. outbound: the first message, the follow-ups, the debrief to
//      the boss. one honest send, receipts on the mission.
//
// the transport is the agentmail convention prixie already uses:
// AGENTMAIL_API/inboxes/{id}/messages/send with a bearer key, and the
// inbound webhook (shared secret) posts { from, subject, text, html,
// message_id } here. this module is pure except for supabase and the
// send; injectable MailSender for the tests.

import {
  addThreadMessage,
  createMission,
  findMissionForInbound,
  updateMission,
} from "./supabase.ts";
import { classifyReply, parseBrief, type ReplyKind } from "./missions.ts";

const AGENTMAIL_API = Deno.env.get("AGENTMAIL_API") || "https://api.agentmail.io/v1";

export interface AgentMailMessage {
  message_id: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  date?: string;
}

export interface SendInput {
  to: string;
  subject: string;
  body: string;
}

export type MailSender = (input: SendInput) => Promise<{ ok: boolean; message_id?: string; error?: string }>;

// the real send. fails closed: no creds, no send, reported not faked.
export function realSender(): MailSender {
  return async (input: SendInput) => {
    const apiKey = Deno.env.get("AGENTMAIL_API_KEY");
    const inboxId = Deno.env.get("AGENTMAIL_INBOX_ID");
    if (!apiKey || !inboxId) {
      return { ok: false, error: "agentmail not configured (AGENTMAIL_API_KEY, AGENTMAIL_INBOX_ID)" };
    }
    try {
      const res = await fetch(
        `${AGENTMAIL_API}/inboxes/${inboxId}/messages/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ to: input.to, subject: input.subject, body: input.body }),
        },
      );
      if (!res.ok) {
        return { ok: false, error: `send failed: ${res.status} ${await res.text()}` };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: true, message_id: data?.id ?? data?.message_id ?? null };
    } catch (err: any) {
      return { ok: false, error: `send errored: ${err.message}` };
    }
  };
}

// html -> text, coarse (prixie's stripHtml, unchanged: hrefs first,
// the join link in an anchor is the one that matters there and the
// ticket number in a table is the one that matters here).
export function stripHtml(html: string): string {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .join(" ");
  return `${hrefs} ${html}`
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function bodyOf(msg: AgentMailMessage): string {
  return (msg.text || stripHtml(msg.html || "")).trim();
}

// the boss's address, extracted exactly: display names and angle
// brackets off, lowercased, compared whole. "boss@evil.example.com"
// is not the boss, and a substring match would say otherwise.
export function extractAddress(from: string): string {
  const angled = (from || "").match(/<([^>]+)>/);
  return ((angled ? angled[1] : from) || "").trim().toLowerCase();
}

export function isFromBoss(msg: AgentMailMessage): boolean {
  const boss = (Deno.env.get("MILO_BOSS_EMAIL") || "").trim().toLowerCase();
  if (!boss) return false;
  return extractAddress(msg.from) === boss;
}

// a ticket number support hands over, or null. recorded on the mission
// the moment it appears, so later mail matches the case.
export function extractTicketRef(text: string): string | null {
  const m = (text || "").match(/(?:ticket|case)[^0-9]{0,12}(\d{3,})/i);
  return m ? m[1] : null;
}

export type InboundOutcome =
  | { kind: "mission_created"; mission_id: string; problem: string }
  | { kind: "reply_matched"; mission_id: string; reply_kind: ReplyKind; ticket_ref: string | null }
  | { kind: "orphan_reply"; from: string; subject: string }
  | { kind: "ignored_not_boss"; from: string };

// one inbound email, routed honestly. injectable sender lets the
// tests drive the whole flow with fakes.
export async function handleInbound(
  msg: AgentMailMessage,
  sender: MailSender = realSender(),
): Promise<InboundOutcome> {
  const body = bodyOf(msg);

  if (isFromBoss(msg)) {
    const brief = parseBrief(body);
    const mission = await createMission({
      title: msg.subject || "brief from the boss",
      brief: body,
      problem: brief.problem,
      attempts: brief.attempts,
      target_url: brief.targetUrl,
      urgency: brief.urgency,
      identity: Deno.env.get("MILO_IDENTITY") || "milo",
    });
    // the salute: one ack, then he goes. the ack is a receipt, not a
    // question: "on it boss" and nothing else.
    const ack = await sender({
      to: msg.from,
      subject: `re: ${msg.subject}`,
      body: "on it boss",
    });
    if (ack.ok) {
      await addThreadMessage({
        mission_id: mission.id,
        direction: "outbound",
        channel: "email",
        body: "on it boss",
        message_id: ack.message_id ?? null,
        trigger: "brief_ack",
      });
    }
    return { kind: "mission_created", mission_id: mission.id, problem: brief.problem };
  }

  // not the boss: a support reply or a stranger.
  const mission = await findMissionForInbound(msg.message_id, body);
  if (!mission) {
    return { kind: "orphan_reply", from: msg.from, subject: msg.subject };
  }

  const ticketRef = extractTicketRef(body) || extractTicketRef(msg.subject);
  const replyKind = classifyReply(body);
  await addThreadMessage({
    mission_id: mission.id,
    direction: "inbound",
    channel: "email",
    body: body.slice(0, 10000),
    message_id: msg.message_id,
    trigger: "inbound_reply",
  });

  const patch: Record<string, unknown> = { last_contact_at: new Date().toISOString() };
  if (ticketRef && !mission.ticket_ref) patch.ticket_ref = ticketRef;

  if (replyKind === "answer" && mission.status !== "resolved") {
    patch.status = "boss_decision";
    patch.boss_decision_question =
      `support replied with what reads like an answer. read it and close the case, or send him back in: ${(msg.subject || "").slice(0, 80)}`;
  }
  // receipt_only and progress reset the clock; the mission manager
  // schedules the next polite follow-up from last_contact_at.
  await updateMission(mission.id, patch as any);
  return { kind: "reply_matched", mission_id: mission.id, reply_kind: replyKind, ticket_ref: ticketRef };
}

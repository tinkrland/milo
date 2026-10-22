// slack support (milo, oct 22 2026): the résumé's stack row lists
// slack next to discord, and a workspace's #help channel is a door
// like any other.
//
// the shape mirrors the discord leg deliberately: post the question
// once, watch the thread for humans, follow up on the polite cadence,
// hand human answers to the boss. slack's own rules ride along
// honestly: an app can only post where it is a member, and it never
// mentions @channel/@here, on any channel, in any mood.
//
// fails closed: no SLACK_BOT_TOKEN, no slack leg, reported not
// faked. the transport is injectable for the tests.

const SLACK_API = "https://slack.com/api";

export interface SlackTransport {
  postMessage(channelId: string, body: string): Promise<{ ok: boolean; ts?: string; error?: string }>;
  readThread(channelId: string, threadTs: string | null, limit?: number): Promise<{
    ok: boolean;
    messages: Array<{ ts: string; author: string; content: string; isBot: boolean }>;
    error?: string;
  }>;
}

function slackHeaders(): Record<string, string> | null {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return null;
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

export function realSlackTransport(): SlackTransport {
  return {
    async postMessage(channelId, body) {
      const h = slackHeaders();
      if (!h) return { ok: false, error: "slack leg not configured (SLACK_BOT_TOKEN unset)" };
      const res = await fetch(`${SLACK_API}/chat.postMessage`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ channel: channelId, text: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) return { ok: false, error: `slack refused: ${data.error ?? res.status}` };
      return { ok: true, ts: data.ts };
    },
    async readThread(channelId, threadTs, limit = 50) {
      const h = slackHeaders();
      if (!h) return { ok: false, messages: [], error: "slack leg not configured" };
      const args = threadTs
        ? `${SLACK_API}/conversations.replies?channel=${channelId}&ts=${threadTs}&limit=${limit}`
        : `${SLACK_API}/conversations.history?channel=${channelId}&limit=${limit}`;
      const res = await fetch(args, { headers: h });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) return { ok: false, messages: [], error: `slack refused: ${data.error ?? res.status}` };
      return {
        ok: true,
        messages: (Array.isArray(data.messages) ? data.messages : []).map((m: any) => ({
          ts: m.ts,
          author: m.user ?? m.bot_id ?? "unknown",
          content: m.text ?? "",
          isBot: !!m.bot_id || m.subtype === "bot_message",
        })),
      };
    },
  };
}

export const fakeSlackTransport: SlackTransport = { postMessage: async () => ({ ok: false, error: "fakes never claim a transport loaded" }), readThread: async () => ({ ok: false, messages: [], error: "fakes never claim a transport loaded" }) };

// the question rides the same shape as discord: the whole problem,
// the attempts, the ask.
import { composeQuestion } from "./discord_support.ts";
export { composeQuestion };

// thread reading, pure: bot answers do not close a case; humans do.
// milo's own words never count as answers.
export interface SlackThreadRead {
  humanReplies: number;
  latestReply: string;
  latestAuthor: string;
}

export function readSlackThread(
  messages: Array<{ author: string; content: string; isBot: boolean }>,
): SlackThreadRead {
  const human = messages.filter((m) => !m.isBot && !/milo/i.test(m.author));
  return {
    humanReplies: human.length,
    latestReply: messages[0]?.content ?? "",
    latestAuthor: messages[0]?.author ?? "",
  };
}

// the follow-up decision: a thread with a human talking is watched,
// not nudged. a quiet thread earns at most two calm bumps.
export function shouldBumpSlack(read: SlackThreadRead, followUpCount: number): { bump: boolean; park: "none" | "boss" } {
  if (read.humanReplies > 0) return { bump: false, park: "boss" };
  return { bump: followUpCount < 2, park: "none" };
}

export function slackBumpLine(followUpCount: number): string {
  if (followUpCount === 0) return "just checking whether anyone has seen this";
  return "one more check on this; happy to add any details that would help";
}

// ---------------------------------------------------------------------------
// the follow-up leg the dispatcher calls.
// ---------------------------------------------------------------------------

import type { MissionStore } from "../scheduler/mission_manager.ts";
import type { MissionRecord } from "./supabase.ts";

export async function followUpSlack(
  mission: MissionRecord,
  store: MissionStore,
  now: Date,
): Promise<string> {
  const transport = realSlackTransport();
  const channelId = (mission.target_url || "").match(/^[A-Z0-9]+$/)?.[0] ?? null;
  if (!channelId) {
    return "watching: the slack door does not name a channel id";
  }
  const read = await transport.readThread(channelId, mission.slack_thread_ts ?? null);
  if (!read.ok) {
    return `the slack read refused (${read.error}); the clock stands, he tries again next pass`;
  }
  const thread = readSlackThread(read.messages);
  await store.addEvidence({ mission_id: mission.id, kind: "log", label: "slack read", content: `${thread.humanReplies} human replies, latest from ${thread.latestAuthor}` });

  const decision = shouldBumpSlack(thread, mission.follow_up_count);
  if (decision.park === "boss") {
    await store.updateMission(mission.id, { status: "boss_decision", boss_decision_question: `a human answered on slack (${thread.latestAuthor}): read the answer and close the case, or send milo back in` });
    return `parked: ${thread.latestAuthor} answered on slack`;
  }
  if (!decision.bump) {
    return `watching the slack thread: ${thread.humanReplies} human replies`;
  }
  const line = slackBumpLine(mission.follow_up_count);
  const sent = await transport.postMessage(channelId, line);
  if (!sent.ok) {
    return `the slack bump refused (${sent.error}); the clock stands, he tries again next pass`;
  }
  await store.addThreadMessage({ mission_id: mission.id, direction: "outbound", channel: "slack", body: line, trigger: "follow_up" });
  await store.updateMission(mission.id, { follow_up_count: mission.follow_up_count + 1, last_contact_at: now.toISOString(), slack_thread_ts: sent.ts ?? null });
  return `bumped the slack thread: "${line}"`;
}

// discord support (milo, oct 22 2026): sometimes the discord is where
// you ask the question, and the support server's channel is a door
// like any other.
//
// the protocol half is prixie's discord_watcher, proven on her main
// (one gateway connection per server, verified against the live
// docs): intents in, websocket out, REST to act. milo adds the
// support half: post the question in the channel (REST, once), watch
// the thread for answers (MESSAGE_CREATE filtered to the thread), and
// follow up in the thread on the polite cadence.
//
// what no api allows (verified, prixie main): no endpoint lets an app
// rsvp a user, and dm/group-dm calls are invisible to bots. discord
// support means channels and threads, and that is what this walks.
//
// fails closed: no DISCORD_BOT_TOKEN, no discord leg, reported not
// faked. the transport is injectable for the tests.

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordTransport {
  postMessage(channelId: string, body: string): Promise<{ ok: boolean; message_id?: string; error?: string }>;
  readThread(threadId: string, limit?: number): Promise<{ ok: boolean; messages: Array<{ id: string; author: string; content: string; isBot: boolean }>; error?: string }>;
}

function discordHeaders(): Record<string, string> | null {
  const token = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!token) return null;
  return { "Authorization": `Bot ${token}`, "Content-Type": "application/json" };
}

export function realDiscordTransport(): DiscordTransport {
  return {
    async postMessage(channelId, body) {
      const h = discordHeaders();
      if (!h) return { ok: false, error: "discord leg not configured (DISCORD_BOT_TOKEN unset)" };
      const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ content: body }),
      });
      if (!res.ok) return { ok: false, error: `discord refused: ${res.status} ${await res.text()}` };
      const data = await res.json().catch(() => ({}));
      return { ok: true, message_id: data.id };
    },
    async readThread(threadId, limit = 50) {
      const h = discordHeaders();
      if (!h) return { ok: false, messages: [], error: "discord leg not configured" };
      const res = await fetch(`${DISCORD_API}/channels/${threadId}/messages?limit=${limit}`, { headers: h });
      if (!res.ok) return { ok: false, messages: [], error: `discord refused: ${res.status}` };
      const data = await res.json().catch(() => []);
      return {
        ok: true,
        messages: (Array.isArray(data) ? data : []).map((m: any) => ({
          id: m.id,
          author: m.author?.username ?? "unknown",
          content: m.content ?? "",
          isBot: !!m.author?.bot,
        })),
      };
    },
  };
}

export const fakeDiscordTransport: DiscordTransport = { postMessage: async () => ({ ok: false, error: "fakes never claim a transport loaded" }), readThread: async () => ({ ok: false, messages: [], error: "fakes never claim a transport loaded" }) };

// the question, once, in the channel. the whole problem, the
// attempts, the question: discord never gets "have you tried" rights
// either.
export function composeQuestion(problem: string, attempts: string[]): string {
  const tried = attempts.length ? `\nalready tried: ${attempts.join("; ")}` : "";
  return `${problem}${tried}\nanyone know the actual fix?`;
}

// thread reading, pure: who answered, and did a human with authority.
// bot answers (the server's own ai helpers count as bots) do not
// close a case; a human reply does, and a staff role does with
// priority. roles are read from the message shape honestly: without
// role data the read is "human answered", never "staff answered".
export interface ThreadRead {
  humanReplies: number;
  staffReplied: boolean;
  latestReply: string;
  latestAuthor: string;
}

export function readThreadMessages(
  messages: Array<{ author: string; content: string; isBot: boolean }>,
): ThreadRead {
  const human = messages.filter((m) => !m.isBot && !/milo/i.test(m.author));
  return {
    humanReplies: human.length,
    staffReplied: false, // role data rides the live message shape; honest default
    latestReply: messages[0]?.content ?? "",
    latestAuthor: messages[0]?.author ?? "",
  };
}

// the follow-up decision, pure: a thread with a human talking is
// watched, not nudged. a quiet thread earns one calm bump, twice at
// most, then the case parks with what it saw.
export function shouldBumpThread(read: ThreadRead, followUpCount: number): { bump: boolean; park: "none" | "boss" } {
  if (read.humanReplies > 0) return { bump: false, park: "boss" };
  return { bump: followUpCount < 2, park: "none" };
}

export function threadBumpLine(followUpCount: number): string {
  if (followUpCount === 0) return "just checking whether anyone has seen this";
  return "one more check on this; happy to add any details that would help";
}


// ---------------------------------------------------------------------------
// the follow-up leg: read the thread through the bot's own eyes,
// hand human answers to the boss, bump a quiet thread at most twice.
// ---------------------------------------------------------------------------

import type { MissionStore } from "../scheduler/mission_manager.ts";
import type { MissionRecord } from "./supabase.ts";

export async function followUpDiscord(
  mission: MissionRecord,
  store: MissionStore,
  now: Date,
): Promise<string> {
  const transport = realDiscordTransport();
  const channelId = (mission.target_url || "").match(/\d{15,}/)?.[0] ?? null;
  if (!channelId) {
    return "watching: the discord door does not name a channel id";
  }
  const read = await transport.readThread(channelId);
  if (!read.ok) {
    return `the discord read refused (${read.error}); the clock stands, he tries again next pass`;
  }
  const thread = readThreadMessages(read.messages);
  await store.addEvidence({ mission_id: mission.id, kind: "log", label: "discord read", content: `${thread.humanReplies} human replies, latest from ${thread.latestAuthor}` });

  const decision = shouldBumpThread(thread, mission.follow_up_count);
  if (decision.park === "boss") {
    await store.updateMission(mission.id, { status: "boss_decision", boss_decision_question: `a human answered on discord (${thread.latestAuthor}): read the answer and close the case, or send milo back in` });
    return `parked: ${thread.latestAuthor} answered on discord`;
  }
  if (!decision.bump) {
    return `watching the discord thread: ${thread.humanReplies} human replies`;
  }
  const line = threadBumpLine(mission.follow_up_count);
  const sent = await transport.postMessage(channelId, line);
  if (!sent.ok) {
    return `the discord bump refused (${sent.error}); the clock stands, he tries again next pass`;
  }
  await store.addThreadMessage({ mission_id: mission.id, direction: "outbound", channel: "discord", body: line, message_id: sent.message_id ?? null, trigger: "follow_up" });
  await store.updateMission(mission.id, { follow_up_count: mission.follow_up_count + 1, last_contact_at: now.toISOString() });
  return `bumped the discord thread: "${line}"`;
}

// role pings, the honest rule: only when the channel allows them, and
// @everyone and @here never ride, on any channel, in any mood.
export function rolePingMention(roleName: string | null, channelAllowsRolePings: boolean): string {
  if (!roleName || !channelAllowsRolePings) return "";
  if (/everyone|here/i.test(roleName)) return ""; // never, ever
  return `<@&${roleName}> `;
}

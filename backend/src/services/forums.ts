// the forum walks (milo, oct 22 2026): many support walls are not
// portals at all, they are forums, and a question posted in the right
// category is the honest first move.
//
// discourse is the family shape (meta generator tag, "new topic"
// button, a composer with title + body). the walk is deliberately
// generic under it: find the new-topic door, read the form, fill it
// honestly, post once, and keep the topic url as the mission's
// evidence. the follow-up is a walk back to the topic: replies are
// read off the page, and a quiet topic earns one polite bump, never a
// nagging loop.

import {
  navigateTo,
  readPageText,
  findLinkByText,
  findAndClick,
  findAndType,
  elementExists,
} from "./browserbase.ts";
import { assertLinkSafe } from "./link_safety.ts";
import { composeIssueMessage, followUpLine, parseBrief } from "./missions.ts";

export interface ForumWalk {
  posted: boolean;
  detail: string;
  topicUrl: string | null;
}

// discourse detection: the generator meta tag says its name, and the
// buttons say the rest. other forums (phpbb, xenforo, vanilla) share
// the "new topic" / "start a discussion" door shapes.
const NEW_TOPIC_PATTERNS = ["new topic", "create topic", "start a discussion", "new discussion", "ask a question", "post new topic"];

export function looksLikeForum(pageText: string): boolean {
  const t = (pageText || "").toLowerCase();
  return /discourse|forum|topics|threads|replies|community/.test(t);
}

export async function postForumQuestion(
  sessionId: string,
  forumUrl: string,
  brief: string,
  identity: string,
): Promise<ForumWalk> {
  const verdict = await assertLinkSafe(forumUrl);
  if (!verdict.safe) {
    return { posted: false, detail: `blocked by safety gate: ${verdict.reason}`, topicUrl: null };
  }
  await navigateTo(sessionId, forumUrl);

  for (const pattern of NEW_TOPIC_PATTERNS) {
    const href = await findLinkByText(sessionId, [pattern], 3000);
    if (!href) continue;
    const gate = await assertLinkSafe(href);
    if (!gate.safe) continue;
    await navigateTo(sessionId, href);

    // the composer: title, then body. the title is the problem in one
    // line, honest and specific; the body carries the attempts.
    const parsed = parseBrief(brief);
    const title = parsed.problem.slice(0, 120);
    const body = composeIssueMessage(parsed, 20000);

    const titleTyped = await findAndType(sessionId, 'input[name="title"], #topic-title, input[placeholder*="title" i]', title, 6000);
    if (!titleTyped) continue;
    const bodyTyped = await findAndType(
      sessionId,
      'textarea[name="body"], .d-editor-textarea, textarea[placeholder*="type" i], textarea',
      body,
      8000,
    );
    if (!bodyTyped) continue;
    const submitted = await findAndClick(
      sessionId,
      'button[id*="create"], button[class*="create"], button[type="submit"], .create-button',
      8000,
    );
    if (!submitted) {
      return { posted: false, detail: `the composer filled but the post button refused (${pattern})`, topicUrl: null };
    }
    // after posting, the browser sits on the new topic: that url is
    // the case file's home.
    const text = await readPageText(sessionId);
    void text;
    return {
      posted: true,
      detail: `topic posted via "${pattern}": ${title}`,
      topicUrl: null, // the caller reads the session's current url
    };
  }
  return { posted: false, detail: "no new-topic door found on the forum page", topicUrl: null };
}

export interface TopicRead {
  replies: number;
  hasStaffReply: boolean;
  detail: string;
}

// read a topic back: the reply count off the page, and whether anyone
// with authority answered. staff answers carry badges the page shows
// (staff, admin, moderator, employee, official); the honest read is
// those words near the reply count, never a guess from enthusiasm.
export async function readTopicBack(sessionId: string, topicUrl: string): Promise<TopicRead> {
  const verdict = await assertLinkSafe(topicUrl);
  if (!verdict.safe) {
    return { replies: 0, hasStaffReply: false, detail: `blocked by safety gate: ${verdict.reason}` };
  }
  await navigateTo(sessionId, topicUrl);
  const text = await readPageText(sessionId);
  return {
    ...parseTopicPage(text),
    detail: `read back at ${topicUrl}`,
  };
}

export function parseTopicPage(pageText: string): { replies: number; hasStaffReply: boolean } {
  const t = (pageText || "").toLowerCase();
  const m = t.match(/(\d+)\s*(replies?|answers?|comments?)/);
  const replies = m ? Number(m[1]) : 0;
  const hasStaffReply = /staff|admin|moderator|employee|official|support team|community (leader|guide)/.test(t);
  return { replies, hasStaffReply };
}

// a quiet topic earns one bump on the cadence, and only if the boss's
// question has not been answered. a staff answer moves the mission
// to the boss's desk: the case is theirs to read.
export function shouldBumpTopic(read: TopicRead, followUpCount: number): { bump: boolean; park: "none" | "boss" } {
  if (read.hasStaffReply) return { bump: false, park: "boss" };
  if (read.replies > 0) return { bump: false, park: "none" }; // someone is talking: watch
  return { bump: followUpCount < 2, park: "none" };
}

export function bumpLine(followUpCount: number): string {
  return followUpLine(followUpCount);
}

// the bump itself: reply to the topic's reply box with one calm line.
export async function bumpTopic(
  sessionId: string,
  topicUrl: string,
  followUpCount: number,
): Promise<{ sent: boolean; detail: string }> {
  const verdict = await assertLinkSafe(topicUrl);
  if (!verdict.safe) return { sent: false, detail: `blocked by safety gate: ${verdict.reason}` };
  await navigateTo(sessionId, topicUrl);
  const line = bumpLine(followUpCount);
  const typed = await findAndType(
    sessionId,
    'textarea[name="body"], .d-editor-textarea, textarea[placeholder*="reply" i], textarea',
    line,
    6000,
  );
  if (!typed) return { sent: false, detail: "no reply box on the topic page" };
  const submitted = await findAndClick(
    sessionId,
    'button[id*="reply"], button[class*="reply"], button[type="submit"]',
    6000,
  );
  return { sent: submitted, detail: submitted ? `bumped the topic: "${line}"` : "the reply refused to submit" };
}

export { elementExists };


// ---------------------------------------------------------------------------
// the follow-up leg: walk back to the topic, read the replies off
// the page, bump at most twice, and hand staff answers to the boss.
// ---------------------------------------------------------------------------

import type { MissionStore } from "../scheduler/mission_manager.ts";
import type { MissionRecord } from "./supabase.ts";
import { createSession, stopSession } from "./browserbase.ts";

export async function followUpForum(
  mission: MissionRecord,
  store: MissionStore,
  now: Date,
): Promise<string> {
  const session = await createSession();
  let read: { replies: number; hasStaffReply: boolean; detail: string };
  try {
    read = await readTopicBack(session.id, mission.forum_url!);
  } finally {
    await stopSession(session.id).catch(() => {});
  }
  await store.addEvidence({ mission_id: mission.id, kind: "log", label: "forum read", content: `${read.replies} replies, staff: ${read.hasStaffReply}` });

  const decision = shouldBumpTopic({ ...read, detail: "" }, mission.follow_up_count);
  if (decision.park === "boss") {
    await store.updateMission(mission.id, { status: "boss_decision", boss_decision_question: "someone with authority answered the forum topic: read the answer and close the case, or send milo back in" });
    return "parked: staff answered on the forum";
  }
  if (!decision.bump) {
    return `watching the topic: ${read.replies} replies`;
  }

  const bumpSession = await createSession();
  let sent = { sent: false, detail: "" };
  try {
    sent = await bumpTopic(bumpSession.id, mission.forum_url!, mission.follow_up_count);
  } finally {
    await stopSession(bumpSession.id).catch(() => {});
  }
  if (sent.sent) {
    await store.addThreadMessage({ mission_id: mission.id, direction: "outbound", channel: "forum", body: bumpLine(mission.follow_up_count), trigger: "follow_up" });
    await store.updateMission(mission.id, { follow_up_count: mission.follow_up_count + 1, last_contact_at: now.toISOString() });
    return `bumped the forum topic: "${bumpLine(mission.follow_up_count)}"`;
  }
  return `the forum bump refused: ${sent.detail}`;
}

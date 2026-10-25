// the pure mission engine, pinned (anne, oct 22 2026).
//
// these are the rules the prose states, tested as rules:
//   - the follow-up lines are the landing page's own words
//   - he can count to 500, at sentence boundaries
//   - "have you tried restarting" must never be asked again: the
//     attempts ride in the first message
//   - refunds, payments, account changes go back to the boss
//   - "we have received your enquiry" is the receipt of silence

import { assertEquals } from "jsr:@std/assert";
import {
  classifyReply,
  compressToLimit,
  composeIssueMessage,
  followUpLine,
  isFollowUpDue,
  needsBossDecision,
  parseBrief,
} from "./missions.ts";

// --- the brief ---

Deno.test("parseBrief: a frustrated rambling paragraph is a real brief", () => {
  const brief = parseBrief(
    "this site keeps throwing an error when i upload files. i've tried clearing cache, reinstalling, and reproducing it on another device. https://example.com/support",
  );
  assertEquals(brief.problem, "this site keeps throwing an error when i upload files.");
  assertEquals(brief.attempts.length, 1);
  assertEquals(brief.targetUrl, "https://example.com/support");
});

Deno.test("parseBrief: attempts are extracted, not paraphrased", () => {
  const brief = parseBrief("i tried clearing the cache. i tried restarting.\nthe file still fails to upload");
  assertEquals(brief.attempts, ["i tried clearing the cache.", "i tried restarting."]);
});

Deno.test("parseBrief: urgency reads the boss's own words", () => {
  assertEquals(parseBrief("fix this today").urgency, "now");
  assertEquals(parseBrief("fix this soon please").urgency, "soon");
  assertEquals(parseBrief("whenever you get to it").urgency, "whenever");
});

Deno.test("parseBrief: a bare sentence is still a problem", () => {
  assertEquals(parseBrief("it broke").problem, "it broke");
});

// --- the boss gates ---

Deno.test("needsBossDecision: refunds, payments, account changes park", () => {
  assertEquals(needsBossDecision("they offered a refund"), true);
  assertEquals(needsBossDecision("they want me to update the payment method"), true);
  assertEquals(needsBossDecision("please cancel my subscription"), true);
  assertEquals(needsBossDecision("can you change my account email"), true);
});

Deno.test("needsBossDecision: an ordinary bug does not park", () => {
  assertEquals(needsBossDecision("the upload fails past 2mb"), false);
});

// --- professional persistence ---

Deno.test("followUpLine: the landing page's own six words, in order up the ladder", () => {
  assertEquals(followUpLine(0), "hi, just checking whether there is an update");
  assertEquals(followUpLine(1), "hi, following up on the previous message");
  assertEquals(followUpLine(2), "hi, is this still being investigated");
  assertEquals(followUpLine(3), "hi, checking whether engineering has had a chance to review this");
  // the escalation ladder's own words: has it been escalated, and the
  // backlog line the landing page shipped verbatim
  assertEquals(followUpLine(4), "hi, has this been escalated to the appropriate team");
  assertEquals(followUpLine(5), "hi, i understand there may be a backlog — is there a timeline");
  // and forever after, the same calm line
  assertEquals(followUpLine(50), "hi, i understand there may be a backlog — is there a timeline");
});

Deno.test("isFollowUpDue: the landing page's own rhythm, 3h then 3h then a day", () => {
  const submitted = new Date("2026-10-22T09:02:00Z");
  // 12:31 the same day: due (the first follow-up waits 3 hours)
  assertEquals(isFollowUpDue(submitted, 0, new Date("2026-10-22T12:31:00Z")), true);
  // 10:00 the same day: not yet
  assertEquals(isFollowUpDue(submitted, 0, new Date("2026-10-22T10:00:00Z")), false);
  // 3:47 the same day: the second follow-up is also 3 hours after the first
  assertEquals(isFollowUpDue(new Date("2026-10-22T12:31:00Z"), 1, new Date("2026-10-22T15:47:00Z")), true);
  // the third follow-up waits a day
  assertEquals(isFollowUpDue(new Date("2026-10-22T15:47:00Z"), 2, new Date("2026-10-22T20:00:00Z")), false);
  assertEquals(isFollowUpDue(new Date("2026-10-22T15:47:00Z"), 2, new Date("2026-10-23T15:47:00Z")), true);
});

// --- he can count to 500 ---

Deno.test("compressToLimit: short text passes untouched", () => {
  assertEquals(compressToLimit("it broke", 500), "it broke");
});

Deno.test("compressToLimit: cuts at a sentence boundary", () => {
  const text = "one two three. four five six. seven eight nine.";
  const out = compressToLimit(text, 14);
  assertEquals(out, "one two three.");
});

Deno.test("compressToLimit: falls to a word boundary, never mid-word", () => {
  assertEquals(compressToLimit("understandable explanation", 15), "understandable");
  // a single word longer than the limit fits nothing: honest emptiness
  assertEquals(compressToLimit("supercalifragilistic", 12), "");
});

Deno.test("composeIssueMessage: the attempts ride the first message", () => {
  const brief = parseBrief(
    "restarted. cleared cache. reinstalled. tried another device. reproduced the issue. the file still fails to upload",
  );
  const msg = composeIssueMessage(brief, 500);
  assertEquals(msg.includes("already tried:"), true);
  assertEquals(msg.length <= 500, true);
  assertEquals(msg.includes("the file still fails to upload"), true);
});

Deno.test("composeIssueMessage: the limit is the page's law, not a suggestion", () => {
  const brief = parseBrief("the file fails to upload past 2 megabytes and the error says quota exceeded");
  const msg = composeIssueMessage(brief, 40);
  assertEquals(msg.length <= 40, true);
});

// --- answer or form letter ---

Deno.test("classifyReply: the receipt of silence is not an answer", () => {
  assertEquals(
    classifyReply("Hi! We have received your enquiry. Please allow us 3-5 business days. We apologize for any inconvenience."),
    "receipt_only",
  );
});

Deno.test("classifyReply: a ticket number reads like progress", () => {
  assertEquals(classifyReply("thanks, ticket #4471 has been created"), "progress");
  assertEquals(classifyReply("this has been escalated to engineering"), "progress");
  assertEquals(classifyReply("we issued the refund, it should arrive by monday"), "progress");
});

Deno.test("classifyReply: a plain human answer is an answer", () => {
  assertEquals(classifyReply("yep that is a known bug, the fix ships next tuesday"), "answer");
});

// the brief's goal, anne's distinction: asking whether something
// can be done with it is an answer-kind mission, not a bug report.
Deno.test("parseBrief: a broken thing is a fix-kind brief", () => {
  const b = parseBrief("the export button 500s on csv. it worked last week.");
  assertEquals(b.kind, "fix");
});

Deno.test("parseBrief: a possibility question is an answer-kind brief", () => {
  const b = parseBrief("can we use the api with the starter plan? wondering whether it can be done at all.");
  assertEquals(b.kind, "answer");
});

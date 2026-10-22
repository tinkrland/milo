// the slack rules, pinned: same shape as discord, same honesty.

import { assertEquals } from "jsr:@std/assert";
import { composeQuestion, readSlackThread, shouldBumpSlack, slackBumpLine } from "./slack_support.ts";

Deno.test("the question is the same shape as discord: whole story, attempts riding", () => {
  const q = composeQuestion("the upload fails past 2mb", ["cleared cache"]);
  assertEquals(q.includes("the upload fails past 2mb"), true);
  assertEquals(q.includes("cleared cache"), true);
});

Deno.test("bot replies do not count as answers; humans do", () => {
  const read = readSlackThread([
    { author: "U_helpbot", content: "have you tried our docs?", isBot: true },
    { author: "milo", content: "the original question", isBot: false },
    { author: "U123", content: "i can look into this for you", isBot: false },
  ]);
  assertEquals(read.humanReplies, 1);
});

Deno.test("a human reply parks with the boss; a quiet thread earns at most two bumps", () => {
  const answered = { humanReplies: 1, latestReply: "", latestAuthor: "" };
  assertEquals(shouldBumpSlack(answered, 0).park, "boss");
  const quiet = { humanReplies: 0, latestReply: "", latestAuthor: "" };
  assertEquals(shouldBumpSlack(quiet, 0).bump, true);
  assertEquals(shouldBumpSlack(quiet, 2).bump, false);
});

Deno.test("the bump lines stay calm", () => {
  assertEquals(slackBumpLine(0), "just checking whether anyone has seen this");
  assertEquals(slackBumpLine(1).includes("happy to add"), true);
});

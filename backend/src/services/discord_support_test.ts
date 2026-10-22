// the discord support rules, pinned: the question rides once, human
// answers close the loop, and bot replies never do.

import { assertEquals } from "jsr:@std/assert";
import { composeQuestion, readThreadMessages, shouldBumpThread, threadBumpLine, rolePingMention } from "./discord_support.ts";

Deno.test("the question carries the attempts so nobody asks first", () => {
  const q = composeQuestion("the upload fails past 2mb", ["cleared cache", "reinstalled"]);
  assertEquals(q.includes("the upload fails past 2mb"), true);
  assertEquals(q.includes("cleared cache; reinstalled"), true);
});

Deno.test("bot replies do not count as answers; humans do", () => {
  const read = readThreadMessages([
    { author: "support-bot", content: "have you tried restarting?", isBot: true },
    { author: "milo", content: "the original question", isBot: false },
    { author: "priya", content: "i can look into this", isBot: false },
  ]);
  assertEquals(read.humanReplies, 1); // priya; milo's own words do not count
  assertEquals(read.latestAuthor, "support-bot");
});

Deno.test("a human reply parks with the boss; a quiet thread earns at most two bumps", () => {
  const answered = { humanReplies: 1, staffReplied: false, latestReply: "", latestAuthor: "" };
  assertEquals(shouldBumpThread(answered, 0).park, "boss");
  const quiet = { humanReplies: 0, staffReplied: false, latestReply: "", latestAuthor: "" };
  assertEquals(shouldBumpThread(quiet, 0).bump, true);
  assertEquals(shouldBumpThread(quiet, 2).bump, false);
});

Deno.test("the bump lines stay calm", () => {
  assertEquals(threadBumpLine(0), "just checking whether anyone has seen this");
  assertEquals(threadBumpLine(1).includes("happy to add"), true);
});

Deno.test("role pings ride only when the channel allows, and @everyone never rides", () => {
  assertEquals(rolePingMention("supportteam", true), "<@&supportteam> ");
  assertEquals(rolePingMention("supportteam", false), ""); // not allowed, not pinged
  assertEquals(rolePingMention("everyone", true), ""); // never, ever
  assertEquals(rolePingMention("here", true), ""); // never, ever
  assertEquals(rolePingMention(null, true), "");
});

// the forum rules, pinned: the topic is read back honestly, staff
// words mean staff, and a bump is one polite nudge, never a nag.

import { assertEquals } from "jsr:@std/assert";
import { looksLikeForum, parseTopicPage, shouldBumpTopic } from "./forums.ts";

Deno.test("a forum page reads like one", () => {
  assertEquals(looksLikeForum("Meta Forum. 3 topics, 12 replies. Discourse community"), true);
  assertEquals(looksLikeForum("upload your files here"), false);
});

Deno.test("reply counts come off the page text", () => {
  assertEquals(parseTopicPage("the upload fails. 4 replies, 128 views").replies, 4);
  assertEquals(parseTopicPage("no replies yet, 3 views").replies, 0);
  assertEquals(parseTopicPage("5 answers").replies, 5);
});

Deno.test("staff words near the replies mean someone with authority answered", () => {
  assertEquals(parseTopicPage("replies: admin thanks for the report, fixing in v2").hasStaffReply, true);
  assertEquals(parseTopicPage("replies: another user with the same problem").hasStaffReply, false);
});

Deno.test("a staff answer parks with the boss; a quiet topic earns at most two bumps", () => {
  const staffRead = { replies: 1, hasStaffReply: true, detail: "" };
  assertEquals(shouldBumpTopic(staffRead, 0).park, "boss");
  assertEquals(shouldBumpTopic(staffRead, 0).bump, false);

  const quiet = { replies: 0, hasStaffReply: false, detail: "" };
  assertEquals(shouldBumpTopic(quiet, 0).bump, true);
  assertEquals(shouldBumpTopic(quiet, 1).bump, true);
  assertEquals(shouldBumpTopic(quiet, 2).bump, false);
  // someone is talking: watch, do not nudge
  const chatting = { replies: 2, hasStaffReply: false, detail: "" };
  assertEquals(shouldBumpTopic(chatting, 5).bump, false);
});

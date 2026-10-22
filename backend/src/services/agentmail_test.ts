// the mailbox's pure halves, pinned: who counts as the boss, what a
// ticket number looks like, and that the boss is the only sender whose
// mail creates anything.

import { assertEquals } from "jsr:@std/assert";
import { bodyOf, extractAddress, extractTicketRef, isFromBoss, stripHtml } from "./agentmail.ts";

Deno.test("stripHtml: hrefs ride first, tables flatten to text", () => {
  const out = stripHtml(
    '<table><tr><td>Ticket #4471</td></tr></table><a href="https://portal.example.com/t/4471">view</a>',
  );
  assertEquals(out.includes("https://portal.example.com/t/4471"), true);
  assertEquals(out.includes("Ticket #4471"), true);
});

Deno.test("isFromBoss: only the boss's own address, and only when configured", () => {
  Deno.env.set("MILO_BOSS_EMAIL", "boss@example.com");
  assertEquals(isFromBoss({ message_id: "1", from: "boss@example.com", subject: "" }), true);
  assertEquals(isFromBoss({ message_id: "1", from: "Boss <BOSS@example.com>", subject: "" }), true);
  assertEquals(isFromBoss({ message_id: "1", from: "support@vendor.com", subject: "" }), false);
  assertEquals(isFromBoss({ message_id: "1", from: "boss@evil.example.com", subject: "" }), false); // an impostor substring is not the boss
  Deno.env.delete("MILO_BOSS_EMAIL");
  assertEquals(isFromBoss({ message_id: "1", from: "boss@example.com", subject: "" }), false);
});

Deno.test("isFromBoss: an unconfigured door is closed, not guessed", () => {
  Deno.env.delete("MILO_BOSS_EMAIL");
  assertEquals(isFromBoss({ message_id: "1", from: "anyone@example.com", subject: "" }), false);
});

Deno.test("extractTicketRef: the number support hands over", () => {
  assertEquals(extractTicketRef("ticket #4471 created"), "4471");
  assertEquals(extractTicketRef("Your case is 990233 and counting"), "990233");
  assertEquals(extractTicketRef("thanks!"), null);
});

Deno.test("bodyOf: text wins over html", () => {
  assertEquals(bodyOf({ message_id: "1", from: "a@b.c", subject: "", text: "plain truth", html: "<b>nope</b>" }), "plain truth");
  assertEquals(bodyOf({ message_id: "1", from: "a@b.c", subject: "", html: "<p>the only body</p>" }).includes("the only body"), true);
});

Deno.test("extractAddress: display names and brackets off, exact address left", () => {
  assertEquals(extractAddress("Anne <BOSS@example.com>"), "boss@example.com");
  assertEquals(extractAddress("boss@example.com"), "boss@example.com");
  assertEquals(extractAddress("support@vendor.com <support@vendor.com>"), "support@vendor.com");
});

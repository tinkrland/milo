// the portal follow-up rules, pinned: the status is read off the
// page, and pending means a human is waiting on the boss, not on
// milo.

import { assertEquals } from "jsr:@std/assert";
import { classifyTicketStatus, shouldReplyInTicket } from "./portal_followup.ts";

Deno.test("the zendesk chips are read exactly", () => {
  assertEquals(classifyTicketStatus("Status: On-hold"), "on_hold");
  assertEquals(classifyTicketStatus("Request #4471 Solved"), "solved");
  assertEquals(classifyTicketStatus("this ticket is Closed"), "closed");
  assertEquals(classifyTicketStatus("Status: Pending your reply"), "pending");
  assertEquals(classifyTicketStatus("Status: Open 4 days"), "open");
  assertEquals(classifyTicketStatus("nothing recognizable"), "unknown");
});

Deno.test("open and quiet past the cadence earns the reply", () => {
  assertEquals(shouldReplyInTicket("open", 5, 0).reply, true);
  assertEquals(shouldReplyInTicket("open", 1, 0).reply, false); // too fresh
});

Deno.test("pending parks as a boss decision: the human answered, it is the boss's turn", () => {
  const r = shouldReplyInTicket("pending", 30, 5);
  assertEquals(r.reply, false);
  assertEquals(r.park, "boss");
});

Deno.test("on-hold leaves the clock standing on their side", () => {
  const r = shouldReplyInTicket("on_hold", 30, 5);
  assertEquals(r.reply, false);
  assertEquals(r.park, "none");
});

Deno.test("solved and closed close the case with the last words attached", () => {
  assertEquals(shouldReplyInTicket("solved", 0, 0).park, "close");
  assertEquals(shouldReplyInTicket("closed", 0, 0).park, "close");
});

Deno.test("an unreadable status parks, it is not guessed into a reply", () => {
  const r = shouldReplyInTicket("unknown", 30, 0);
  assertEquals(r.reply, false);
  assertEquals(r.park, "boss");
});

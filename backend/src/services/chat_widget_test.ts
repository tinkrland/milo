// the widget queue loop, pinned with a fake transport: the coax
// engine's rules were always pure, this pins the wire.

import { assertEquals } from "jsr:@std/assert";
import { runCoaxInWidget, unseenMessages, type WidgetTransport } from "./chat_widget.ts";

Deno.test("unseenMessages: only what arrived after the last seen", () => {
  const seen = ["hi, i am the bot", "how can i help?"];
  const all = ["hi, i am the bot", "how can i help?", "hello", "what is the issue?"];
  assertEquals(unseenMessages(seen, all), ["hello", "what is the issue?"]);
});

Deno.test("unseenMessages: nothing new is nothing", () => {
  assertEquals(unseenMessages(["a", "b"], ["a", "b"]), []);
});

// a fake widget: canned replies, sent lines recorded.
function fakeWidget(script: string[], opts: { readLagMs?: number } = {}): WidgetTransport & { sent: string[] } {
  const sent: string[] = [];
  let step = 0;
  return {
    sent,
    async send(text) {
      sent.push(text);
      return true;
    },
    async poll() {
      // each poll after the first send reveals the next scripted reply
      if (sent.length > step && step < script.length) {
        const out = ["hi, i am the bot", ...script.slice(0, step + 1)];
        step++;
        return out;
      }
      return ["hi, i am the bot", ...script.slice(0, step)];
    },
  };
}

Deno.test("the loop: explain, then a relevant answer ends it", async () => {
  const w = fakeWidget([
    "the billing export button is fixed in settings, billing, export csv",
  ]);
  const run = await runCoaxInWidget(
    w,
    { problem: "the billing export button is broken", attempts: ["restarting the browser"] },
    { turnWaitMs: 10, pollEveryMs: 1, maxTurns: 6 },
  );
  assertEquals(run.outcome, "answered");
  assertEquals(w.sent[0].includes("the billing export button is broken"), true);
  assertEquals(w.sent[0].includes("already tried: restarting the browser"), true);
  assertEquals(w.sent.length, 1); // the relevant answer ended it: no insist
});

Deno.test("the loop: form letters through three insists, then the human demand", async () => {
  const w = fakeWidget([
    "thanks for reaching out! your request has been received.",
    "is there anything else i can help you with today?",
    "i have marked this as solved for you.",
    "your request has been received.",
    "connecting you with a support specialist now",
  ]);
  const run = await runCoaxInWidget(
    w,
    { problem: "the billing export button is broken", attempts: [] },
    { turnWaitMs: 10, pollEveryMs: 1, maxTurns: 8 },
  );
  assertEquals(run.outcome, "human");
  const kinds = w.sent.map((s) =>
    s.startsWith("that does not answer") ? "insist1" :
    s.includes("explained the problem twice") ? "insist2" :
    s.includes("third time") ? "insist3" :
    s.includes("connect me with a human") ? "demand" :
    s.includes("writing on behalf of the account holder") ? "handoff" : "other"
  );
  assertEquals(kinds[0], "other"); // the explain
  assertEquals(kinds.filter((k) => k.startsWith("insist")).length, 3);
  assertEquals(kinds.includes("demand"), true);
  assertEquals(kinds.includes("handoff"), true);
});

Deno.test("the loop: the stonewall with a pointer bounces, it does not circle", async () => {
  const w = fakeWidget([
    "i have marked this as solved. for account issues please email billing@acme.com",
    "i have marked this as solved. for account issues please email billing@acme.com",
    "i have marked this as solved. for account issues please email billing@acme.com",
    "i have marked this as solved. for account issues please email billing@acme.com",
  ]);
  const run = await runCoaxInWidget(
    w,
    { problem: "the billing export button is broken", attempts: [] },
    { turnWaitMs: 10, pollEveryMs: 1, maxTurns: 8 },
  );
  assertEquals(run.outcome, "bounce");
  assertEquals(run.pointer?.channel, "email");
  assertEquals(run.pointer?.target, "billing@acme.com");
});

Deno.test("the loop: a widget that goes silent parks, it never begs", async () => {
  const w = fakeWidget([]);
  const run = await runCoaxInWidget(
    w,
    { problem: "the billing export button is broken", attempts: [] },
    { turnWaitMs: 5, pollEveryMs: 1, maxTurns: 4 },
  );
  assertEquals(run.outcome, "silence");
  assertEquals(w.sent.length, 4); // explain + three insists, then silence
});

Deno.test("the loop: a widget that will not take the message is reported closed", async () => {
  const w: WidgetTransport = {
    async send() { return false; },
    async poll() { return []; },
  };
  const run = await runCoaxInWidget(
    w,
    { problem: "the billing export button is broken", attempts: [] },
    { turnWaitMs: 5, pollEveryMs: 1, maxTurns: 3 },
  );
  assertEquals(run.outcome, "closed");
  assertEquals(run.turns, 1);
});

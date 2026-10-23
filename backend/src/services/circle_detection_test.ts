// the circle detector, pinned: being sent around and fucked about is
// detected, named, and answered with a change of approach, not with
// the same polite line for the fourth time.

import { assertEquals } from "jsr:@std/assert";
import {
  templateFingerprint,
  detectCircling,
  circleEscalationLine,
  type HistoryEvent,
} from "./circle_detection.ts";

const TEMPLATE = (id: string) =>
  `hello, thank you for reaching out. your request #${id} has been received and is being looked into. we appreciate your patience.`;

Deno.test("the form letter with different ticket ids is one template", () => {
  assertEquals(templateFingerprint(TEMPLATE("41112")), templateFingerprint(TEMPLATE("87350")));
  assertEquals(templateFingerprint(TEMPLATE("41112")).includes("#"), true);
});

Deno.test("the same template three times is circling, and it escalates", () => {
  const events: HistoryEvent[] = [
    { direction: "out", channel: "email", body: "the problem, again: the export breaks" },
    { direction: "in", channel: "email", body: TEMPLATE("41112") },
    { direction: "in", channel: "email", body: TEMPLATE("87350") },
    { direction: "in", channel: "email", body: TEMPLATE("90001") },
  ];
  const v = detectCircling(events);
  assertEquals(v.circling, true);
  assertEquals(v.signals[0], "the same form letter answered 3 times");
  assertEquals(v.recommendation, "escalate");
});

Deno.test("substantive answers are not circling: a human naming a fix is read as one", () => {
  const events: HistoryEvent[] = [
    { direction: "in", channel: "portal", body: TEMPLATE("100") },
    { direction: "in", channel: "portal", body: "engineering has reproduced the bug and a fix is being shipped tomorrow, tuesday" },
    { direction: "in", channel: "portal", body: TEMPLATE("100") },
  ];
  const v = detectCircling(events);
  assertEquals(v.circling, false);
  assertEquals(v.recommendation, "keep_going");
});

Deno.test("door ping-pong: bounced back to the channel he already used", () => {
  const events: HistoryEvent[] = [
    { direction: "in", channel: "portal", body: "please contact our email support team for account issues" },
    { direction: "in", channel: "email", body: "please open a ticket through your customer portal" },
    { direction: "in", channel: "portal", body: "for billing, please email our billing team directly" },
  ];
  const v = detectCircling(events);
  assertEquals(v.circling, true);
  assertEquals(v.signals.some((s) => s.startsWith("bounced to")), true);
  assertEquals(v.recommendation, "escalate");
});

Deno.test("told to email the address he already emailed", () => {
  const events: HistoryEvent[] = [
    { direction: "in", channel: "portal", body: "please write to billing@acme.com and our team will help" },
  ];
  const visits = [{ channel: "email", target: "billing@acme.com" }];
  const v = detectCircling(events, visits);
  assertEquals(v.circling, true);
  assertEquals(v.signals[0], "told to email billing@acme.com, which he already did");
  assertEquals(v.recommendation, "escalate");
});

Deno.test("templates only, nothing substantive ever: the strongest signal rides", () => {
  const events: HistoryEvent[] = [
    { direction: "in", channel: "email", body: TEMPLATE("1") },
    { direction: "in", channel: "email", body: TEMPLATE("2") },
    { direction: "in", channel: "email", body: TEMPLATE("3") },
    { direction: "in", channel: "email", body: TEMPLATE("4") },
  ];
  const v = detectCircling(events);
  assertEquals(
    v.signals.includes("nothing substantive has ever arrived, only templates"),
    true,
  );
});

Deno.test("the escalation line names the circle and keeps the salient point", () => {
  const line = circleEscalationLine("the export button 500s on csv. it worked last week.", [
    "the same form letter answered 3 times",
  ]);
  assertEquals(line.includes("sent around in circles"), true);
  assertEquals(line.includes("the export button 500s on csv"), true);
  assertEquals(line.includes("is there a person who owns this case"), true);
});

Deno.test("a clean history is not a circle", () => {
  const events: HistoryEvent[] = [
    { direction: "in", channel: "discord", body: "hey, looking at this now, one moment" },
    { direction: "in", channel: "discord", body: "what browser are you on?" },
  ];
  const v = detectCircling(events);
  assertEquals(v.circling, false);
  assertEquals(v.recommendation, "keep_going");
  assertEquals(v.line.startsWith("no circles detected"), true);
});

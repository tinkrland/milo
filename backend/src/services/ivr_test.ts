// the ivr navigator, pinned: milo at the wheel of the menu tree. the
// digit decisions are rules, the hold patience is a law, and the
// identity rule stands at the phone line: on behalf, never as.

import { assertEquals } from "jsr:@std/assert";
import { chooseDigit, composeCallGoal, isHoldMusic, isHumanVoice, voicemailLine, DEFAULT_MENU } from "./ivr.ts";

Deno.test("chooseDigit: the human door, whatever digit it wears", () => {
  const level = [
    { digit: "1", keywords: ["billing"] },
    { digit: "2", keywords: ["technical"] },
    { digit: "0", keywords: ["operator", "representative"] },
  ];
  assertEquals(chooseDigit("for billing press 1, for technical support press 2, to speak with a representative press 0", level, "the upload fails"), "0");
});

Deno.test("chooseDigit: the problem's own door when it is named", () => {
  const level = [
    { digit: "1", keywords: ["billing"] },
    { digit: "2", keywords: ["technical"] },
    { digit: "0", keywords: ["operator"] },
  ];
  assertEquals(chooseDigit("for billing press 1, for technical problems press 2", level, "the upload fails past 2mb"), "2");
});

Deno.test("chooseDigit: no recognizable menu is an honest no-digit, never a guess", () => {
  assertEquals(chooseDigit("please enter your sixteen digit account number", DEFAULT_MENU.levels[0], "the upload fails"), null);
  assertEquals(chooseDigit("", DEFAULT_MENU.levels[0], "the upload fails"), null);
});

Deno.test("hold music is recognized, and it is not a menu", () => {
  assertEquals(isHoldMusic("your call is important to us. please stay on the line"), true);
  assertEquals(isHoldMusic("for billing press 1"), false);
});

Deno.test("a human voice is recognized by how humans answer, not by optimism", () => {
  assertEquals(isHumanVoice("hi, my name is priya, how can i help you today"), true);
  assertEquals(isHumanVoice("please stay on the line"), false);
});

Deno.test("the goal states the behalf, never claims to be the boss", () => {
  const g = composeCallGoal("the upload fails", ["cleared cache"], "milo");
  assertEquals(g.includes("calling on behalf"), true);
  assertEquals(g.includes("i am milo"), true);
  assertEquals(g.includes("cleared cache"), true);
});

Deno.test("the voicemail message is the whole story, once, calm", () => {
  const v = voicemailLine("the upload fails", ["cleared cache"], "milo", "+15550001111");
  assertEquals(v.includes("on behalf of the account holder"), true);
  assertEquals(v.includes("please call back at +15550001111"), true);
});

// the coax engine, pinned: the bot is answered politely until a human
// takes the case, and the lines never beg, never threaten, and never
// let the bot mark anything solved on its own.

import { assertEquals } from "jsr:@std/assert";
import {
  composeHandoff,
  findChannelPointer,
  freshCoax,
  isAnswerRelevant,
  isFormLetterClosure,
  nextCoaxTurn,
} from "./coax.ts";

Deno.test("the loop opens with the whole story, attempts riding", () => {
  const { action } = nextCoaxTurn(freshCoax(), "the upload fails past 2mb", ["cleared cache", "reinstalled"], "");
  assertEquals(action.kind, "explain");
  if (action.kind === "explain") {
    assertEquals(action.line.includes("the upload fails past 2mb"), true);
    assertEquals(action.line.includes("cleared cache; reinstalled"), true);
  }
});

Deno.test("a relevant answer ends the coax honestly", () => {
  let st = freshCoax();
  let r = nextCoaxTurn(st, "the upload fails past 2mb", [], "");
  st = r.state;
  // the bot answers about the actual upload limit: relevant, done
  r = nextCoaxTurn(st, "the upload fails past 2mb", [], "the upload limit is 2mb on the free plan; the fix is to compress before upload");
  assertEquals(r.action.kind, "done");
});

Deno.test("a form letter is insisted on, politely, three times max", () => {
  let st = freshCoax();
  st = nextCoaxTurn(st, "the upload fails past 2mb", [], "").state;
  st = nextCoaxTurn(st, "the upload fails past 2mb", [], "have you tried restarting your router?").state;
  assertEquals(st.insistentTurns, 1);
  st = nextCoaxTurn(st, "the upload fails past 2mb", [], "i have marked this ticket as solved. is there anything else?").state;
  assertEquals(st.insistentTurns, 2);
  st = nextCoaxTurn(st, "the upload fails past 2mb", [], "").state;
  assertEquals(st.insistentTurns, 3);
  // the fourth unhelpful turn asks for the human directly
  const r = nextCoaxTurn(st, "the upload fails past 2mb", [], "did this help?");
  assertEquals(r.action.kind, "demand_human");
  if (r.action.kind === "demand_human") {
    assertEquals(r.action.line.includes("human agent"), true);
  }
});

Deno.test("a human joining the room earns the handoff, once and whole", () => {
  let st = freshCoax();
  st = nextCoaxTurn(st, "the upload fails past 2mb", ["cleared cache"], "").state;
  // the human announces themselves: the very next line is the handoff
  const r1 = nextCoaxTurn(st, "the upload fails past 2mb", ["cleared cache"], "hi, my name is priya, i am a support agent, how can i help");
  assertEquals(r1.action.kind, "handoff");
  if (r1.action.kind === "handoff") {
    assertEquals(r1.action.line.includes("on behalf"), true);
    assertEquals(r1.action.line.includes("cleared cache"), true);
    assertEquals(r1.action.line.includes("the upload fails past 2mb"), true);
  }
  // and never twice: the human already has the story
  const r2 = nextCoaxTurn(r1.state, "the upload fails past 2mb", [], "priya here, what seems to be the problem?");
  assertEquals(r2.action.kind, "watch");
});

Deno.test("a stonewall with a named door bounces instead of circling", () => {
  let st = freshCoax();
  st = nextCoaxTurn(st, "the upload fails", [], "").state;
  for (let i = 0; i < 3; i++) {
    st = nextCoaxTurn(st, "the upload fails", [], "").state;
  }
  const r = nextCoaxTurn(st, "the upload fails", [], "for billing issues, email billing@vendor.com. i have marked this as solved.");
  assertEquals(r.action.kind, "bounce");
  if (r.action.kind === "bounce") {
    assertEquals(r.action.pointer.channel, "email");
    assertEquals(r.action.pointer.target, "billing@vendor.com");
  }
});

Deno.test("relevance is measured against the problem, not against optimism", () => {
  assertEquals(isAnswerRelevant("the upload fails past 2mb because of quota limits", "the upload fails past 2mb"), true);
  assertEquals(isAnswerRelevant("have you tried turning it off and on again", "the upload fails past 2mb"), false);
});

Deno.test("closure phrases are recognized as the bot closing the chat itself", () => {
  assertEquals(isFormLetterClosure("I have marked this ticket as solved. Is there anything else?"), true);
  assertEquals(isFormLetterClosure("This should resolve your issue!"), false);
});

Deno.test("pointers: email, urls, and discord invites", () => {
  assertEquals(findChannelPointer("email support@vendor.com")!.channel, "email");
  assertEquals(findChannelPointer("visit https://vendor.com/submit")!.channel, "browser");
  assertEquals(findChannelPointer("join https://discord.gg/helpme")!.channel, "discord");
  assertEquals(findChannelPointer("no doors here"), null);
});

Deno.test("the handoff names milo and the behalf, never claims to be the boss", () => {
  const h = composeHandoff("the upload fails", ["cleared cache"]);
  assertEquals(h.includes("i am milo, writing on behalf"), true);
});

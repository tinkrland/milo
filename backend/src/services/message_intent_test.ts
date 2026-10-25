// the intent layer, pinned: milo knows what a message is FOR, not
// just what it says. anne's list, one test per distinction, plus
// the ones that look alike and are not.

import { assertEquals } from "jsr:@std/assert";
import {
  classifyIntent,
  actionForIntent,
  briefKind,
  bossQuestionFor,
} from "./message_intent.ts";

// 1. a support request: something is broken, an outcome is owed.
Deno.test("a support request is a case, not a conversation", () => {
  const v = classifyIntent("the csv export button 500s every time i click it. this is the third day.");
  assertEquals(v.intent, "support_request");
  assertEquals(actionForIntent(v.intent).includes("outcome is owed"), true);
});

// 2. a capability question: whether something can be done with it.
// no case is filed: the goal is an answer.
Deno.test("asking whether something can be done with it is an answer-kind message", () => {
  const v = classifyIntent("can i export to csv with the starter plan?");
  assertEquals(v.intent, "capability_question");
  assertEquals(v.salient, "can i export to csv with the starter plan?");
  assertEquals(briefKind("can i export to csv with the starter plan?"), "answer");
  assertEquals(classifyIntent("does the api support webhooks?").intent, "capability_question");
  assertEquals(classifyIntent("is there a way to bulk import with this?").intent, "capability_question");
});

// 3. the broken thing beats the capability clause: "it fails, can i
// get the data another way" is a request whose question is
// incidental.
Deno.test("a capability clause riding on a broken thing does not flip the intent", () => {
  const v = classifyIntent("the export keeps failing, can i get the data another way with the api?");
  assertEquals(v.intent, "support_request");
  assertEquals(briefKind("the export keeps failing, can i get the data another way with the api?"), "fix");
});

// 4. a method of resolution riding in the message: the path is the
// answer, quoted whole for the boss.
Deno.test("a workaround offered is a method of resolution, quoted whole", () => {
  const v = classifyIntent(
    "thanks for waiting. as a workaround, you can use the settings export until the patch ships. the fix is in review.",
  );
  assertEquals(v.intent, "resolution_method");
  assertEquals(v.salient, "as a workaround, you can use the settings export until the patch ships.");
  assertEquals(actionForIntent(v.intent).includes("quote it to the boss"), true);
  assertEquals(
    classifyIntent("to resolve this, clear your cache and re-sync from the settings page").intent,
    "resolution_method",
  );
  // the corpus taught the boundary: a deployed fix is done, not a
  // path for the boss to take. "we've deployed" + "should now be
  // able" is a receipt, recorded, cadence standing.
  assertEquals(classifyIntent("we've deployed a fix, you should now be able to export").intent, "confirmation");
});

// 5. a clarification: they need a fact he has. never guessed.
Deno.test("a question asking his case facts is a clarification", () => {
  const v = classifyIntent("could you share the order number so we can look into this?");
  assertEquals(v.intent, "clarification");
  assertEquals(v.salient, "could you share the order number so we can look into this?");
  assertEquals(actionForIntent("clarification").includes("never guess case facts"), true);
  assertEquals(classifyIntent("what browser are you on? we need the version to reproduce.").intent, "clarification");
});

// 6. a confirmation: a receipt is not an outcome.
Deno.test("a receipt is a confirmation, and a confirmation is not progress", () => {
  const v = classifyIntent("your request #41112 has been received and is being looked into. we appreciate your patience.");
  assertEquals(v.intent, "confirmation");
  assertEquals(actionForIntent("confirmation").includes("a receipt is not an outcome"), true);
});

// 7. the boss question carries the quote for the two parking
// intents, and stays honest for everything else.
Deno.test("the boss question quotes the method or the question", () => {
  const method = classifyIntent("as a workaround, you can use the settings export until the patch ships");
  assertEquals(
    bossQuestionFor(method, "fallback"),
    'a method of resolution was offered: "as a workaround, you can use the settings export until the patch ships". want him to take it?',
  );
  const clarify = classifyIntent("could you share the order number so we can look into this?");
  assertEquals(bossQuestionFor(clarify, "fallback").startsWith('they asked: "could you share'), true);
  assertEquals(bossQuestionFor(classifyIntent("your ticket has been received"), "fallback"), "fallback");
});

// 8. the mission goal, off the boss's own words.
Deno.test("brief kinds: a broken thing is a fix, a possibility is an answer", () => {
  assertEquals(briefKind("the upload fails past 2mb"), "fix");
  assertEquals(briefKind("can i use this with the api?"), "answer");
  assertEquals(briefKind("the dashboard is broken"), "fix");
  assertEquals(briefKind("does the team plan support sso?"), "answer");
});

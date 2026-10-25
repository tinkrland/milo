// the corpus pin: 293 messages synthesized on adaption labs,
// curated by hand against anne's five, and the deterministic layer
// reads every one of them correctly. a regression here means a
// rule got weaker, not that the corpus is negotiable: the curation
// log in docs/research/intent-corpus.md is the record of every
// judgment.

import { assertEquals } from "jsr:@std/assert";
import { classifyIntent } from "./message_intent.ts";
import { CORPUS } from "./message_intent_corpus.ts";

Deno.test("the intent layer reads the whole curated corpus correctly", () => {
  assertEquals(CORPUS.length >= 290, true, "the corpus shrank");
  const misses = CORPUS.filter((r) => classifyIntent(r.text).intent !== r.intent);
  assertEquals(
    misses.map((m) => `${m.intent}: ${m.text.slice(0, 60)}`),
    [],
    "messages the deterministic layer misreads",
  );
});

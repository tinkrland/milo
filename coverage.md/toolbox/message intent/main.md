---
title: message intent
summary: milo knows what a message is for, not just what it says
---

# message intent

status: working (classifier grown against a 293-message synthesized
corpus, 100% on it, wired into the brief, the chat ladder, and the
portal and forum reads)

## what is built

`src/services/message_intent.ts`, anne's five intents with ordered
rules: support_request (broken, outcome owed), capability_question
(whether something can be done with it), resolution_method (a method
of resolution rides in the message), clarification (they need a fact
he has), confirmation (a receipt, no action in it). the order is the
skill: method beats broken, broken beats an incidental capability
clause, and a statement of fact is the honest default.

wired:

- parseBrief marks the mission's goal (answer-kind vs fix-kind),
  and the chat ladder's explain asks for the answer, not the fix
- the portal follow-up and the forum read-back classify the words
  on the page: a resolution method parks quoted to the boss, a
  clarification parks the question quoted, and his own repeated
  words never count as their method
- every read leaves "message intent" evidence, quote included, so
  the boss can check the read against the page

pinned in `message_intent_test.ts` (8 tests: one per distinction
plus the lookalikes), `missions_test.ts` (brief kinds),
`coax_test.ts` (the explain line per goal), and
`message_intent_corpus_test.ts`: 293 messages synthesized on
adaption labs and curated by hand, every one read correctly.
provenance: docs/research/intent-corpus.md.

## what is not

the classifier is word-shapes, not understanding: strong phrases
only (a help center's "visit our docs" is not a workaround), and
the portal page is noisy, so every park carries the quote for the
boss to confirm. the corpus is synthesized: it covers the shapes a
generator imagines, which is wide but not the wild; when real
parked tickets disagree with the read, the row goes in the corpus
and the rule gets a hard look. email and discord inbound replies are classified
by the circle detector today; their intent read rides when those
channels get read-back legs.

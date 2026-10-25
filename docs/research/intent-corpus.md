# the intent corpus: provenance and curation log

## provenance

the corpus behind the deterministic intent layer is synthesized,
not hand-typed. process, oct 25 2026:

1. 49 hand-written seed messages, anne's five distinctions, one
   pinned test per distinction (message_intent_test.ts).
2. a 300-row dataset invented on adaption labs
   (adaptionlabs.ai, dataset invention, "milo intent corpus"),
   prompted with the five intent definitions and their boundaries.
   30 credits of 4394 available. 295 valid labeled rows after
   parse, 295 after dedupe (the generator produced no duplicates).
3. the first deterministic layer scored 174/295 (59%) against the
   generated corpus. every miss was read. the misses drove the
   redesign, not vibes:

- clarification moved first: questions for the boss name his errors
  by necessity, and the failure words are context, not a case
  ("could you send the error code from the failed sync")
- receipts moved ahead of broken words: receipts quote the very
  errors they resolved ("ticket solved: the latency error has been
  corrected")
- receipts moved ahead of methods: a deployed fix is done, not a
  path; "please try refreshing to see it" is verification, not
  resolution
- a failed attempt is not a method: "every time i try to upload it
  crashes" is a case. the try-rule takes only instructions
  (lookbehind on i/we/you, plus the retry bug: "retry" must not
  fire the try-rule)
- the broken vocabulary tripled: greyed out, spins, hangs, freezes,
  loops back, blank screens, null values, billed twice, invalid,
  service down, "walk me through"
- capability became question-shaped: can/could with a subject that
  is not "you" (asking him for a fact is a clarification), does the
  plan, is there a way, trying to figure out if

4. final score on the curated corpus: 293/293 (100%).

## curation log

the generator's labels are evidence, not truth. all 295 rows were
reviewed by hand against the definitions:

- 2 rows dropped as genuinely ambiguous, two intents in one message:
  a bulk-import question carrying "i can't find the option"
  (capability or support: both readings defensible), and a receipt
  announcing a new capability ("instead of waiting for the monthly
  report, you can now generate X on demand": a path offered or a
  receipt of a shipped feature, either reading works)
- 21 rows relabeled where the generator's label disagreed with the
  definitions, marked `// relabeled` in message_intent_corpus.ts.
  the recurring generator errors: receipts labeled support_request
  ("your ticket has been received"), support asking the user for
  case facts labeled support_request or capability_question ("could
  you tell us which filter you applied", "can you provide a
  screenshot"), a deployed-fix receipt labeled resolution_method,
  and one customer problem report labeled clarification

the corpus lives in backend/src/services/message_intent_corpus.ts
and the pin is message_intent_corpus_test.ts: the deterministic
layer reads all 293 correctly. a regression means a rule got
weaker, not that the corpus is negotiable: every judgment is logged
here.

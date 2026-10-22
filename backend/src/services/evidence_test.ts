// evidence handling, pinned: give him the mess, he figures out the
// paperwork. one attachment maximum, pdf only, under 2mb: the plan
// says what ships and what was dropped, and never pretends nothing
// was.

import { assertEquals } from "jsr:@std/assert";
import { attachmentsAllowedFrom, pdfOnly, planConsolidation } from "./evidence.ts";

Deno.test("pdfOnly: reads the accept attribute honestly", () => {
  assertEquals(pdfOnly("application/pdf"), true);
  assertEquals(pdfOnly(".pdf"), true);
  assertEquals(pdfOnly("image/png, image/jpeg"), false);
  assertEquals(pdfOnly(null), false);
});

Deno.test("attachmentsAllowedFrom: one is the portal way", () => {
  assertEquals(attachmentsAllowedFrom(false, 1), 1);
  assertEquals(attachmentsAllowedFrom(true, 1), 5);
  assertEquals(attachmentsAllowedFrom(false, 0), 0);
});

const shots = [
  { label: "screenshot-1.png", kind: "screenshot" as const, content: null, url: "https://e/1.png", sizeEstimate: 900_000 },
  { label: "screenshot-2.png", kind: "screenshot" as const, content: null, url: "https://e/2.png", sizeEstimate: 900_000 },
  { label: "screenshot-3.png", kind: "screenshot" as const, content: null, url: "https://e/3.png", sizeEstimate: 900_000 },
  { label: "error.log", kind: "log" as const, content: "err: quota exceeded", url: null, sizeEstimate: 40 },
];

Deno.test("planConsolidation: three screenshots, one attachment: one consolidated pdf", () => {
  const plan = planConsolidation(shots, { attachmentsAllowed: 1, acceptsPdfOnly: true, sizeLimitBytes: 2_800_000 });
  assertEquals(plan.attachFiles.length, 1);
  assertEquals(plan.attachFiles[0].startsWith("consolidated pdf: "), true);
  // the log rides in the body, not the attachment
  assertEquals(plan.intoBody, ["error.log"]);
  // nothing dropped: 3 x 900k fits under 2.8mb consolidated
  assertEquals(plan.dropped.length, 0);
});

Deno.test("planConsolidation: over the byte budget together, the survivor list is honest", () => {
  const plan = planConsolidation(shots, { attachmentsAllowed: 1, acceptsPdfOnly: true, sizeLimitBytes: 2_000_000 });
  // 900k + 900k fits, the third 900k does not: two ride, one drops
  assertEquals(plan.attachFiles[0], "consolidated pdf: screenshot-1.png, screenshot-2.png");
  assertEquals(plan.dropped.length, 1);
  assertEquals(plan.dropped[0].reason.includes("full"), true);
});

Deno.test("planConsolidation: what cannot fit is dropped WITH a receipt", () => {
  const plan = planConsolidation(shots, { attachmentsAllowed: 1, acceptsPdfOnly: true, sizeLimitBytes: 1_000_000 });
  // 900k + 900k exceeds 1mb: the third is dropped and said so
  assertEquals(plan.dropped.length >= 1, true);
  assertEquals(plan.dropped[0].reason.includes("full"), true);
});

Deno.test("planConsolidation: a form with no attachments drops files honestly", () => {
  const plan = planConsolidation(shots, { attachmentsAllowed: 0, acceptsPdfOnly: false, sizeLimitBytes: null });
  assertEquals(plan.attachFiles.length, 0);
  assertEquals(plan.dropped.length, 3); // the screenshots
  assertEquals(plan.intoBody, ["error.log"]);
});

Deno.test("planConsolidation: a form with room takes files as-is", () => {
  const plan = planConsolidation(shots.slice(0, 2), { attachmentsAllowed: 2, acceptsPdfOnly: false, sizeLimitBytes: 2_000_000 });
  assertEquals(plan.attachFiles, ["screenshot-1.png", "screenshot-2.png"]);
  assertEquals(plan.dropped.length, 0);
});

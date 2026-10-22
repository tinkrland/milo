# pdf consolidation

status: partial

screenshots, logs, error messages, one attachment, under the size
limit. the plan is real; the renderer is a seam.

## what is built

`backend/src/services/evidence.ts` owns it:

- `planConsolidation(evidence, budgetBytes)`: takes everything the
  walk captured, keeps what matters, orders by size honesty (the
  biggest screenshots first when the budget is tight), and returns
  what rides and what stays home
- `pdfOnly(accept)`: when the form accepts only pdf, the plan says so
  and nothing else attaches
- `noRenderer()`: the honest default. the seam refuses to pretend a
  pdf was written. a real renderer slots in behind the same
  `PdfRenderer` interface and nothing else changes

pinned in `evidence_test.ts`.

## what is not

the renderer itself. consolidation plans the pdf; nothing yet puts
pixels into one. when a renderer lands it must fail closed the same
way the seam does.

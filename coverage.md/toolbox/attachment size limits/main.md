# attachment size limits

status: working

one file maximum? understood. milo merges, compresses, and attaches
exactly what they asked for.

## what is built

`backend/src/services/evidence.ts`:

- `attachmentsAllowedFrom(acceptMultiple, fileInputCount)`: reads the
  form's own rules off the page and answers how many may ride
- `planConsolidation` budgets against the byte limit and never
  attaches more than allowed

`backend/src/services/support_sites.ts` `readConstraints` reads the
constraints live during the walk, so the limits come from the page,
not a guess. pinned in `evidence_test.ts` and
`portal_followup_test.ts`.

## character limits too

`missions.ts` `compressToLimit(text, limit)` compresses to any
character count at sentence boundaries, and `composeIssueMessage`
defaults to 500. he can count.

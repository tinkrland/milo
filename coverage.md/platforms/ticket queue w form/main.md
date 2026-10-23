# ticket queue w form

status: working

dropdowns nobody has ever read, required fields with no hint text,
captcha, the queue behind it. milo walks the site, reads the form's
own rules, fills it, and then watches the queue.

## what is built

- `support_discovery.ts`: finding where tf the support thing is.
  every link on the page read and ranked, the common doors probed
  by name (/support, help.example.com, the zendesk shape) when the
  page names none, and every landing verdicted so a marketing page
  is never mistaken for a door. pinned in `support_discovery_test.ts`
- `support_sites.ts`: `fillTicketForm` (identity once, evidence attached, constraints
  read live via `readConstraints`, one submit click),
  `submitForm`
- `portal_followup.ts`: the zendesk-style leg. `classifyTicketStatus`
  reads the status chip (pending, solved, closed, open);
  `shouldReplyInTicket` answers the quiet-open case only;
  `followUpPortal` walks back to `ticket_url` each pass
- the bounce: a dead-end form naming another door moves the mission
  there, it does not park

pinned in `portal_followup_test.ts` and `mission_manager_test.ts`.
boss gates ride everything: refunds, payments, account changes go
back to the boss.

// the support walks (milo, oct 22 2026): same issue, same context,
// same little guy, new window.
//
// the walks are deliberately generic: no integration, no cooperation
// from the company. milo looks for the shapes every support site uses:
// the "contact us" link, the chat widget in the corner, the form with
// the character limit, the email address buried in the footer. each
// walk reports what it found, honestly: a site he cannot navigate is
// reported, never forced.

import {
  navigateTo,
  readPageText,
  findLinkByText,
  findAndClick,
  findAndType,
  elementExists,
  readFormFields,
  readFileInput,
} from "./browserbase.ts";
import { assertLinkSafe } from "./link_safety.ts";
import { composeIssueMessage, parseBrief, type Brief } from "./missions.ts";
import { pdfOnly, attachmentsAllowedFrom, type ConstraintReport } from "./evidence.ts";

export interface WalkOutcome {
  walk: "support_page" | "chat_widget" | "ticket_form" | "footer_email" | "dead_end";
  found: boolean;
  detail: string;
  url?: string;
  constraints?: ConstraintReport;
}

// step 1 of any browser mission: find the support page. the home page
// is walked first (consent rides), then the common support doors are
// tried in order of how companies actually name them.
const SUPPORT_LINK_PATTERNS = [
  "contact us", "contact support", "support", "help center", "help",
  "get help", "submit a ticket", "contact",
];

export async function findSupportPage(sessionId: string, homeUrl: string): Promise<WalkOutcome> {
  const verdict = await assertLinkSafe(homeUrl);
  if (!verdict.safe) {
    return { walk: "support_page", found: false, detail: `blocked by safety gate: ${verdict.reason}` };
  }
  await navigateTo(sessionId, homeUrl);
  for (const pattern of SUPPORT_LINK_PATTERNS) {
    const href = await findLinkByText(sessionId, [pattern], 3000);
    if (href) {
      const gate = await assertLinkSafe(href);
      if (!gate.safe) continue; // a poisoned support link is skipped, reported
      await navigateTo(sessionId, href);
      return { walk: "support_page", found: true, detail: `support page via "${pattern}"`, url: href };
    }
  }
  // the footer read: the email address buried in the footer is a real
  // channel, and so is a dead end.
  const text = await readPageText(sessionId);
  const mail = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (mail) {
    return { walk: "footer_email", found: true, detail: `support address found on page: ${mail[0]}`, url: `mailto:${mail[0]}` };
  }
  return { walk: "dead_end", found: false, detail: "no support door found on the home page" };
}

// the chat widget shapes, common first. he opens it, waits in the
// queue, and explains the problem once.
const CHAT_WIDGET_SELECTORS = [
  // intercom
  '[aria-label="Open chat"], .intercom-launcher, iframe[title*="intercom" i]',
  // crisp
  '#crisp-chatbox, .crisp-client',
  // zendesk
  'iframe[title*="messaging" i], [data-testid="chat-widget-button"], .zendesk-chat, #launcher',
  // tawk
  '#tawk-chat-container, .tawk-button, iframe[title*="tawk" i]',
  // drift, hubspot, generic
  '.drift-open-chat, #hubspot-messages-iframe, [class*="chat-bubble" i], [class*="chat-widget" i], button[aria-label*="chat" i]',
];

export async function openChatWidget(sessionId: string): Promise<WalkOutcome> {
  for (const sel of CHAT_WIDGET_SELECTORS) {
    if (await elementExists(sessionId, sel, 2000)) {
      const clicked = await findAndClick(sessionId, sel, 4000);
      if (clicked) {
        return { walk: "chat_widget", found: true, detail: `chat widget opened (${sel})` };
      }
    }
  }
  return { walk: "chat_widget", found: false, detail: "no chat widget on the page" };
}

// the ticket form walk: read the form first, fill it honestly, submit
// once. the character limit is honored at a sentence boundary, the
// attachment constraints are read from the page, and what the form
// refuses is reported on the mission, never forced.
export interface FormWalkResult {
  outcome: WalkOutcome;
  messageSent: string | null;
}

export async function fillTicketForm(
  sessionId: string,
  brief: Brief,
  identity: string,
): Promise<FormWalkResult> {
  const fields = await readFormFields(sessionId);
  if (!fields.length) {
    return {
      outcome: { walk: "ticket_form", found: false, detail: "no form fields on the page" },
      messageSent: null,
    };
  }

  const constraints = await readConstraints(sessionId);

  // the message field: a textarea, or an input named like one. its
  // own maxlength (when set) is the law; the fallback is the classic 500.
  const messageField = fields.find((f) => f.type === "textarea") ||
    fields.find((f) => /message|description|issue|details|body/i.test(f.name));
  const limit = messageField?.maxLength ?? 500;
  const message = composeIssueMessage(brief, limit);

  // the name field: he is who he says he is (MILO_IDENTITY, default
  // milo), never the boss. a form that demands the boss's own name is
  // a boss decision, not a guess.
  const nameField = fields.find((f) => /name|full ?name/i.test(f.name) && f.type !== "hidden");
  if (nameField) {
    await findAndType(sessionId, nameField.selector, identity, 5000);
  }

  if (messageField) {
    const ok = await findAndType(sessionId, messageField.selector, message, 8000);
    if (!ok) {
      return {
        outcome: { walk: "ticket_form", found: false, detail: "could not type into the message field" },
        messageSent: null,
      };
    }
  }

  return {
    outcome: {
      walk: "ticket_form",
      found: true,
      detail: `form read (${fields.length} fields), message ${message.length}/${limit} characters`,
      constraints,
    },
    messageSent: message,
  };
}

export async function readConstraints(sessionId: string): Promise<ConstraintReport> {
  const fileInput = await readFileInput(sessionId);
  const multiple = fileInput
    ? await elementExists(
      sessionId,
      fileInput.selector.replace(/[#[]/, (c) => `\\${c}`) + ", input[type='file'][multiple]",
      1500,
    ).catch(() => false)
    : false;
  return {
    attachmentsAllowed: attachmentsAllowedFrom(!!multiple, fileInput ? 1 : 0),
    acceptsPdfOnly: pdfOnly(fileInput?.accept ?? null),
    sizeLimitBytes: 2 * 1024 * 1024, // the portal classic, a working default
  };
}

export async function submitForm(sessionId: string): Promise<boolean> {
  const submitted = await findAndClick(
    sessionId,
    'button[type="submit"], input[type="submit"], button:not([type])',
    8000,
  );
  return submitted;
}

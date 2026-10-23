// finding where tf the support thing is (milo, oct 23 2026).
//
// anne's field report: most of the time the real issue is not the
// widget or the form, it is that the door is hidden. the footer says
// "resources", the help center lives on another domain, the widget
// only loads after three seconds, the contact form is under "about".
//
// this module is the finder: it reads every link on the page, ranks
// the support-shaped ones, tries the common paths by name when the
// page names nothing, and verdicts whatever it lands on so a 404 or
// a marketing page is never mistaken for a support door.
//
// pure halves (ranked, suggested, verdict) are pinned in
// support_discovery_test.ts. the walking half rides the same
// browserbase seam every walk rides.

import { navigateTo, readPageText, readAllLinks, type PageLink } from "./browserbase.ts";
import { assertLinkSafe } from "./link_safety.ts";

// ---------------------------------------------------------------------------
// the ranking: given every link on the page, which ones are support doors?
// ---------------------------------------------------------------------------

// the words companies actually use, weighted: "support" beats
// "contact", because a contact page is often marketing with a form
// attached, while "support" or "help center" is where the humans live.
const LINK_TEXT_WEIGHTS: [RegExp, number][] = [
  [/help ?center|knowledge ?base|support ?center/i, 5],
  [/support/i, 5],
  [/submit (a|an) (request|ticket|issue)|open (a|an) (request|ticket|issue)/i, 5],
  [/get help|need help|talk to us|chat with us|contact support/i, 4],
  [/help( me)?\b/i, 3],
  [/contact( us| support| our team)?\b/i, 2],
  [/faq|how -?to s|guides|docs\b|documentation/i, 1],
];

// and the href itself says something: /support is the classic,
// /hc/ is the zendesk/intercom shape, help.example.com is a whole
// door domain.
const LINK_HREF_WEIGHTS: [RegExp, number][] = [
  [/\/\/(help|support)\./i, 5],
  [/\/help(-?center|center)?\//i, 3],
  [/\/support|\/hc\/|\/help-center|\/tickets?|\/requests?|\/submit-a-request/i, 4],
  [/\/contact/i, 2],
];

export interface RankedLink {
  link: PageLink;
  score: number;
}

export function rankSupportLinks(links: PageLink[]): RankedLink[] {
  const seen = new Set<string>();
  const out: RankedLink[] = [];
  for (const link of links) {
    if (!link.href || !/^https?:/i.test(link.href)) continue; // anchors and mailtos rank separately
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    let score = 0;
    for (const [re, w] of LINK_TEXT_WEIGHTS) if (re.test(link.text)) score += w;
    for (const [re, w] of LINK_HREF_WEIGHTS) if (re.test(link.href)) score += w;
    if (score > 0) out.push({ link, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ---------------------------------------------------------------------------
// the probe list: when the page names nothing, the common doors by name
// ---------------------------------------------------------------------------

export function suggestSupportUrls(homeUrl: string): string[] {
  let origin: string;
  try {
    origin = new URL(homeUrl).origin;
  } catch {
    return [];
  }
  const host = new URL(homeUrl).hostname;
  const [bare, ...rest] = host.split(".");
  const parent = rest.length > 1 ? rest.join(".") : host;
  return [
    `${origin}/support`,
    `${origin}/help`,
    `${origin}/help-center`,
    `${origin}/contact`,
    `${origin}/contact-us`,
    `${origin}/docs`,
    `https://help.${parent}`,
    `https://support.${parent}`,
    // the zendesk/intercom classics, on their own subdomain shape
    `https://${bare}.zendesk.com/hc/en-us`,
  ].filter((u) => u !== origin);
}

// ---------------------------------------------------------------------------
// the verdict: whatever the finder lands on, is it actually a door?
// ---------------------------------------------------------------------------

export interface DoorVerdict {
  isSupportDoor: boolean;
  score: number;
  reasons: string[];
}

const DOOR_SIGNALS: [RegExp, number, string][] = [
  [/how can we help|how may we help|what can we help/i, 4, "asks how it can help"],
  [/submit (a|an) (request|ticket)|open (a|an) (request|ticket)|create (a|an) (request|ticket)/i, 4, "offers a ticket"],
  [/contact (our|the) (team|support)|talk to (a|an) (human|agent|person|specialist)|chat with (a|an|us)/i, 4, "offers a human"],
  [/knowledge ?base|help ?center|support ?center|search (our|the) (help|docs|articles)/i, 3, "is a help center"],
  [/faq|frequently asked/i, 2, "is an faq"],
  [/email (us|our team)|@[\w-]+\.[\w.]+/i, 2, "shows an address"],
  [/status page|system status/i, 1, "shows status"],
];

export function doorVerdict(pageText: string): DoorVerdict {
  const reasons: string[] = [];
  let score = 0;
  for (const [re, w, why] of DOOR_SIGNALS) {
    if (re.test(pageText)) {
      score += w;
      reasons.push(why);
    }
  }
  return { isSupportDoor: score >= 3, score, reasons };
}

// ---------------------------------------------------------------------------
// the walk: rank, click, probe, verdict
// ---------------------------------------------------------------------------

export interface SupportDoor {
  found: boolean;
  detail: string;
  url?: string;
  door: "support_page" | "footer_email" | "none";
  verdict?: DoorVerdict;
  // the support page's own text: their stated hours and days ride on
  // it, and the follow-up calendar reads it before any guessing.
  pageText?: string;
}

export async function findSupportDoor(
  sessionId: string,
  homeUrl: string,
): Promise<SupportDoor> {
  const verdict = await assertLinkSafe(homeUrl);
  if (!verdict.safe) {
    return { found: false, detail: `blocked by safety gate: ${verdict.reason}`, door: "none" };
  }
  await navigateTo(sessionId, homeUrl);

  // pass 1: the page's own links, ranked. the footer is usually where
  // the door hides, and this reads the footer with everything else.
  const links = await readAllLinks(sessionId);
  for (const ranked of rankSupportLinks(links).slice(0, 4)) {
    const gate = await assertLinkSafe(ranked.link.href);
    if (!gate.safe) continue; // a poisoned link is skipped, reported
    await navigateTo(sessionId, ranked.link.href);
    const page = await readPageText(sessionId);
    const v = doorVerdict(page);
    if (v.isSupportDoor) {
      return {
        found: true,
        detail: `support door via "${ranked.link.text}" (${v.reasons.join(", ")})`,
        url: ranked.link.href,
        door: "support_page",
        verdict: v,
        pageText: page,
      };
    }
  }

  // pass 2: the common doors by name. a page that names nothing still
  // usually has /support or help.example.com behind it.
  for (const candidate of suggestSupportUrls(homeUrl)) {
    const gate = await assertLinkSafe(candidate);
    if (!gate.safe) continue;
    const ok = await navigateTo(sessionId, candidate).then(() => true).catch(() => false);
    if (!ok) continue;
    const page = await readPageText(sessionId);
    if (!page || page.length < 40) continue; // a blank probe is a dead probe
    const v = doorVerdict(page);
    if (v.isSupportDoor) {
      return {
        found: true,
        detail: `support door at ${candidate} (${v.reasons.join(", ")})`,
        url: candidate,
        door: "support_page",
        verdict: v,
        pageText: page,
      };
    }
  }

  // pass 3: back where he started, the footer email is a real channel.
  await navigateTo(sessionId, homeUrl);
  const text = await readPageText(sessionId);
  const mail = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (mail) {
    return {
      found: true,
      detail: `support address found on page: ${mail[0]}`,
      url: `mailto:${mail[0]}`,
      door: "footer_email",
    };
  }
  return { found: false, detail: "no support door found: the page names none and the probes came back empty", door: "none" };
}

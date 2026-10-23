// browserbase service: the walk engine (milo, oct 22 2026).
//
// milo doesn't need the company to build a milo integration: he uses
// the website the way the boss would. this is the same engine prixie
// uses to join meetings, minus the join flows, plus the support-system
// primitives: finding the support page, opening the chat widget,
// reading a form before filling it.
//
// house rules carried over from prixie:
//   - the consent policy rides every navigation: a banner he sees
//     anywhere is a banner he declines. one bounded walk per page
//     load, never throws.
//   - selectors and text are JSON.stringify'd into cdp expressions:
//     untrusted string data must never become live javascript.
//   - reads happen through the page text, not assumptions: what the
//     page SHOWS is the evidence, what it merely owns is not.

const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY")!;
const BROWSERBASE_BASE = "https://api.browserbase.com/v1";

export interface BrowserbaseSession {
  id: string;
  status: string;
  createdAt: string;
}

// the outcome of a walk step. milo reports what happened, never
// embellishes: "not found" is a finding, not a failure of nerve.
export interface WalkResult {
  session_id: string;
  status: "done" | "not_found" | "failed";
  detail?: string;
}

// ---------------------------------------------------------------------------
// session management
// ---------------------------------------------------------------------------

export async function createSession(options?: {
  projectId?: string;
  keepalive?: boolean;
}): Promise<BrowserbaseSession> {
  const res = await fetch(`${BROWSERBASE_BASE}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BROWSERBASE_API_KEY}`,
    },
    body: JSON.stringify({
      projectId: options?.projectId || Deno.env.get("BROWSERBASE_PROJECT_ID") || undefined,
      keepalive: options?.keepalive ?? true,
      browserSettings: {
        viewport: { width: 1280, height: 800 },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`browserbase session creation failed: ${err}`);
  }

  return res.json();
}

// every navigation milo makes: gated, walked, and honest. the caller
// owns the safety verdict (link_safety), the walk owns the consent.
export async function navigateTo(sessionId: string, url: string): Promise<void> {
  const res = await fetch(`${BROWSERBASE_BASE}/sessions/${sessionId}/navigate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BROWSERBASE_API_KEY}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw new Error(`navigation failed: ${res.statusText}`);
  }

  // the consent policy rides every navigation: a banner he sees
  // anywhere is a banner he declines. one bounded walk per page load,
  // never throws: a page with no banner pays one quiet read.
  try {
    await dismissConsentBanners(sessionId);
  } catch {
    // a consent walk that fails changed nothing: nothing was agreed to
  }
}

import { dismissConsentBanners } from "./consent.ts";

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BROWSERBASE_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${BROWSERBASE_API_KEY}` },
  });
}

// ---------------------------------------------------------------------------
// CDP primitives (unchanged from prixie: these are battle-tested)
// ---------------------------------------------------------------------------

export async function cdpExecute(sessionId: string, method: string, params: any): Promise<any> {
  const res = await fetch(`${BROWSERBASE_BASE}/sessions/${sessionId}/cdp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BROWSERBASE_API_KEY}`,
    },
    body: JSON.stringify({ method, params }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`cdp ${method} failed:`, err);
    return null;
  }

  return res.json();
}

export async function readPageText(sessionId: string): Promise<string> {
  const result = await cdpExecute(sessionId, "Runtime.evaluate", {
    expression: "document.body?.innerText || ''",
    returnByValue: true,
  });
  return result?.result?.value || "";
}

export async function takeScreenshot(sessionId: string): Promise<string> {
  const res = await fetch(`${BROWSERBASE_BASE}/sessions/${sessionId}/screenshot`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${BROWSERBASE_API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`screenshot failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.screenshotId || data.url || "";
}

export async function findAndClick(
  sessionId: string,
  selector: string,
  timeoutMs = 10000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // the selector is JSON.stringify'd: untrusted string data must
    // never become live javascript. the "clicked" sentinel keeps the
    // result honest.
    const result = await cdpExecute(sessionId, "Runtime.evaluate", {
      expression: `const el = document.querySelector(${JSON.stringify(selector)}); if (el) { el.click(); 'clicked'; } else { 'not found'; }`,
      returnByValue: true,
    });
    if (result?.result?.value === "clicked") return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function findAndType(
  sessionId: string,
  selector: string,
  text: string,
  timeoutMs = 10000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await cdpExecute(sessionId, "Runtime.evaluate", {
      expression: `
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.value = ${JSON.stringify(text)};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          'typed';
        } else {
          'not found';
        }
      `,
      returnByValue: true,
    });
    if (result?.result?.value === "typed") return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// a probe, not a promise: does this selector exist? the no-cc gate and
// the one-attachment check both ask this before acting.
export async function elementExists(
  sessionId: string,
  selector: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await cdpExecute(sessionId, "Runtime.evaluate", {
      expression: `document.querySelector(${JSON.stringify(selector)}) !== null`,
      returnByValue: true,
    });
    if (result?.result?.value === true) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ---------------------------------------------------------------------------
// support-system primitives (milo's own additions to the family toolbox)
// ---------------------------------------------------------------------------

// find a link by visible text or aria-label, across the common shapes.
// pure CDP: one read, one click. returns the href found so the caller
// can route it through the safety gate before navigating.
export async function findLinkByText(
  sessionId: string,
  patterns: string[],
  timeoutMs = 8000,
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await cdpExecute(sessionId, "Runtime.evaluate", {
      expression: `
        (() => {
          const wanted = ${JSON.stringify(patterns.map((p) => p.toLowerCase()))};
          const links = Array.from(document.querySelectorAll('a, button, [role="link"]'));
          for (const a of links) {
            const label = ((a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '')).trim().toLowerCase();
            if (!label || label.length > 60) continue;
            if (wanted.some((w) => label.includes(w))) {
              return a.href || a.getAttribute('href') || 'found-no-href';
            }
          }
          return '';
        })()
      `,
      returnByValue: true,
    });
    const href = result?.result?.value;
    if (href) return href === "found-no-href" ? null : href;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

// read every form field the page shows: names, types, and the
// maxlength the page enforces. milo reads the form BEFORE filling it:
// "500 characters? okay. pdf only? okay" starts with knowing.
export interface FormFieldInfo {
  selector: string;
  type: string;
  name: string;
  maxLength: number | null;
  required: boolean;
}

export async function readFormFields(sessionId: string): Promise<FormFieldInfo[]> {
  const result = await cdpExecute(sessionId, "Runtime.evaluate", {
    expression: `
      (() => {
        const out = [];
        for (const el of document.querySelectorAll('input, textarea, select')) {
          if (el.type === 'hidden') continue;
          let selector = el.tagName.toLowerCase();
          if (el.id) selector = '#' + el.id;
          else if (el.name) selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
          const ml = el.getAttribute('maxlength');
          out.push({
            selector,
            type: el.type || el.tagName.toLowerCase(),
            name: el.name || el.id || el.getAttribute('aria-label') || '',
            maxLength: ml === null ? null : parseInt(ml, 10) || null,
            required: el.required === true,
          });
        }
        return JSON.stringify(out);
      })()
    `,
    returnByValue: true,
  });
  try {
    return result?.result?.value ? JSON.parse(result.result.value) : [];
  } catch {
    return [];
  }
}

// the one-click file-input probe: does this form accept a file at all,
// and what does it accept? the "pdf only / one attachment maximum"
// handling needs this before evidence gets attached.
export async function readFileInput(
  sessionId: string,
): Promise<{ selector: string; accept: string | null } | null> {
  const result = await cdpExecute(sessionId, "Runtime.evaluate", {
    expression: `
      (() => {
        const el = document.querySelector('input[type="file"]');
        if (!el) return '';
        let selector = 'input[type="file"]';
        if (el.id) selector = '#' + el.id;
        else if (el.name) selector = 'input[type="file"][name="' + el.name + '"]';
        return JSON.stringify({ selector, accept: el.getAttribute('accept') });
      })()
    `,
    returnByValue: true,
  });
  try {
    return result?.result?.value ? JSON.parse(result.result.value) : null;
  } catch {
    return null;
  }
}

// the session's current url: where the walk stands. a portal submit
// lands on the ticket page, and that url is the case home.

// read every link the page shows: text plus href. the support door is
// usually hiding in the footer behind a word like "support", and the
// finder needs the whole menu to rank, not one pattern at a time.
export interface PageLink {
  text: string;
  href: string;
}

export async function readAllLinks(sessionId: string): Promise<PageLink[]> {
  const result = await cdpExecute(sessionId, "Runtime.evaluate", {
    expression: `
      (() => {
        const out = [];
        for (const a of document.querySelectorAll('a[href]')) {
          const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
          if (!text || text.length > 80) continue;
          out.push({ text, href: a.href });
        }
        return JSON.stringify(out);
      })()
    `,
    returnByValue: true,
  });
  try {
    return result?.result?.value ? JSON.parse(result.result.value) : [];
  } catch {
    return [];
  }
}

export async function readSessionUrl(sessionId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
      headers: { "x-bb-api-key": Deno.env.get("BROWSERBASE_API_KEY")! },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.status?.page_url ?? data?.page_url ?? null;
  } catch {
    return null;
  }
}

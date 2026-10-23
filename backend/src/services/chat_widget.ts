// the chat widget queue, wired (milo, oct 23 2026).
//
// the coax engine was always pure: explain once, insist politely
// through form letters, demand a human at closure, hand the whole
// story to whoever joins. what was missing was the wire: sending a
// line into the widget and reading the replies back out of it.
//
// the transport is an interface on purpose: the cdp half rides the
// browserbase seam, and the loop takes anything that can send and
// poll, so the tests drive it with a fake and the rules stay pinned
// without a live site in the room.
//
// built, pinned by fake-driven tests, never yet run against a live
// widget: that is the honest status, and it is the same status
// prixie's flowing forms carried until her first live fill.

import { cdpExecute, findAndType, elementExists } from "./browserbase.ts";
import { nextCoaxTurn, freshCoax, findChannelPointer, type CoaxState, type BouncePointer } from "./coax.ts";

// ---------------------------------------------------------------------------
// the transport interface
// ---------------------------------------------------------------------------

export interface WidgetTransport {
  // type a line into the widget and send it. true when the page took it.
  send(text: string): Promise<boolean>;
  // every message the widget shows right now, oldest first.
  poll(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// the cdp half: the real widget
// ---------------------------------------------------------------------------

// the message containers the vendors use. intercom, zendesk, crisp,
// tawk, liveperson, and the generic shapes (role="log", aria-live).
const WIDGET_MESSAGE_SELECTORS = [
  '[aria-label*="messages" i] [role="listitem"], [class*="intercom"] [class*="message"]',
  'iframe[title*="messaging" i]',
  '[class*="crisp"] [class*="message"], [class*="tawk"] [class*="message"]',
  '[role="log"], [aria-live] [class*="message"], [class*="chat-message"], [class*="message-content"]',
];

// the input shapes: the box he types into.
const WIDGET_INPUT_SELECTORS = [
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="type" i]',
  'textarea[class*="chat" i], textarea[id*="chat" i]',
  '[contenteditable="true"][class*="chat" i], [contenteditable="true"][aria-label*="message" i]',
  'input[placeholder*="message" i], input[class*="chat" i]',
];

export async function pollWidgetMessages(sessionId: string): Promise<string[]> {
  const result = await cdpExecute(sessionId, "Runtime.evaluate", {
    expression: `
      (() => {
        const seen = new Set();
        const out = [];
        for (const sel of ${JSON.stringify(WIDGET_MESSAGE_SELECTORS)}) {
          for (const el of document.querySelectorAll(sel)) {
            const text = (el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (!text || text.length > 1000 || seen.has(text)) continue;
            seen.add(text);
            out.push(text);
          }
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

export async function sendWidgetMessage(sessionId: string, text: string): Promise<boolean> {
  for (const sel of WIDGET_INPUT_SELECTORS) {
    if (await elementExists(sessionId, sel, 1500)) {
      const typed = await findAndType(sessionId, sel, text, 6000);
      if (!typed) continue;
      // enter sends in every widget shape: keydown + keyup, charCode 13
      for (const type of ["keyDown", "keyUp"]) {
        await cdpExecute(sessionId, "Input.dispatchKeyEvent", {
          type,
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
        }).catch(() => {});
      }
      return true;
    }
  }
  return false;
}

export function cdpWidgetTransport(sessionId: string): WidgetTransport {
  return {
    send: (text) => sendWidgetMessage(sessionId, text),
    poll: () => pollWidgetMessages(sessionId),
  };
}

// ---------------------------------------------------------------------------
// the pure halves
// ---------------------------------------------------------------------------

// messages he has not answered yet: whatever arrived after the last
// one he saw. the widget list is append-only, so position is the
// truth and the seen prefix is verified elementwise; the repeated
// form letter is a copy, not a message he already read. the text
// fallback only rides when a widget reorders its list.
export function unseenMessages(seen: string[], all: string[]): string[] {
  const prefix = Math.min(seen.length, all.length);
  const prefixHolds = seen.slice(0, prefix).every((m, i) => all[i] === m);
  if (prefixHolds && all.length > seen.length) return all.slice(prefix);
  const known = new Set(seen);
  const index = Math.max(...all.map((m, i) => (known.has(m) ? i : -1)), -1);
  return all.slice(index + 1);
}

// ---------------------------------------------------------------------------
// the loop: coax over a wire
// ---------------------------------------------------------------------------

export interface CoaxRun {
  outcome: "answered" | "human" | "bounce" | "closed" | "silence";
  detail: string;
  pointer: BouncePointer | null;
  turns: number;
  log: string[];
}

export const COAX_TURN_WAIT_MS = 45_000; // a bot answers fast; a human queue is not his deadline
export const COAX_MAX_TURNS = 10;

export async function runCoaxInWidget(
  transport: WidgetTransport,
  input: { problem: string; attempts: string[] },
  opts: { turnWaitMs?: number; pollEveryMs?: number; maxTurns?: number; startState?: CoaxState; seen?: string[] } = {},
): Promise<CoaxRun> {
  const turnWaitMs = opts.turnWaitMs ?? COAX_TURN_WAIT_MS;
  const pollEveryMs = opts.pollEveryMs ?? 3000;
  const maxTurns = opts.maxTurns ?? COAX_MAX_TURNS;

  let state: CoaxState = opts.startState ?? freshCoax();
  const log: string[] = [];

  // the baseline: whatever the widget already shows (the bot's
  // greeting, the queue message) is not a reply to milo.
  let seen: string[] = opts.seen ?? (await transport.poll());
  let pending: string[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const incoming = pending.join("\n");
    pending = [];

    const { action, state: next } = nextCoaxTurn(state, input.problem, input.attempts, incoming);
    state = next;

    if (action.kind === "explain" || action.kind === "insist" || action.kind === "demand_human" || action.kind === "handoff") {
      const sent = await transport.send(action.line);
      log.push(`sent (${action.kind}): ${sent ? "yes" : "no"}`);
      if (!sent) {
        return { outcome: "closed", detail: `the widget would not take the message at turn ${turn}`, pointer: null, turns: turn + 1, log };
      }
      if (action.kind === "handoff") {
        return { outcome: "human", detail: `a human joined; the whole story was handed off after ${turn + 1} turns`, pointer: null, turns: turn + 1, log };
      }
    } else if (action.kind === "bounce") {
      const pointer = action.pointer;
      return { outcome: "bounce", detail: `the widget walls and names another door: ${pointer?.note ?? "no pointer"}`, pointer, turns: turn + 1, log };
    } else if (action.kind === "done") {
      return { outcome: "answered", detail: `the conversation ended after ${turn + 1} turns: a relevant answer, or the wall said all it will say`, pointer: null, turns: turn + 1, log };
    }
    // watch: wait for the reply within the turn budget
    const deadline = Date.now() + turnWaitMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollEveryMs));
      const latest = await transport.poll();
      const fresh = unseenMessages(seen, latest);
      if (fresh.length) {
        pending = fresh;
        seen = latest;
        break;
      }
    }
  }
  return { outcome: "silence", detail: `the widget went quiet for ${maxTurns} turns; parked, not forced`, pointer: null, turns: maxTurns, log };
}

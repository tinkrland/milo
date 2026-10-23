// being sent around in circles, detected instead of endured. milo
// keeps score on what he has already been told: the same template
// answered three times is not three answers, a door that bounces him
// back to the door he came from is a loop, and a follow-up cadence
// that ignores it is just pestering with extra steps. this module
// reads the history and says what is happening, plainly.

export interface HistoryEvent {
  direction: "out" | "in";
  // the channel the message rode: portal, forum, discord, slack,
  // email, phone
  channel: string;
  body: string;
  at?: string;
}

export interface DoorVisit {
  channel: string;
  target: string;
}

export interface CircleVerdict {
  circling: boolean;
  signals: string[];
  recommendation: "keep_going" | "escalate" | "change_channel" | "park";
  line: string;
}

// the template behind the form letter: a reply is the same template
// when its slots (ticket ids, dates, names, links) are normalized
// away and what remains matches. "your request #41112 was received"
// and "your request #87350 was received" are one template.
export function templateFingerprint(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "@")
    .replace(/https?:\/\/\S+/g, "url")
    .replace(/\b\d[\w-]*\b/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

const CLOSURE_WORDS =
  /(marked|resolved|solved|closed|received|escalated|forwarded|looking into|right away|as soon as possible|appreciate your patience)/i;

// a substantive reply: names a fact, a time, a person, or a fix. the
// form letter names none.
function isSubstantive(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (/\b(\d+\s*(?:business\s+)?days?|within \w+|on|by)\b.{0,40}\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|tomorrow)\b/i.test(text)) return true;
  if (CLOSURE_WORDS.test(text) && text.length < 220) return false;
  if (/\b(fixed|deployed|resolved in|the fix|engineering (?:has|have)|our team (?:has|have) (?:identified|reproduced|shipped))\b/i.test(text)) return true;
  return text.length > 260 && !CLOSURE_WORDS.test(text);
}

export function detectCircling(
  events: HistoryEvent[],
  visits: DoorVisit[] = [],
): CircleVerdict {
  const inbound = events.filter((e) => e.direction === "in");
  const signals: string[] = [];

  // 1. the same template, three or more times: the wall has decided
  // what it will say and is saying it on repeat.
  const counts = new Map<string, number>();
  for (const e of inbound) {
    const fp = templateFingerprint(e.body);
    if (!fp || !CLOSURE_WORDS.test(e.body)) continue;
    counts.set(fp, (counts.get(fp) ?? 0) + 1);
  }
  const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worst && worst[1] >= 3) {
    signals.push(`the same form letter answered ${worst[1]} times`);
  }

  // 2. door ping-pong: he was sent from a channel to another channel
  // and back. the bounce chain is the circle.
  const channelSwitches: DoorVisit[] = [];
  for (const e of events) {
    const told = e.direction === "in" ? e.body : "";
    const m = told.match(/\b(email|contact|portal|ticket|forum|discord|slack|chat|call|phone|open (?:a )?(?:ticket|case))\b[^.]{0,60}/i);
    if (!m) continue;
    const named = m[1].toLowerCase();
    const to: DoorVisit | null =
      /email|contact/i.test(named) ? { channel: "email", target: "" } :
      /portal|ticket|case/i.test(named) ? { channel: "portal", target: "" } :
      /forum/i.test(named) ? { channel: "forum", target: "" } :
      /discord/i.test(named) ? { channel: "discord", target: "" } :
      /slack/i.test(named) ? { channel: "slack", target: "" } :
      /chat/i.test(named) ? { channel: "chat", target: "" } :
      /call|phone/i.test(named) ? { channel: "phone", target: "" } :
      null;
    if (to) channelSwitches.push(to);
  }
  const seen = new Set<string>();
  for (const v of channelSwitches) {
    if (seen.has(v.channel)) {
      signals.push(`bounced to ${v.channel} twice: he has been there`);
      break;
    }
    seen.add(v.channel);
  }

  // 3. a named door he already visited, named again.
  const visited = new Set(visits.map((v) => `${v.channel}:${v.target}`.toLowerCase()));
  for (const e of events) {
    if (e.direction !== "in") continue;
    const emails = e.body.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    for (const mail of emails) {
      if (visited.has(`email:${mail.toLowerCase()}`)) {
        signals.push(`told to email ${mail}, which he already did`);
        break;
      }
    }
    if (signals.some((s) => s.startsWith("told to email"))) break;
  }

  // 4. silence with repeats: every reply is the same template and
  // nothing substantive has EVER arrived.
  const substantive = inbound.some((e) => isSubstantive(e.body));
  if (!substantive && worst && worst[1] >= 3) {
    signals.push("nothing substantive has ever arrived, only templates");
  }

  const circling = signals.length > 0;
  let recommendation: CircleVerdict["recommendation"] = "keep_going";
  if (circling) {
    const bouncedTwice = signals.some((s) => s.startsWith("bounced to"));
    const emailedAlready = signals.some((s) => s.startsWith("told to email"));
    if (bouncedTwice || emailedAlready) recommendation = "escalate";
    else if (signals.includes("nothing substantive has ever arrived, only templates")) recommendation = "escalate";
    else recommendation = "change_channel";
  }

  const line = circling
    ? `he has been sent around in circles: ${signals.join("; ")}. this gets named plainly, not endured politely`
    : "no circles detected: keep at it, politely";

  return { circling, signals, recommendation, line };
}

// the line milo sends when the circle is named: calm, specific, never
// rude, never dramatic, and it restates the problem because the
// whole point of salience is that the next human who reads it is new
// to the case.
export function circleEscalationLine(problem: string, signals: string[]): string {
  const salient = (problem || "").split(/[.!?]/)[0].trim() || "the original problem";
  const named = signals[0] ?? "the same answer again";
  return `to be plain: i am being sent around in circles here. i have now been told "${named}" more than once, by what appears to be the same template. the problem, restated: ${salient}. is there a person who owns this case?`;
}

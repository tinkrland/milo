// WHICH two days. the clock of the follow-up is not the calendar of
// the boss: the company's weekend is the company's business, the
// company's timezone is where their desks are, and a bump that lands
// at 4am their time is a bump nobody reads. this module owns the
// arithmetic so the rest of the engine never counts a saturday as a
// working day again.

export interface BusinessCalendar {
  // their days off, 0 = sunday .. 6 = saturday
  weekend: number[];
  // the iana zone their desks sit in, not milo's
  tz: string;
  // the local hours a human plausibly reads the queue. a bump is
  // aimed inside this window, not at its edges.
  workStart: number;
  workEnd: number;
  // where this calendar came from, in order of trust: the door's
  // own page beats a country table beats a guess.
  source: "stated" | "country" | "assumed";
  country?: string;
}

export const BOSS_TZ = "America/New_York";

// the country table, verified oct 23 2026 (reuters, al jazeera,
// wikipedia "workweek and weekend", ksacalc): the gulf runs
// sunday-thursday, iran and afghanistan rest thursday-friday, egypt
// and israel rest friday-saturday, nepal rests saturday only, and
// much of south asia and latin america takes a single day, sunday.
// the table is a fallback: a door that states its own hours is
// believed over any of this.
const COUNTRY_WEEKENDS: Record<string, number[]> = {
  sa: [5, 6], ae: [6, 0], qa: [5, 6], kw: [5, 6], bh: [5, 6],
  eg: [5, 6], dz: [5, 6], iq: [5, 6], om: [5, 6], jo: [5, 6],
  ir: [4, 5], af: [4, 5],
  il: [5, 6],
  np: [6],
  in: [0], mx: [0], ph: [0], co: [0],
};

export function defaultCalendar(tz: string = BOSS_TZ): BusinessCalendar {
  return { weekend: [6, 0], tz, workStart: 9, workEnd: 17, source: "assumed" };
}

export function calendarForCountry(country: string, tz?: string): BusinessCalendar {
  const code = country.trim().toLowerCase().slice(0, 2);
  const weekend = COUNTRY_WEEKENDS[code];
  if (!weekend) return { ...defaultCalendar(tz ?? BOSS_TZ), country: code };
  return {
    weekend: [...weekend],
    tz: tz ?? BOSS_TZ,
    workStart: 9,
    workEnd: 17,
    source: "country",
    country: code,
  };
}

// ---------------------------------------------------------------------------
// what the door itself said, read off the page. "hours: mon-fri 9-6
// gmt+8" beats every guess in the table above.
// ---------------------------------------------------------------------------

const NAMED_ZONES: Array<[RegExp, string]> = [
  [/\b(gmt|utc)\s*[+-]\s*(\d{1,2})(?::30)?\b/i, "fixed"],
  [/\b(aest|australian eastern)\b/i, "Australia/Sydney"],
  [/\b(pst|pt)\b/i, "America/Los_Angeles"],
  [/\b(est|et|eastern)\b/i, "America/New_York"],
  [/\b(cst|ct)\b/i, "America/Chicago"],
  [/\b(gmt|utc|bst)\b/i, "Europe/London"],
  [/\b(cet|mst|met)\b/i, "Europe/Berlin"],
  [/\b(ist|india standard)\b/i, "Asia/Kolkata"],
  [/\b(sgt|singapore)\b/i, "Asia/Singapore"],
  [/\b(jst|japan)\b/i, "Asia/Tokyo"],
  [/\b(hkt|hong kong)\b/i, "Asia/Hong_Kong"],
];

const DAY_WORDS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};

function fixedZone(offset: number): string {
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  return `Etc/GMT${offset <= 0 ? "" : "-"}${abs}`;
}

export function parseStatedHours(text: string): Partial<BusinessCalendar> | null {
  const t = text || "";
  const out: Partial<BusinessCalendar> = {};

  // the stated timezone
  const fixed = t.match(/\b(?:gmt|utc)\s*([+-])\s*(\d{1,2})\b/i);
  if (fixed) out.tz = fixedZone(Number(`${fixed[1]}${fixed[2]}`));
  for (const [re, zone] of NAMED_ZONES) {
    if (out.tz) break;
    if (re.test(t) && zone !== "fixed") out.tz = zone;
  }

  // the stated days: "mon-fri", "monday to friday", "closed fridays",
  // "we do not work sundays"
  const days = new Set<number>();
  const rangeRe = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:[a-z]*)?\s*(?:-|to|through|thru|until|–)\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:[a-z]*)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(t))) {
    const from = DAY_WORDS[m[1].toLowerCase()];
    const to = DAY_WORDS[m[2].toLowerCase()];
    let d = from;
    let guard = 8;
    while (guard--) { days.add(d); if (d === to) break; d = (d + 1) % 7; }
  }

  // open days and closed days are both stated, and they mean
  // opposite things: "mon-fri" names the working days (the weekend
  // is the complement), "closed fridays" names the days off.
  const closedDays = new Set<number>();
  for (const seg of t.matchAll(/(?:closed|we (?:do not|don'?t) work|we'?re off)[^.]{0,60}/gi)) {
    for (const dm of seg[0].matchAll(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:[a-z]*)?s?\b/gi)) {
      closedDays.add(DAY_WORDS[dm[1].toLowerCase()]);
    }
  }
  if (days.size > 0) {
    out.weekend = [0, 1, 2, 3, 4, 5, 6].filter((d) => !days.has(d) || closedDays.has(d));
    if (closedDays.size > 0 && days.size <= closedDays.size) out.weekend = [...closedDays];
  } else if (closedDays.size > 0) {
    out.weekend = [0, 1, 2, 3, 4, 5, 6].filter((d) => closedDays.has(d));
  }

  // the stated hours: "9-6", "9am to 5pm", "08:00-17:00"
  const hours = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:am|a\.m\.)?\s*(?:-|to|–)\s*(\d{1,2})(?::(\d{2}))?\s*(pm|p\.m\.)?\b/i);
  if (hours) {
    let start = Number(hours[1]);
    let end = Number(hours[3]);
    const pm = (hours[5] || "").includes("p");
    if (pm && end < 12) end += 12;
    if (/\bp\b|\bpm\b/.test(t) && end <= 12 && !pm) end += 12;
    if (start >= 1 && start <= 12 && end > start && end <= 24) {
      out.workStart = start;
      out.workEnd = end;
    }
  }

  if (!out.weekend && !out.tz && out.workStart === undefined) return null;
  return out;
}

// the calendar for a mission, from best evidence down: what the door
// page stated, then the country table, then the boss's own zone with
// the universal weekend, honestly labeled assumed.
export function detectBusinessCalendar(
  pageText: string | null | undefined,
  country?: string,
  tzHint?: string,
): BusinessCalendar {
  const base = country ? calendarForCountry(country, tzHint) : defaultCalendar(tzHint ?? BOSS_TZ);
  const stated = parseStatedHours(pageText || "");
  if (!stated) return base;
  return { ...base, ...stated, source: "stated" };
}

// ---------------------------------------------------------------------------
// the arithmetic
// ---------------------------------------------------------------------------

export function localParts(t: Date, cal: BusinessCalendar): { weekday: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: cal.tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(t);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const names: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: names[weekdayStr] ?? 0, hour: Number(hourStr) };
}

export function isWorkingMoment(t: Date, cal: BusinessCalendar): boolean {
  const { weekday, hour } = localParts(t, cal);
  return !cal.weekend.includes(weekday) && hour >= cal.workStart && hour < cal.workEnd;
}

function atLocalMorning(base: Date, daysAhead: number, cal: BusinessCalendar): Date {
  // walk forward day by day in their zone, skipping their days off,
  // then land at workStart local. implemented as a bounded scan so
  // no zone database arithmetic can hang the tick.
  let t = new Date(base);
  let moved = 0;
  let workdays = 0;
  while (workdays < daysAhead && moved < 400) {
    t = new Date(t.getTime() + 24 * 60 * 60 * 1000);
    moved++;
    const { weekday } = localParts(t, cal);
    if (!cal.weekend.includes(weekday)) workdays++;
  }
  // sit at their work start on that day: the bump is aimed at the
  // morning a human reads the queue, not at the hour of the last
  // contact
  const { hour } = localParts(t, cal);
  if (hour >= cal.workStart && hour < cal.workEnd) {
    t = new Date(t.getTime() - (hour - cal.workStart) * 60 * 60 * 1000);
  } else if (hour < cal.workStart) {
    t = new Date(t.getTime() + (cal.workStart - hour) * 60 * 60 * 1000);
  } else if (hour >= cal.workEnd) {
    t = new Date(t.getTime() + (24 - hour + cal.workStart) * 60 * 60 * 1000);
    let guard = 8;
    while (guard--) {
      const { weekday, hour: h } = localParts(t, cal);
      if (!cal.weekend.includes(weekday) && h >= cal.workStart) break;
      t = new Date(t.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  return t;
}

// the next moment their desks are open and a human reads the queue.
// if now is inside their window, now is returned as-is.
export function nextWorkingMoment(after: Date, cal: BusinessCalendar): Date {
  if (isWorkingMoment(after, cal)) return after;
  const { weekday, hour } = localParts(after, cal);
  if (!cal.weekend.includes(weekday) && hour < cal.workStart) {
    // later today works
    return new Date(after.getTime() + (cal.workStart - hour) * 60 * 60 * 1000);
  }
  return atLocalMorning(after, 1, cal);
}

// count their working days between two instants, the honest way:
// a day counts when their morning happened inside the span.
export function businessDaysBetween(from: Date, to: Date, cal: BusinessCalendar): number {
  if (to.getTime() <= from.getTime()) return 0;
  const zoneOffset = (t: Date) => {
    const p = localParts(t, cal);
    return t.getTime() - (p.hour * 60 * 60 * 1000) - 12 * 60 * 60 * 1000; // rough day bucket
  };
  let count = 0;
  let cursor = new Date(from);
  const end = new Date(to);
  while (cursor.getTime() < end.getTime()) {
    const { weekday } = localParts(cursor, cal);
    if (!cal.weekend.includes(weekday)) count++;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  // the first partial day only counts if their morning fell inside
  void zoneOffset;
  return Math.max(0, count - 1);
}

// the cadence, in THEIR business days, not calendar hours: same-day
// is hours, everything after is working days. a bump aimed at
// "+ 2 days" over their friday lands on their tuesday, never their
// saturday.
const FOLLOW_UP_BUSINESS_DAYS = [0, 1, 2, 5, 5];

export function followUpDueAt(lastContactAt: Date, count: number, cal: BusinessCalendar): Date {
  const idx = Math.min(count, FOLLOW_UP_BUSINESS_DAYS.length - 1);
  const days = FOLLOW_UP_BUSINESS_DAYS[idx];
  if (days === 0) {
    // same-day: a few hours, but still only inside their window
    const raw = new Date(lastContactAt.getTime() + 4 * 60 * 60 * 1000);
    return nextWorkingMoment(raw, cal);
  }
  return nextWorkingMoment(atLocalMorning(lastContactAt, days, cal), cal);
}

// never two bumps across the same stretch of days off: one bump per
// their working day, so a weekend gets at most one bump, aimed at
// the morning their desks reopen, not dropped twice into the void.
export function bumpsShareADay(a: Date, b: Date, cal: BusinessCalendar): boolean {
  const pa = localParts(a, cal);
  const pb = localParts(b, cal);
  const dayMs = 24 * 60 * 60 * 1000;
  const approx = (p: { weekday: number }) => p.weekday;
  return approx(pa) === approx(pb) && Math.abs(b.getTime() - a.getTime()) < dayMs * 2;
}

export function isFollowUpDueSmart(
  lastContactAt: Date,
  followUpCount: number,
  now: Date,
  cal: BusinessCalendar,
): boolean {
  const due = followUpDueAt(lastContactAt, followUpCount, cal);
  if (now.getTime() < due.getTime()) return false;
  // it is due; but it only fires when they are plausibly at a desk
  return isWorkingMoment(now, cal);
}

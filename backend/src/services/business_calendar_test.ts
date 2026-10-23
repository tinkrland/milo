// the calendar smarts, pinned. every test answers anne's original
// complaint: it will not bump again and again because "its been 2
// days" when it should know WHICH two days.

import { assertEquals } from "jsr:@std/assert";
import {
  parseStatedHours,
  calendarForCountry,
  detectBusinessCalendar,
  isWorkingMoment,
  isFollowUpDueSmart,
  followUpDueAt,
  localParts,
  bumpsShareADay,
  defaultCalendar,
} from "./business_calendar.ts";

// their own page, believed: stated hours and days beat every table.
Deno.test("stated hours read off the door page", () => {
  const stated = parseStatedHours("our support team is available mon-fri 9am-6pm gmt+8");
  assertEquals(new Set(stated?.weekend ?? []), new Set([6, 0]));
  assertEquals(stated?.tz, "Etc/GMT-8");
  assertEquals(stated?.workStart, 9);
  assertEquals(stated?.workEnd, 18);
});

Deno.test("a page that names its closed days names its weekend", () => {
  const stated = parseStatedHours("we are closed fridays and saturdays for the weekend");
  assertEquals(stated?.weekend, [5, 6]);
});

// the country table, verified oct 23 2026 (reuters, al jazeera,
// wikipedia): the gulf rests friday-saturday, iran and afghanistan
// thursday-friday, nepal saturday only.
Deno.test("the muslim-country work weeks", () => {
  assertEquals(calendarForCountry("SA").weekend, [5, 6]);
  assertEquals(calendarForCountry("IR").weekend, [4, 5]);
  assertEquals(calendarForCountry("AF").weekend, [4, 5]);
  assertEquals(calendarForCountry("EG").weekend, [5, 6]);
  assertEquals(calendarForCountry("NP").weekend, [6]);
  assertEquals(calendarForCountry("SA").source, "country");
});

Deno.test("no country named, no guess dressed as knowledge: the default is labeled assumed", () => {
  assertEquals(defaultCalendar().source, "assumed");
  assertEquals(defaultCalendar("America/New_York").weekend, [6, 0]);
});

// friday morning at the boss's place is friday night in singapore:
// their workday is over and nothing fires.
Deno.test("their clock, not ours: singapore is closed when we are at our desks", () => {
  const sg = { ...defaultCalendar("Asia/Singapore"), weekend: [6, 0] as number[] };
  // fri oct 23 2026, 10am in new york = 10pm in singapore
  const theirFridayNight = new Date("2026-10-23T14:00:00Z");
  assertEquals(isWorkingMoment(theirFridayNight, sg), false);
});

Deno.test("the follow-up lands in their working morning, not our convenience", () => {
  const sg = { ...defaultCalendar("Asia/Singapore"), weekend: [6, 0] as number[] };
  // wed oct 21, 11am singapore: a normal working moment
  const ok = new Date("2026-10-21T03:00:00Z");
  assertEquals(isWorkingMoment(ok, sg), true);
});

// WHICH two days: +2 business days from thursday is monday for a
// mon-fri company, never saturday.
Deno.test("two business days from thursday lands monday, not saturday", () => {
  const cal = defaultCalendar("America/New_York");
  const thursday = new Date("2026-10-22T14:00:00Z"); // thu oct 22, 10am edt
  const due = followUpDueAt(thursday, 2, cal);
  const p = localParts(due, cal);
  assertEquals(p.weekday, 1); // monday
  assertEquals(p.hour, 9); // their morning
});

// the friday-evening submit: no bump ever lands twice across one
// weekend, because bumps only exist inside working days.
Deno.test("no bump over the weekend: friday afternoon lands the next bump monday", () => {
  const cal = defaultCalendar("America/New_York");
  const friday = new Date("2026-10-23T19:00:00Z"); // fri oct 23, 3pm edt
  const due = followUpDueAt(friday, 1, cal);
  const p = localParts(due, cal);
  assertEquals(p.weekday, 1); // monday, their 9am
  const saturday = new Date("2026-10-24T13:00:00Z");
  assertEquals(isFollowUpDueSmart(friday, 1, saturday, cal), false);
});

// the saudi week: friday-saturday off means their sunday is the
// follow-up day, and the engine knows it.
Deno.test("the fri-sat weekend: sunday is a working day there", () => {
  const sa = calendarForCountry("SA", "Asia/Riyadh");
  const thursday = new Date("2026-10-22T11:00:00Z"); // thu 2pm riyadh
  const due = followUpDueAt(thursday, 1, sa);
  const p = localParts(due, sa);
  assertEquals(p.weekday, 0); // sunday, their morning
  assertEquals(p.hour, 9);
});

// iran: thursday-friday weekend, so the monday-est intuition is wrong
// twice over.
Deno.test("the thu-fri weekend: their saturday is a working day", () => {
  const ir = calendarForCountry("IR", "Asia/Tehran");
  const wednesday = new Date("2026-10-21T11:00:00Z"); // wed 2:30pm tehran
  const due = followUpDueAt(wednesday, 1, ir);
  const p = localParts(due, ir);
  // thursday and friday are off: +1 business day is saturday
  assertEquals(p.weekday, 6);
});

Deno.test("the same-working-day guard: two bumps never share a working day", () => {
  const cal = defaultCalendar("America/New_York");
  const mon9 = new Date("2026-10-26T13:00:00Z");
  const mon2 = new Date("2026-10-26T18:00:00Z");
  const tue9 = new Date("2026-10-27T13:00:00Z");
  assertEquals(bumpsShareADay(mon9, mon2, cal), true);
  assertEquals(bumpsShareADay(mon9, tue9, cal), false);
});

// the whole chain: a mission whose door stated its hours runs its
// clock on them, source honestly labeled.
Deno.test("detectBusinessCalendar prefers the page's own words", () => {
  const cal = detectBusinessCalendar("hours: sun-thu 9-5 gmt+4, closed fri-sat");
  assertEquals(cal.source, "stated");
  assertEquals(cal.weekend, [5, 6]);
  assertEquals(cal.tz, "Etc/GMT-4");
});

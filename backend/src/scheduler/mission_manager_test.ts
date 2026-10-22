// the dispatcher, pinned with an in-memory case file, a fake walker,
// and a fake mailbox: a full mission life, start to stand down, with
// no browser, no network, and no transport ever claimed loaded.

import { assertEquals } from "jsr:@std/assert";
import { executeMission, type MissionStore, type SiteWalker, type WalkReport } from "./mission_manager.ts";
import type { MissionRecord } from "../services/supabase.ts";

// the in-memory store: exactly the seam, nothing more.
function fakeStore(): { store: MissionStore; missions: Map<string, MissionRecord>; events: string[] } {
  const missions = new Map<string, MissionRecord>();
  const events: string[] = [];
  return {
    missions,
    events,
    store: {
      async getRunnableMissions() {
        return [...missions.values()];
      },
      async claimForRun(id) {
        return missions.get(id) ?? null;
      },
      async updateMission(id, patch) {
        const m = missions.get(id)!;
        const next = { ...m, ...patch } as MissionRecord;
        missions.set(id, next);
        events.push(`update ${id}: ${JSON.stringify(Object.keys(patch))}`);
        return next;
      },
      async addEvidence(input) {
        events.push(`evidence ${input.label}`);
        return null;
      },
      async addThreadMessage(input) {
        events.push(`thread ${input.direction}: ${input.body.slice(0, 40)}`);
        return null;
      },
    },
  };
}

function mission(over: Partial<MissionRecord>): MissionRecord {
  return {
    id: "m1",
    title: "upload bug",
    brief: "the upload fails past 2mb. https://example.com/support",
    problem: "the upload fails past 2mb.",
    attempts: [],
    target_url: "https://example.com/support",
    them_email: null,
    ticket_url: null,
    forum_url: null,
    ticket_ref: null,
    channel: "browser",
    status: "working",
    urgency: "whenever",
    identity: "milo",
    last_contact_at: null,
    follow_up_count: 0,
    resolution: null,
    boss_decision_question: null,
    claim_token: null,
    claimed_at: null,
    ...over,
  };
}

const okWalker: SiteWalker = async () => ({
  submitted: true,
  detail: "submitted via ticket form: form read (4 fields), message 96/500 characters",
  themEmail: "support@example.com",
  ticketUrl: "https://vendor.com/requests/4471",
  forumTopicUrl: null,
  pointer: null,
  evidence: [{ kind: "text", label: "form read", content: "4 fields" }],
});

const noSend: any = async (input: any) => ({ ok: true, message_id: "out-1" });

Deno.test("a walk that submits: waiting_on_them, the clock starts, receipts on file", async () => {
  const { store, missions, events } = fakeStore();
  missions.set("m1", mission({}));
  const result = await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: noSend });
  assertEquals(result.startsWith("submitted"), true);
  assertEquals(missions.get("m1")!.status, "waiting_on_them");
  assertEquals(missions.get("m1")!.last_contact_at !== null, true);
  assertEquals(missions.get("m1")!.them_email, "support@example.com");
  assertEquals(events.some((e) => e.startsWith("thread outbound")), true);
});

Deno.test("a walk that fails with an email door: the inbox works", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({}));
  const walker: SiteWalker = async () => ({
    submitted: false,
    detail: "no form on the page",
    themEmail: "support@example.com",
    ticketUrl: null,
    forumTopicUrl: null,
    pointer: null,
    evidence: [],
  });
  const result = await executeMission(missions.get("m1")!, { store, walkSite: walker, sendMail: noSend });
  assertEquals(result, "the walk failed, the inbox worked: sent to support@example.com");
  assertEquals(missions.get("m1")!.status, "waiting_on_them");
});

Deno.test("a walk that fails with no door: parked, with what he saw", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({}));
  const walker: SiteWalker = async () => ({
    submitted: false,
    detail: "no support door found on the home page",
    themEmail: null,
    ticketUrl: null,
    forumTopicUrl: null,
    pointer: null,
    evidence: [],
  });
  const result = await executeMission(missions.get("m1")!, { store, walkSite: walker, sendMail: noSend });
  assertEquals(result, "parked: no support door found on the home page");
  assertEquals(missions.get("m1")!.status, "boss_decision");
  assertEquals(missions.get("m1")!.boss_decision_question!.includes("no support door"), true);
});

Deno.test("a refund brief parks BEFORE the walk, with the question stated", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({ status: "briefed", brief: "they charged me twice, i want a refund" }));
  let walked = false;
  const walker: SiteWalker = async () => {
    walked = true;
    return { submitted: false, detail: "", themEmail: null, ticketUrl: null, forumTopicUrl: null, pointer: null, evidence: [] };
  };
  const result = await executeMission(missions.get("m1")!, { store, walkSite: walker, sendMail: noSend });
  assertEquals(result, "parked: the brief touches something that is yours to settle");
  assertEquals(walked, false); // he asks first, he never walks into it
  assertEquals(missions.get("m1")!.status, "boss_decision");
});

Deno.test("no door in the brief: he asks, he does not guess", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({ target_url: null }));
  const result = await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: noSend });
  assertEquals(result, "parked: no support door in the brief");
  assertEquals(missions.get("m1")!.status, "boss_decision");
});

Deno.test("the polite follow-up: one calm line, the clock resets", async () => {
  const { store, missions } = fakeStore();
  missions.set(
    "m1",
    mission({
      status: "waiting_on_them",
      them_email: "support@example.com",
      last_contact_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago, due
      follow_up_count: 0,
    }),
  );
  const result = await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: noSend });
  assertEquals(result, `follow-up 1 sent: "hi, just checking whether there is an update"`);
  assertEquals(missions.get("m1")!.follow_up_count, 1);
});

Deno.test("no reply channel: the follow-up parks honestly", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({ status: "waiting_on_them", them_email: null, last_contact_at: new Date().toISOString() }));
  const result = await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: noSend });
  assertEquals(result, "parked: no reply channel for the follow-up");
  assertEquals(missions.get("m1")!.status, "boss_decision");
});

Deno.test("a failed send leaves the clock standing, never invents a thread", async () => {
  const { store, missions } = fakeStore();
  missions.set(
    "m1",
    mission({
      status: "waiting_on_them",
      them_email: "support@example.com",
      last_contact_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    }),
  );
  const failing: any = async () => ({ ok: false, error: "smtp down" });
  const result = await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: failing });
  assertEquals(result.includes("smtp down"), true);
  assertEquals(missions.get("m1")!.follow_up_count, 0); // not counted: it did not happen
});

Deno.test("a portal submit records the case home: ticket_url, channel portal", async () => {
  const { store, missions } = fakeStore();
  missions.set("m1", mission({}));
  await executeMission(missions.get("m1")!, { store, walkSite: okWalker, sendMail: noSend });
  assertEquals(missions.get("m1")!.ticket_url, "https://vendor.com/requests/4471");
  assertEquals(missions.get("m1")!.channel, "portal");
});

Deno.test("a dead end that names the next door bounces the mission there", async () => {
  const { store, missions, events } = fakeStore();
  missions.set("m1", mission({}));
  const walker: SiteWalker = async () => ({
    submitted: false,
    detail: "the chat bot said to email billing",
    themEmail: null,
    ticketUrl: null,
    forumTopicUrl: null,
    pointer: { channel: "email", target: "billing@vendor.com", note: "the agent named billing@vendor.com" },
    evidence: [],
  });
  const result = await executeMission(missions.get("m1")!, { store, walkSite: walker, sendMail: noSend });
  assertEquals(result, "bounced: the agent named billing@vendor.com");
  assertEquals(missions.get("m1")!.them_email, "billing@vendor.com");
  assertEquals(missions.get("m1")!.status, "working");
  assertEquals(events.some((e) => e.startsWith("evidence bounce")), true);
});

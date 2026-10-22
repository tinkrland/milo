// supabase service (milo, oct 22 2026): the case files.
//
// milo remembers what you've already suffered through: every attempt,
// every channel, every polite follow-up, written down. three tables:
// missions (the dossier + the clock), evidence (the receipts), and
// thread_messages (every word said on either side, in or out).
//
// fails closed: no creds, no client, no silent fallback. a mission
// engine without its case files is a guy, not a henchman.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "supabase not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). milo fails closed.",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

// ---------------------------------------------------------------------------
// missions
// ---------------------------------------------------------------------------

export interface MissionRecord {
  id: string;
  title: string;
  brief: string;
  problem: string;
  attempts: string[];
  target_url: string | null;
  channel: "browser" | "email" | "discord" | "slack" | "portal" | "forum" | "phone" | "unassigned";
  status: string;
  urgency: string;
  identity: string;
  last_contact_at: string | null;
  follow_up_count: number;
  resolution: string | null;
  boss_decision_question: string | null;
  ticket_ref: string | null;
  them_email: string | null;
  ticket_url: string | null;
  forum_url: string | null;
  slack_thread_ts: string | null;
  claim_token: string | null;
  claimed_at: string | null;
  created_date?: string;
}

export async function createMission(input: {
  title: string;
  brief: string;
  problem: string;
  attempts: string[];
  target_url: string | null;
  urgency: string;
  identity: string;
}): Promise<MissionRecord> {
  const { data, error } = await getSupabase()
    .from("missions")
    .insert({
      title: input.title,
      brief: input.brief,
      problem: input.problem,
      attempts: input.attempts,
      target_url: input.target_url,
      channel: input.target_url ? "browser" : "email",
      status: "briefed",
      urgency: input.urgency,
      identity: input.identity,
      follow_up_count: 0,
    })
    .select()
    .single();
  if (error) throw new Error(`createMission failed: ${error.message}`);
  return data as MissionRecord;
}

export async function getMission(id: string): Promise<MissionRecord | null> {
  const { data, error } = await getSupabase()
    .from("missions")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMission failed: ${error.message}`);
  return (data as MissionRecord) ?? null;
}

export async function updateMission(
  id: string,
  patch: Partial<MissionRecord>,
): Promise<MissionRecord> {
  const { data, error } = await getSupabase()
    .from("missions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateMission failed: ${error.message}`);
  return data as MissionRecord;
}

// the missions the dispatcher owes work on right now: anything working
// that has stalled, and anything waiting on them whose follow-up
// clock has run out. boss_decision and stood_down are never touched:
// parked is parked, stood down is stood down.
export async function getRunnableMissions(now: Date): Promise<MissionRecord[]> {
  const iso = now.toISOString();
  const { data: working, error: e1 } = await getSupabase()
    .from("missions")
    .select()
    .eq("status", "working")
    .or(`claimed_at.is.null,claimed_at.lt.${new Date(now.getTime() - 15 * 60 * 1000).toISOString()}`)
    .order("created_date");
  if (e1) throw new Error(`getRunnableMissions(working) failed: ${e1.message}`);

  const { data: waiting, error: e2 } = await getSupabase()
    .from("missions")
    .select()
    .eq("status", "waiting_on_them")
    .not("last_contact_at", "is", null)
    .lt("last_contact_at", iso)
    .order("created_date");
  if (e2) throw new Error(`getRunnableMissions(waiting) failed: ${e2.message}`);

  return [...(working ?? []), ...(waiting ?? [])] as MissionRecord[];
}

// the claim, after prixie's meeting manager: one milo per mission, and
// a claim nobody else holds. the claim is a lease, not a lock: a stale
// claim (15 minutes, the walk budget) is fair game again, and a crashed
// run never strands a mission forever.
export async function claimForRun(id: string, now: Date): Promise<MissionRecord | null> {
  const db = getSupabase();
  const staleBefore = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const claimToken = crypto.randomUUID();

  // atomic-ish: claim only when unclaimed or stale. two claimants race,
  // the second update matches nothing and returns null.
  const { data } = await db
    .from("missions")
    .update({ claim_token: claimToken, claimed_at: now.toISOString() })
    .eq("id", id)
    .or(`claim_token.is.null,claimed_at.lt.${staleBefore}`)
    .select()
    .maybeSingle();

  return (data as MissionRecord) ?? null;
}

// ---------------------------------------------------------------------------
// evidence: every attempt, error, and screenshot stays with the case
// ---------------------------------------------------------------------------

export interface EvidenceRecord {
  id: string;
  mission_id: string;
  kind: "screenshot" | "log" | "text" | "link" | "file";
  label: string;
  content: string | null;
  url: string | null;
  captured_at: string;
}

export async function addEvidence(input: {
  mission_id: string;
  kind: EvidenceRecord["kind"];
  label: string;
  content?: string | null;
  url?: string | null;
}): Promise<EvidenceRecord> {
  const { data, error } = await getSupabase()
    .from("evidence")
    .insert({
      mission_id: input.mission_id,
      kind: input.kind,
      label: input.label,
      content: input.content ?? null,
      url: input.url ?? null,
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`addEvidence failed: ${error.message}`);
  return data as EvidenceRecord;
}

export async function getEvidence(missionId: string): Promise<EvidenceRecord[]> {
  const { data, error } = await getSupabase()
    .from("evidence")
    .select()
    .eq("mission_id", missionId)
    .order("captured_at");
  if (error) throw new Error(`getEvidence failed: ${error.message}`);
  return (data ?? []) as EvidenceRecord[];
}

// ---------------------------------------------------------------------------
// thread messages: the whole conversation, both sides
// ---------------------------------------------------------------------------

export interface ThreadMessageRecord {
  id: string;
  mission_id: string;
  direction: "outbound" | "inbound";
  channel: string;
  body: string;
  message_id: string | null;
  trigger: string | null;
  sent_at: string;
}

export async function addThreadMessage(input: {
  mission_id: string;
  direction: "outbound" | "inbound";
  channel: string;
  body: string;
  message_id?: string | null;
  trigger?: string | null;
}): Promise<ThreadMessageRecord> {
  const { data, error } = await getSupabase()
    .from("thread_messages")
    .insert({
      mission_id: input.mission_id,
      direction: input.direction,
      channel: input.channel,
      body: input.body,
      message_id: input.message_id ?? null,
      trigger: input.trigger ?? null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`addThreadMessage failed: ${error.message}`);
  return data as ThreadMessageRecord;
}

export async function getThread(missionId: string): Promise<ThreadMessageRecord[]> {
  const { data, error } = await getSupabase()
    .from("thread_messages")
    .select()
    .eq("mission_id", missionId)
    .order("sent_at");
  if (error) throw new Error(`getThread failed: ${error.message}`);
  return (data ?? []) as ThreadMessageRecord[];
}

// match an inbound support reply to its mission: by the message id our
// own outbound mail carried (the provider returns it in in-reply-to),
// else by a ticket number support handed over (stored on the mission
// the moment they send one), else null: the caller reports the orphan
// to the boss rather than guessing a case.
export async function findMissionForInbound(
  messageId: string | null,
  text: string,
): Promise<MissionRecord | null> {
  if (messageId) {
    const { data } = await getSupabase()
      .from("thread_messages")
      .select("mission_id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (data?.mission_id) return await getMission(data.mission_id);
  }
  const m = (text || "").match(/(?:ticket|case)[^0-9]{0,12}(\d{3,})/i);
  if (m) {
    const { data } = await getSupabase()
      .from("missions")
      .select()
      .eq("ticket_ref", m[1])
      .maybeSingle();
    if (data) return data as MissionRecord;
  }
  return null;
}

// call-e seam (milo, oct 22 2026): the phone leg, dispatched not owned.
//
// "understood. currently on hold." the ivr menu, the queue, the hold
// music: these are call-e's trade (heycall-e.com), and milo borrows
// the family toolbox, he does not own the phone system. the contract
// is the takable part (MIT, docs/research/heycall-call-e.md):
//
//   plan_call(goal, phone)  -> a plan exists, the world unchanged
//   run_call(plan, confirm) -> the call is placed, once, idempotently
//   get_call_run(run_id)    -> status, activity, transcript, result
//
// the confirm gate is milo's own rule stated as an api: nothing leaves
// without a brief, and a call is a brief the boss confirms. fails
// closed: no CALLE_API_KEY means the phone leg reports "not
// configured", never pretends to dial.
//
// the identity rule (prixie's, standing): he never acts AS the boss.
// the call states who he is (MILO_IDENTITY) and that he is calling on
// behalf of the boss. what a support line does with that is their
// business; pretending to be the boss is not milo's.

// the key is read at call time, not module load: a deployment that
// adds the key after boot gets the leg, and the pins get the truth.
function calleKey(): string | null {
  return Deno.env.get("CALLE_API_KEY") || null;
}
function calleBase(): string {
  return Deno.env.get("CALLE_BASE_URL") || "https://api.heycall-e.com";
}

export interface CallPlan {
  ok: boolean;
  plan_id: string | null;
  confirm_token: string | null;
  goal: string;
  phone: string;
  result_schema: Record<string, string>;
  error?: string;
}

// the debrief schema: closed, scalar, exactly what a support call can
// answer. the boss reads this shape on every phone mission.
export const PHONE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "outcome"],
  properties: {
    summary: { type: "string" },
    outcome: { type: "string" },
    ticket_ref: { type: "string" },
    needs_boss: { type: "string" },
  },
} as Record<string, unknown>;

// plan a call for a mission. the goal is composed from the brief, in
// milo's voice: polite, specific, and honest about being a call on
// behalf. no call is placed here, ever.
export function planCall(input: {
  problem: string;
  attempts: string[];
  phone: string;
  identity?: string;
}): CallPlan {
  if (!calleKey()) {
    return {
      ok: false,
      plan_id: null,
      confirm_token: null,
      goal: "",
      phone: input.phone,
      result_schema: {},
      error: "phone leg not configured (CALLE_API_KEY unset): milo reports, he does not pretend to dial",
    };
  }
  const identity = input.identity || Deno.env.get("MILO_IDENTITY") || "milo";
  const attemptsLine = input.attempts.length
    ? `already tried: ${input.attempts.join("; ")}.`
    : "";
  const goal = [
    `call this support line about the following problem: ${input.problem}`,
    attemptsLine,
    `navigate the ivr menu to reach a human, wait on hold as long as it takes,`,
    `explain once, keep the ticket number, and report the outcome.`,
    `identify yourself as ${identity}, calling on behalf of the customer; never claim to be the customer.`,
  ].filter(Boolean).join(" ");

  return {
    ok: true,
    plan_id: null, // the server assigns it at run time in the v2 api
    confirm_token: null,
    goal,
    phone: input.phone,
    result_schema: PHONE_RESULT_SCHEMA as Record<string, string>,
  };
}

export interface CallRunResult {
  ok: boolean;
  call_id: string | null;
  status: string | null;
  result: Record<string, unknown> | null;
  transcript: Array<{ offset_seconds: number; speaker: string; text: string }> | null;
  error?: string;
}

// the run, after the boss confirms. idempotency is the law: the
// mission's id is the idempotency key, so a retry after a crash
// replays the same call request, never places a second one.
export async function runCall(plan: CallPlan, missionId: string): Promise<CallRunResult> {
  const key = calleKey();
  if (!plan.ok || !key) {
    return { ok: false, call_id: null, status: null, result: null, transcript: null, error: plan.error || "not configured" };
  }
  try {
    const res = await fetch(`${calleBase()}/v2/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "Idempotency-Key": `milo-mission-${missionId}`,
      },
      body: JSON.stringify({
        task: plan.goal,
        phone: plan.phone,
        result_schema: plan.result_schema,
        metadata: { mission_id: missionId },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 422 input_incomplete: the facts are missing. that goes back to
      // the boss, not into a guessing loop.
      return { ok: false, call_id: null, status: null, result: null, transcript: null, error: `call-e refused: ${res.status} ${JSON.stringify(data).slice(0, 300)}` };
    }
    return { ok: true, call_id: data.id, status: data.status ?? "accepted", result: data.result ?? null, transcript: data.transcript ?? null };
  } catch (err: any) {
    return { ok: false, call_id: null, status: null, result: null, transcript: null, error: `call-e errored: ${err.message}` };
  }
}

// the read, resumable by contract: a saved call id is polled, never
// re-run. result_status drives the wait, not "completed" alone.
export async function getCallRun(callId: string): Promise<CallRunResult> {
  const key = calleKey();
  if (!key) {
    return { ok: false, call_id: null, status: null, result: null, transcript: null, error: "not configured" };
  }
  try {
    const res = await fetch(`${calleBase()}/v2/calls/${callId}`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, call_id: callId, status: null, result: null, transcript: null, error: `read failed: ${res.status}` };
    }
    return {
      ok: true,
      call_id: callId,
      status: `${data.status ?? ""} / result ${data.result_status ?? ""} / outcome ${data.call_outcome ?? ""}`.trim(),
      result: data.result ?? null,
      transcript: data.transcript ?? null,
    };
  } catch (err: any) {
    return { ok: false, call_id: callId, status: null, result: null, transcript: null, error: `read errored: ${err.message}` };
  }
}

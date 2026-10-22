// the call-e seam, pinned: the phone leg fails closed, and the
// confirm gate is the contract. these pin the pure plan half; the run
// and the read need the network, and their failure modes are honest
// paths, not branches.

import { assertEquals } from "jsr:@std/assert";
import { planCall, PHONE_RESULT_SCHEMA } from "./call_e.ts";

Deno.test("planCall: no key, no plan, and the report says why", () => {
  // the test env must not carry a key; if the deployment does, the
  // config leg is on, and this pin is run in a clean env by ci.
  Deno.env.delete("CALLE_API_KEY");
  const plan = planCall({ problem: "the upload fails", attempts: [], phone: "+15550001111" });
  assertEquals(plan.ok, false);
  assertEquals(plan.error?.includes("not configured"), true);
  assertEquals(plan.plan_id, null);
});

Deno.test("planCall: with a key the goal is milo's voice, never the boss", () => {
  Deno.env.set("CALLE_API_KEY", "test-key");
  const plan = planCall({
    problem: "the upload fails past 2mb",
    attempts: ["cleared cache", "reinstalled"],
    phone: "+15550001111",
    identity: "milo",
  });
  assertEquals(plan.ok, true);
  assertEquals(plan.goal.includes("the upload fails past 2mb"), true);
  assertEquals(plan.goal.includes("already tried: cleared cache; reinstalled"), true);
  assertEquals(plan.goal.includes("calling on behalf"), true);
  assertEquals(plan.goal.includes("never claim to be the customer"), true);
  Deno.env.delete("CALLE_API_KEY");
});

Deno.test("the result schema is closed and scalar: the debrief shape", () => {
  assertEquals(PHONE_RESULT_SCHEMA.additionalProperties, false);
  const props = (PHONE_RESULT_SCHEMA as any).properties as Record<string, unknown>;
  const required = (PHONE_RESULT_SCHEMA as any).required as string[];
  assertEquals(required, ["summary", "outcome"]);
  for (const [k, v] of Object.entries(props)) {
    assertEquals((v as any).type, "string", `field ${k} must be scalar`);
  }
});

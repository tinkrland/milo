// missions routes (milo, oct 22 2026). the boss's controls: brief him,
// check on him, answer him, stand him down. every route is honest
// about what it did; nothing here "tries its best" silently.

import { Hono } from "hono";
import {
  createMission,
  getMission,
  getEvidence,
  getThread,
  updateMission,
} from "../services/supabase.ts";
import { parseBrief } from "../services/missions.ts";
import { runManagerOnce } from "../scheduler/mission_manager.ts";

export const missionsRoutes = new Hono();

// brief him. a paragraph of frustrated rambling is a real brief.
missionsRoutes.post("/api/missions", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.brief || typeof body.brief !== "string") {
    return c.json({ error: "a brief is required: the problem, in the boss's own words" }, 400);
  }
  const brief = parseBrief(body.brief);
  const mission = await createMission({
    title: (body.title || brief.problem).slice(0, 200),
    brief: body.brief.slice(0, 10000),
    problem: brief.problem,
    attempts: brief.attempts,
    target_url: brief.targetUrl,
    urgency: brief.urgency,
    identity: body.identity || Deno.env.get("MILO_IDENTITY") || "milo",
  });
  // dispatch immediately by default: forwarding a brief to him IS the
  // instruction to be on it. { dispatch: false } holds him at briefed.
  if (body.dispatch !== false) {
    await updateMission(mission.id, { status: "working" });
  }
  return c.json({ mission, brief }, 201);
});

missionsRoutes.get("/api/missions/:id", async (c) => {
  const mission = await getMission(c.req.param("id"));
  if (!mission) return c.json({ error: "no such mission" }, 404);
  const [evidence, thread] = await Promise.all([
    getEvidence(mission.id),
    getThread(mission.id),
  ]);
  return c.json({ mission, evidence, thread });
});

// the debrief: run the loop once and return what he did. the boss
// calls it, the scheduler calls it, both are fine.
missionsRoutes.post("/api/tick", async (c) => {
  const result = await runManagerOnce();
  return c.json(result);
});

// dispatch or re-dispatch a held mission.
missionsRoutes.post("/api/missions/:id/dispatch", async (c) => {
  const mission = await getMission(c.req.param("id"));
  if (!mission) return c.json({ error: "no such mission" }, 404);
  if (mission.status === "stood_down") {
    return c.json({ error: "he was stood down. that is final. brief him fresh if you need him again." }, 409);
  }
  if (mission.status === "resolved") {
    return c.json({ error: "this case is closed" }, 409);
  }
  const updated = await updateMission(mission.id, { status: "working" });
  return c.json({ mission: updated });
});

// "milo, stand down." always honored, immediately, for any status.
missionsRoutes.post("/api/missions/:id/stand_down", async (c) => {
  const mission = await getMission(c.req.param("id"));
  if (!mission) return c.json({ error: "no such mission" }, 404);
  const updated = await updateMission(mission.id, {
    status: "stood_down",
    claim_token: null,
  });
  return c.json({ mission: updated });
});

// the boss answers a parked question, and he moves again.
missionsRoutes.post("/api/missions/:id/decide", async (c) => {
  const mission = await getMission(c.req.param("id"));
  if (!mission) return c.json({ error: "no such mission" }, 404);
  if (mission.status !== "boss_decision") {
    return c.json({ error: `nothing to decide at status ${mission.status}` }, 409);
  }
  const body = await c.req.json().catch(() => null);
  const answer = body?.answer;
  if (typeof answer !== "string" || !answer.trim()) {
    return c.json({ error: "an answer is required" }, 400);
  }
  const a = answer.trim().toLowerCase();
  const patch: Record<string, unknown> = { boss_decision_question: null };

  if (/^no\b|stand down|cancel/.test(a)) {
    patch.status = "stood_down";
  } else {
    // "yes", "go ahead", or an instruction he carries forward: back to
    // work, the answer pinned to the case so the walk can read it.
    patch.status = "working";
    patch.brief = `${mission.brief}\n\n[the boss, on the parked question "${mission.boss_decision_question}"]\n${answer}`;
    // a door handed over in the answer becomes the target
    const url = answer.match(/https?:\/\/[^\s)"']+/);
    const mail = answer.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (url) patch.target_url = url[0];
    if (mail) patch.them_email = mail[0];
  }
  const updated = await updateMission(mission.id, patch as any);
  return c.json({ mission: updated });
});

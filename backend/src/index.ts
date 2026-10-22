// milo: the mission engine (oct 22 2026).
//
// you have a problem. milo's on it. the server is the same shape as
// prixie's: hono on deno, supabase for the case files, and a manager
// loop that owns the clock. the difference is the work: not being
// present, but being persistent.
//
// fails closed everywhere: no browserbase creds, no walks; no
// agentmail creds, no mail; no supabase, no missions at all. the
// health route says which legs are configured, honestly.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { missionsRoutes } from "./routes/missions.ts";
import { agentmailRoutes } from "./routes/webhooks/agentmail.ts";

const app = new Hono();

app.use("*", cors());

app.route("/", missionsRoutes);
app.route("/", agentmailRoutes);

// the honest health check: which legs are configured, nothing faked.
app.get("/api/health", (c) => {
  return c.json({
    who: "milo",
    status: "awaiting assignment",
    legs: {
      browser: !!Deno.env.get("BROWSERBASE_API_KEY"),
      mail_inbound: !!Deno.env.get("AGENTMAIL_WEBHOOK_SECRET"),
      mail_outbound: !!(Deno.env.get("AGENTMAIL_API_KEY") && Deno.env.get("AGENTMAIL_INBOX_ID")),
      phone: !!Deno.env.get("CALLE_API_KEY"),
      cases: !!(Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      boss: !!Deno.env.get("MILO_BOSS_EMAIL"),
    },
  });
});

Deno.serve({ port: Number(Deno.env.get("PORT") || 8000) }, app.fetch);

// the autotick (optional): a deployment that wants the follow-up clock
// to run on its own sets MILO_AUTOTICK=1 and MILO_TICK_MINUTES.
if (Deno.env.get("MILO_AUTOTICK") === "1") {
  const minutes = Number(Deno.env.get("MILO_TICK_MINUTES") || 15);
  const { runManagerOnce } = await import("./scheduler/mission_manager.ts");
  setInterval(async () => {
    try {
      const result = await runManagerOnce();
      for (const r of result.ran) console.log(`milo: ${r.mission_id} ${r.result}`);
    } catch (err: any) {
      console.warn(`milo: manager pass failed: ${err.message}`);
    }
  }, minutes * 60 * 1000);
}

// the agentmail webhook (milo, oct 22 2026): the transport. it verifies
// the shared secret and hands the payload to agentMailInbound; the
// routing decisions (boss vs support reply vs stranger) live in the
// service, pure, tested.

import { Hono } from "hono";
import { handleInbound } from "../../services/agentmail.ts";

export const agentmailRoutes = new Hono();

agentmailRoutes.post("/webhooks/agentmail", async (c) => {
  const secret = Deno.env.get("AGENTMAIL_WEBHOOK_SECRET");
  if (!secret) {
    return c.json({ error: "webhook not configured (AGENTMAIL_WEBHOOK_SECRET unset): the door stays closed" }, 503);
  }
  const provided = c.req.header("x-webhook-secret") || c.req.query("secret");
  if (provided !== secret) {
    return c.json({ error: "no" }, 401);
  }

  const payload = await c.req.json().catch(() => null);
  if (!payload?.from || (!payload.text && !payload.html)) {
    return c.json({ error: "not an inbound email shape" }, 400);
  }

  const outcome = await handleInbound({
    message_id: payload.message_id ?? null,
    from: payload.from,
    subject: payload.subject ?? "",
    text: payload.text,
    html: payload.html,
    date: payload.date,
  });
  return c.json({ outcome });
});

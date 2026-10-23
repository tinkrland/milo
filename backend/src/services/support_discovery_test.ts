// the discovery rules, pinned: most of the time the real issue is
// finding where tf the support thing is, so the finder is a ranked
// read, not one pattern at a time.

import { assertEquals } from "jsr:@std/assert";
import { rankSupportLinks, suggestSupportUrls, doorVerdict } from "./support_discovery.ts";

Deno.test("rankSupportLinks: the footer's support link beats marketing contact", () => {
  const ranked = rankSupportLinks([
    { text: "Home", href: "https://acme.com/" },
    { text: "resources", href: "https://acme.com/resources" },
    { text: "Contact Us", href: "https://acme.com/contact" },
    { text: "Help Center", href: "https://acme.com/help-center" },
    { text: "privacy policy", href: "https://acme.com/privacy" },
  ]);
  assertEquals(ranked[0].link.text, "Help Center");
  assertEquals(ranked.some((r) => r.link.text === "Home"), false);
  assertEquals(ranked.some((r) => r.link.text === "privacy policy"), false);
});

Deno.test("rankSupportLinks: the subdomain door scores high on its own", () => {
  const ranked = rankSupportLinks([
    { text: "docs and guides", href: "https://help.acme.com/en" },
  ]);
  assertEquals(ranked.length, 1);
  assertEquals(ranked[0].score >= 5, true);
});

Deno.test("rankSupportLinks: dedupes and drops anchors", () => {
  const ranked = rankSupportLinks([
    { text: "support", href: "https://acme.com/support" },
    { text: "Support", href: "https://acme.com/support" },
    { text: "skip to content", href: "#main" },
    { text: "about", href: "https://acme.com/about" },
  ]);
  assertEquals(ranked.length, 1);
});

Deno.test("suggestSupportUrls: the common doors by name, zendesk shape included", () => {
  const urls = suggestSupportUrls("https://acme.com/pricing");
  assertEquals(urls.includes("https://acme.com/support"), true);
  assertEquals(urls.includes("https://acme.com/help-center"), true);
  assertEquals(urls.includes("https://help.acme.com"), true);
  assertEquals(urls.some((u) => u.includes("zendesk.com/hc")), true);
  assertEquals(urls.some((u) => u === "https://acme.com/pricing"), false);
});

Deno.test("suggestSupportUrls: a bad url suggests nothing, honestly", () => {
  assertEquals(suggestSupportUrls("not a url"), []);
});

Deno.test("doorVerdict: the support page says how it can help", () => {
  const v = doorVerdict("How can we help you today? Submit a request or search our help center articles.");
  assertEquals(v.isSupportDoor, true);
  assertEquals(v.reasons.length >= 2, true);
});

Deno.test("doorVerdict: marketing copy is not a door", () => {
  const v = doorVerdict("Acme is the future of widgets. Try our 14-day free trial and see why teams love us.");
  assertEquals(v.isSupportDoor, false);
});

Deno.test("doorVerdict: a lone status mention is thin, not a door", () => {
  const v = doorVerdict("welcome to the acme status page");
  assertEquals(v.isSupportDoor, false);
});

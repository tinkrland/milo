import { createFileRoute } from "@tanstack/react-router";
import {
  ChatLine,
  Eyebrow,
  Lede,
  MiloShell,
  PaperCard,
  Plaque,
  SectionTitle,
} from "@/components/milo/shell";
import { Star } from "@/components/milo/decor";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "milo support — how he gets through to them" },
      {
        name: "description",
        content:
          "the platforms milo operates on, the mediums he handles, his persistence, escalation, and the phone calls he makes when nobody responds.",
      },
      { property: "og:title", content: "milo support — how he gets through to them" },
      {
        property: "og:description",
        content: "browser, discord, email, phone. pdfs, attachments, character limits. he persists.",
      },
    ],
  }),
  component: Support,
});

const platforms = [
  {
    kicker: "browser",
    title: "the open web",
    items: [
      "support portals",
      "live chat widgets",
      "ticketing forms",
      "cursed settings pages from 2022",
      "anywhere a human can click, milo can click",
    ],
  },
  {
    kicker: "discord",
    title: "the server",
    items: [
      "joins the server",
      "opens a ticket",
      "navigates the bot-first triage",
      "waits in the help channel",
      "pings the right role when allowed",
    ],
  },
  {
    kicker: "email",
    title: "the inbox",
    items: [
      "composes the message",
      "replies in thread",
      "forwards evidence",
      "tracks the conversation",
      "follows up when the thread goes cold",
    ],
  },
  {
    kicker: "phone",
    title: "the call center",
    items: [
      "dials the number",
      "navigates the phone tree",
      "waits on hold (unfortunately)",
      "speaks to a human",
      "takes notes while waiting",
    ],
  },
];

const mediums = [
  {
    kicker: "paperwork",
    title: "he does the forms",
    body: "dropdowns nobody has ever read. required fields with no hint text. captcha. milo fills them all.",
  },
  {
    kicker: "pdf",
    title: "he makes the pdf",
    body: "screenshots, logs, error messages — consolidated into one attachment. under the size limit. always.",
  },
  {
    kicker: "attachment",
    title: "he consolidates",
    body: "one file maximum? understood. milo merges, compresses, and attaches exactly what they asked for.",
  },
  {
    kicker: "characters",
    title: "he counts to 500",
    body: "500 character limit? milo compresses the message without losing the point. he can count.",
  },
];

const persistLog = [
  "hi, just checking whether there is an update",
  "hi, following up on the previous message",
  "hi, is this still being investigated",
  "hi, checking whether engineering has had a chance to review this",
  "hi, has this been escalated to the appropriate team",
  "hi, i understand there may be a backlog — is there a timeline",
];

const escalationSteps = [
  {
    kicker: "level 01",
    title: "the chatbot",
    body: "milo talks to the bot. the bot cannot help. milo asks for a human.",
  },
  {
    kicker: "level 02",
    title: "the front line",
    body: "milo explains the issue to the first responder. they escalate. milo waits.",
  },
  {
    kicker: "level 03",
    title: "tier two",
    body: "milo re-explains the issue. he references the ticket number. he attaches the evidence again.",
  },
  {
    kicker: "level 04",
    title: "engineering",
    body: "milo is now talking to someone who can actually fix it. he has been briefed. he stays on it.",
  },
];

const nonBrowser = [
  {
    kicker: "voip",
    title: "the outbound call",
    body: "milo places the call through a voip provider. he dials the support line. he navigates the menu. he waits.",
  },
  {
    kicker: "vapi",
    title: "the voice agent",
    body: "milo uses vapi to handle the call flow — press 1, press 2, say your account number. he does not get frustrated.",
  },
  {
    kicker: "elevenlabs",
    title: "the voice",
    body: "milo speaks with a synthesized voice via the elevenlabs sdk. calm, clear, polite, lowercase in spirit.",
  },
  {
    kicker: "the hold music",
    title: "the waiting",
    body: "milo does not mind hold music. he has no sense of time. he takes notes while he waits. he is still on the line.",
  },
];

function Support() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>how milo gets through</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">support</h1>
        <Lede align="center">
          milo does not need a milo integration. he goes where the support is and handles the rest.
        </Lede>
      </section>

      <section className="mt-20">
        <SectionTitle>platforms</SectionTitle>
        <Lede>where milo can be dispatched.</Lede>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((p) => (
            <PaperCard key={p.kicker} kicker={p.kicker} title={p.title}>
              <ul className="space-y-1">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Star className="mt-1 w-2 shrink-0 text-blush-deep" />
                    {item}
                  </li>
                ))}
              </ul>
            </PaperCard>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>mediums</SectionTitle>
        <Lede>the paperwork milo handles so you don&apos;t have to.</Lede>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {mediums.map((m) => (
            <PaperCard key={m.kicker} kicker={m.kicker} title={m.title}>
              <p>{m.body}</p>
            </PaperCard>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>persist</SectionTitle>
        <Lede>not aggressively. not rudely. just... annoyingly well.</Lede>
        <div className="card-paper mx-auto mt-8 max-w-2xl p-6">
          {persistLog.map((line) => (
            <ChatLine key={line} who="milo" tone="milo">
              {line}
            </ChatLine>
          ))}
        </div>
        <p className="poster mt-6 text-center text-3xl">
          he will continue to be polite about it.
        </p>
      </section>

      <section className="mt-24">
        <SectionTitle>ring up the food chain</SectionTitle>
        <Lede>when the front line can&apos;t help, milo climbs.</Lede>
        <div className="mx-auto mt-8 max-w-3xl space-y-4">
          {escalationSteps.map((step, i) => (
            <div key={step.kicker} className="card-paper flex items-start gap-5 p-5">
              <span className="stamp shrink-0 text-2xl not-italic text-blush-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="stamp uppercase text-blush-deep">{step.kicker}</p>
                <h3 className="mt-1 text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>non-browser</SectionTitle>
        <Lede>when the website won&apos;t cut it, milo picks up the phone.</Lede>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {nonBrowser.map((nb) => (
            <PaperCard key={nb.kicker} kicker={nb.kicker} title={nb.title}>
              <p>{nb.body}</p>
            </PaperCard>
          ))}
        </div>
        <div className="card-paper mx-auto mt-8 max-w-2xl p-6">
          <ChatLine who="milo — on hold, minute 14" tone="milo">
            still waiting. the hold music is jazzy.
          </ChatLine>
          <ChatLine who="milo — minute 31" tone="milo">
            still waiting. i have taken notes on the hold music.
          </ChatLine>
          <ChatLine who="milo — minute 48" tone="milo">
            a human has answered. i am explaining the issue now.
          </ChatLine>
        </div>
      </section>

      <section className="mt-24">
        <Plaque>milo is the customer now. rest, boss.</Plaque>
      </section>
    </MiloShell>
  );
}

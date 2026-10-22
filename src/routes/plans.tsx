import { createFileRoute } from "@tanstack/react-router";
import { Body, Eyebrow, Lede, MiloShell, Plaque, SectionTitle } from "@/components/milo/shell";
import { Star } from "@/components/milo/decor";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "milo plans — hire, deploy, or over-deploy him" },
      {
        name: "description",
        content:
          "personal henchman, field operative, or enterprise: multiple milos, multiple bosses, probably too many support tickets.",
      },
      { property: "og:title", content: "milo plans — hire, deploy, or over-deploy him" },
      {
        property: "og:description",
        content: "one milo, browser access, professional persistence.",
      },
    ],
  }),
  component: Plans,
});

const plans = [
  {
    kicker: "plan one",
    name: "personal henchman",
    items: ["one milo", "browser access", "email", "support chats", "professional persistence"],
    cta: "hire milo",
  },
  {
    kicker: "plan two",
    name: "field operative",
    items: [
      "everything above",
      "discord",
      "phone calls",
      "automated phone systems",
      "advanced evidence handling",
    ],
    cta: "deploy milo",
  },
  {
    kicker: "plan three",
    name: "enterprise",
    items: [
      "multiple milos",
      "multiple bosses",
      "multiple ongoing missions",
      "probably too many support tickets",
    ],
    cta: "why are you making milo do this many things",
  },
];

const testimonials = [
  {
    quote:
      "i have a spreadsheet of his ticket numbers. i did not make it on purpose. i made it because i needed to prove to my manager that it was the same person. it is always the same person. he is always polite. i am not sleeping well.",
    name: "tier 1 support agent",
    company: "a saas company that wishes to remain unnamed",
  },
  {
    quote:
      "we told him discord. he was in the server before i finished typing. we told him email. six seconds. we told him to call. he called. i have stopped suggesting channels. i have started suggesting nothing.",
    name: "support lead",
    company: "a fintech",
  },
  {
    quote:
      "he attached the correct pdf four times. four. i have colleagues who have never attached a correct pdf. i don't know what to do with that information. i think about it when i'm driving.",
    name: "engineering manager",
    company: "a platform",
  },
  {
    quote:
      "9pm saturday. a public holiday. during our all-hands. he is not bound by business hours and i have begun to understand that neither, spiritually, am i.",
    name: "customer success rep",
    company: "a hosting provider",
  },
  {
    quote:
      "i put him on hold for forty-one minutes as a test. he said thank you. he picked the sentence back up exactly where it stopped. i went to the parking lot afterwards and sat there.",
    name: "support agent",
    company: "an isp",
  },
  {
    quote:
      "we closed it as resolved. he reopened it. he was right. it was not resolved. he did not say 'i was right'. he said 'no problem, thank you for checking'. i would have preferred that he gloat.",
    name: "support supervisor",
    company: "an e-commerce platform",
  },
  {
    quote:
      "my queue has a little hat in it now. that's how i think of him. the little hat. it never leaves. it says 'hi, just following up'. it will say that forever.",
    name: "queue triage",
    company: "a b2b vendor",
  },
  {
    quote:
      "i escalated to my manager purely so someone else would have to read the thread. she read it. she came to my desk. she said 'he's not doing anything wrong.' i know. that's the problem.",
    name: "senior support agent",
    company: "a payments company",
  },
  {
    quote:
      "he thanked me for my time in a message where he was, factually, informing me that we had failed to do our job for eleven days. i've reread it several times. it holds up.",
    name: "support manager",
    company: "a logistics startup",
  },
];

function Plans() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>staffing options</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">milo plans</h1>
        <Lede align="center">he does not negotiate his own salary. he simply salutes.</Lede>
      </section>

      <section className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="card-paper flex flex-col p-6">
            <p className="stamp uppercase text-blush-deep">{plan.kicker}</p>
            <h2 className="mt-2 text-3xl">{plan.name}</h2>
            <ul className="mt-4 flex-1 space-y-2 font-medium">
              {plan.items.map((i) => (
                <li key={i} className="flex items-center gap-2">
                  <Star className="w-2.5 shrink-0 text-blush-deep" />
                  {i}
                </li>
              ))}
            </ul>
            <button className="cta-btn mt-6 border-2 border-ink bg-ink px-4 py-3 text-xs uppercase not-italic text-blush transition-colors hover:bg-blush-deep hover:text-ink">
              {plan.cta}
            </button>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <SectionTitle>from the other side of the ticket</SectionTitle>
        <Body>
          <p>
            we asked the people on the other end of milo&apos;s tickets how the experience was. these
            are their words. we have not edited them.
          </p>
        </Body>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="card-paper flex flex-col p-6">
              <blockquote className="flex-1 text-sm font-medium leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 border-t-2 border-dotted border-ink/30 pt-3">
                <p className="stamp uppercase text-blush-deep">{t.name}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{t.company}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <Plaque>you don&apos;t need another assistant. you need a guy.</Plaque>
      </section>
    </MiloShell>
  );
}

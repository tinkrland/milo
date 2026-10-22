import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow, Lede, MiloShell, Plaque } from "@/components/milo/shell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "milo faq — yes, no, and professionally" },
      {
        name: "description",
        content:
          "can milo use websites? yes. can milo deal with three support representatives? professionally.",
      },
      { property: "og:title", content: "milo faq — yes, no, and professionally" },
      {
        property: "og:description",
        content: "please stop setting milo on things he cannot do.",
      },
    ],
  }),
  component: Faq,
});

const qa: Array<[string, string]> = [
  ["does milo replace customer support?", "no. milo is the customer."],
  ["can milo use websites?", "yes."],
  ["can milo send emails?", "yes."],
  ["can milo use discord?", "yes."],
  ["can milo make phone calls?", "yes."],
  ["can milo navigate automated phone systems?", "unfortunately."],
  ["can milo make a pdf?", "yes."],
  ["can milo compress a pdf?", "yes."],
  ["can milo count to 500?", "yes."],
  ["does he remember what i've already tried?", "yes. he has been briefed."],
  ["what if support tells him to switch channels?", "milo switches channels."],
  ["what if they don't respond?", "milo follows up."],
  ["what if they still don't respond?", "milo follows up."],
  ["can milo deal with a support representative?", "yes."],
  ["can milo deal with three support representatives?", "professionally."],
  ["does milo ask me before doing sensitive things?", "yes. refunds and accounts need the boss."],
  ["can i tell milo when to stop?", "yes. he stands down immediately."],
  ["isn't that annoying?", "yes. professionally."],
  ["can milo retrieve my lost luggage?", "no."],
  ["why not?", "because milo is not a luggage retrieval service."],
  ["could milo retrieve my lost luggage?", "no."],
  ["have you tried?", "please stop setting milo on things he cannot do."],
];

function Faq() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>frequently asked, patiently answered</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">milo faq</h1>
        <Lede align="center">he answers in lowercase, like everything else.</Lede>
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <div className="card-paper p-2">
          <Accordion type="single" collapsible className="w-full">
            {qa.map(([q, a], i) => (
              <AccordionItem
                key={q}
                value={`item-${i}`}
                className="border-b-2 border-dotted border-ink/30 last:border-0"
              >
                <AccordionTrigger className="text-lg hover:no-underline px-4">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-base font-medium text-muted-foreground px-4">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="mt-16">
        <Plaque>milo is the customer now. rest, boss.</Plaque>
      </section>
    </MiloShell>
  );
}

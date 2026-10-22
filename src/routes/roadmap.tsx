import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, Lede, MiloShell, Plaque } from "@/components/milo/shell";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "milo's roadmap — assignments in progress" },
      {
        name: "description",
        content:
          "what milo can already do, what he's training for, and the things we keep telling you he cannot do.",
      },
      { property: "og:title", content: "milo's roadmap — assignments in progress" },
      {
        property: "og:description",
        content: "shipped, in training, and please stop setting milo on things he cannot do.",
      },
    ],
  }),
  component: Roadmap,
});

type Phase = {
  status: string;
  label: string;
  items: string[];
};

const phases: Phase[] = [
  {
    status: "handled",
    label: "already on duty",
    items: [
      "browser access",
      "support chats",
      "email inbox",
      "evidence handling",
      "pdf creation + compression",
      "character limits",
      "cross-channel continuity",
      "professional persistence",
    ],
  },
  {
    status: "in training",
    label: "next assignments",
    items: [
      "discord tickets",
      "phone calls",
      "automated phone systems (unfortunately)",
      "multiple ongoing missions",
      "shared missions between bosses",
      "milo's public call log",
    ],
  },
  {
    status: "declined",
    label: "not milo's job",
    items: [
      "lost luggage retrieval",
      "arguing with your landlord",
      "attending your family dinner",
      "anything involving a fax machine we cannot see",
    ],
  },
];

const longGame = [
  { quarter: "q1", title: "one milo, many bureaucracies", body: "a single mission, followed to a human being, wherever they hide." },
  { quarter: "q2", title: "milo's notebook", body: "every attempt, every channel, every polite follow-up, written down." },
  { quarter: "q3", title: "milo on the phone", body: "hold music is a solved problem for someone with no sense of time." },
  { quarter: "q4", title: "multiple milos", body: "why are you making milo do this many things." },
];

function statusColor(status: string): string {
  if (status === "handled") return "bg-blush-deep";
  if (status === "in training") return "bg-ink/40";
  return "bg-transparent border-2 border-ink";
}

function Roadmap() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>assignment board</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">milo&apos;s roadmap</h1>
        <Lede align="center">he is one small guy. he is being trained in order of usefulness.</Lede>
      </section>

      <section className="mx-auto mt-16 max-w-2xl">
        <div className="relative">
          <div className="absolute bottom-0 left-[7px] top-2 w-px border-l-2 border-dotted border-ink/40" />
          <div className="space-y-12">
            {phases.map((phase) => (
              <div key={phase.status} className="relative pl-10">
                <div className={`absolute left-0 top-1 h-4 w-4 rounded-full ${statusColor(phase.status)}`} />
                <p className="stamp uppercase text-blush-deep">{phase.status}</p>
                <h2 className="mt-1 text-3xl">{phase.label}</h2>
                <ul className="mt-4 space-y-2 font-medium">
                  {phase.items.map((item) => (
                    <li
                      key={item}
                      className="border-b-2 border-dotted border-ink/20 pb-2 text-base last:border-0"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-20">
        <div className="mx-auto max-w-2xl">
          <p className="stamp uppercase text-blush-deep">the long game</p>
          <h2 className="poster mt-1 text-3xl sm:text-5xl">the long game</h2>
          <div className="mt-8 space-y-6">
            {longGame.map((item) => (
              <div key={item.quarter} className="relative pl-10">
                <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-ink" />
                <p className="stamp uppercase text-muted-foreground">{item.quarter}</p>
                <h3 className="mt-1 text-2xl">{item.title}</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-20">
        <Plaque>milo does not give up. that is the whole roadmap.</Plaque>
      </section>
    </MiloShell>
  );
}

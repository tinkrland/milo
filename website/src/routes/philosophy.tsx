import { createFileRoute } from "@tanstack/react-router";
import { Body, Eyebrow, Lede, MiloShell, PaperCard, Plaque, SectionTitle } from "@/components/milo/shell";
import { Star } from "@/components/milo/decor";

export const Route = createFileRoute("/philosophy")({
  head: () => ({
    meta: [
      { title: "why milo exists — the philosophy" },
      {
        name: "description",
        content:
          "you shouldn't have to become a part-time employee of every company you buy something from. that's the job. give it to milo.",
      },
      { property: "og:title", content: "why milo exists — the philosophy" },
      {
        property: "og:description",
        content: "milo is not autonomous. milo is dispatched.",
      },
    ],
  }),
  component: Philosophy,
});

const theJob = [
  "read their faq",
  "find their support page",
  "explain the issue",
  "repeat yourself",
  "upload the screenshot",
  "resize the screenshot",
  "convert it to pdf",
  "discover the 500 character limit",
  "start the chat",
  "get told to email",
  "email them",
  "get told to use discord",
  "join the server",
  "open the ticket",
  "get told to call",
  "navigate the phone tree",
];

function Philosophy() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>the manifesto</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">why does milo exist?</h1>
        <Lede align="center">
          milo exists for the moment after you&apos;ve already done everything reasonable.
        </Lede>
        <div className="mx-auto mt-8 max-w-xl space-y-2 text-lg font-medium">
          <p>you&apos;ve read the documentation.</p>
          <p>you&apos;ve tried the obvious fix.</p>
          <p>you&apos;ve fought the chatbot.</p>
          <p>you&apos;ve explained the problem.</p>
          <p>
            now there is a 14-step support flow standing between you and a human being who can
            actually help.
          </p>
        </div>
        <div className="mt-8">
          <Plaque>send milo.</Plaque>
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>
          because you shouldn&apos;t have to become a part-time employee of every company you buy
          something from.
        </SectionTitle>
        <div className="mx-auto mt-8 grid max-w-3xl gap-x-8 gap-y-1 text-lg font-medium sm:grid-cols-2">
          {theJob.map((item) => (
            <p key={item} className="flex items-center gap-2">
              <Star className="w-2.5 shrink-0 text-blush-deep" />
              {item}
            </p>
          ))}
        </div>
        <p className="poster mt-8 text-center text-4xl">that&apos;s the job.</p>
        <p className="mt-2 text-center text-lg font-extrabold">give it to milo.</p>
      </section>

      <section className="mt-24">
        <SectionTitle>support did not get worse. it got outsourced to you.</SectionTitle>
        <Body>
          <p>
            somewhere along the way, the cost of a broken product quietly moved onto the customer.
            not the money — the labour. the screenshots, the reproduction steps, the reformatting,
            the repeating, the waiting, the following up. you do that work for free, on your own
            time, for a company that has a whole department for it.
          </p>
          <p>
            none of it is hard. that&apos;s what makes it so infuriating. it&apos;s just long. it&apos;s
            fourteen small steps, each one individually reasonable, arranged in a sequence designed
            to make you give up somewhere around step nine.
          </p>
          <p>
            milo does not fix that system. he simply does not mind it. he has no evening to protect,
            no patience to run out of, and no feelings about being told to try restarting.
          </p>
        </Body>
      </section>

      <section className="mt-24">
        <SectionTitle>milo is not &ldquo;autonomous.&rdquo;</SectionTitle>
        <Body>
          <p>
            autonomy sounds impressive and behaves badly. an autonomous agent decides what matters.
            a dispatched one does what you sent it to do, and comes back when the decision belongs to
            you.
          </p>
        </Body>
        <Lede>milo is dispatched.</Lede>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PaperCard kicker="one" title="you brief him">
            <p>the problem, the reference point, the evidence, the attempts.</p>
          </PaperCard>
          <PaperCard kicker="two" title="you set him loose">
            <p>he salutes. he goes.</p>
          </PaperCard>
          <PaperCard kicker="three" title="he operates independently">
            <p>no micromanaging. no approving every message.</p>
          </PaperCard>
          <PaperCard kicker="four" title="he returns when necessary">
            <p>with an answer, or with a question only the boss can settle.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>persistence is not aggression</SectionTitle>
        <Body>
          <p>
            most people lose a support case not because they were wrong, but because they stopped
            replying. the queue rewards whoever is still there on day nine. that&apos;s the entire
            trick, and it&apos;s the one thing humans are worst at.
          </p>
          <p>
            milo is still there on day nine. he is still polite on day nine. he references the same
            ticket number, attaches the same correct pdf, and asks the same clear question. nobody
            can object to it, which is exactly why it works.
          </p>
        </Body>
      </section>

      <section className="mt-24">
        <SectionTitle>is milo annoying?</SectionTitle>
        <p className="poster mt-6 text-center text-6xl">yes.</p>
        <p className="poster mt-2 text-center text-3xl">professionally.</p>
        <div className="mx-auto mt-8 max-w-xl space-y-2 text-center text-lg font-medium">
          <p>milo isn&apos;t rude.</p>
          <p>he doesn&apos;t yell.</p>
          <p>he doesn&apos;t threaten anyone.</p>
          <p>he doesn&apos;t send &ldquo;HELLO????&rdquo;</p>
          <p className="font-extrabold">he just keeps following up.</p>
        </div>
      </section>

      <section className="mt-24 text-center">
        <h2 className="poster text-4xl sm:text-6xl">
          you don&apos;t need another assistant. you need a guy.
        </h2>
        <p className="mt-6 text-lg font-semibold">
          milo — your friendly personal henchman. set milo on them.
        </p>
      </section>
    </MiloShell>
  );
}

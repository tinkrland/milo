import { createFileRoute } from "@tanstack/react-router";
import { Body, Eyebrow, Lede, MiloShell, PaperCard, Plaque, SectionTitle } from "@/components/milo/shell";
import { MiloResume } from "@/components/milo/resume";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "about milo — who is this little guy" },
      {
        name: "description",
        content:
          "milo is your personal ai henchman. an assistant asks what you'd like done. a henchman says on it boss.",
      },
      { property: "og:title", content: "about milo — who is this little guy" },
      {
        property: "og:description",
        content: "why henchman and not assistant, plus milo's employee record.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>employee file</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">who is milo?</h1>
        <Lede align="center">
          milo is your personal ai henchman. you give him a problem. you give him the context. you
          send him into the support system. he figures out how to get someone to actually deal with
          it.
        </Lede>
      </section>

      <section className="mt-20">
        <SectionTitle>the short version</SectionTitle>
        <Body>
          <p>
            milo is a small, extremely serious guy in a fedora who exists to deal with the part of
            modern life that nobody signed up for: support flows, ticket queues, character limits,
            attachment rules, phone trees, and the specific silence that happens after &ldquo;we&apos;ll get
            back to you.&rdquo;
          </p>
          <p>
            you brief him once — what broke, what you already tried, what you want to happen. from
            there he works the problem himself. he opens the website. he reads the instructions
            nobody reads. he explains your issue in whatever format the company insists on. he waits
            in the queue so you don&apos;t have to sit there watching a spinner.
          </p>
          <p>
            he is not a chatbot you talk to for fun, and he is not an agent that goes off and invents
            its own goals. he is staff. you dispatch him, he reports back, and in between he is
            somebody else&apos;s problem instead of yours.
          </p>
          <p>
            milo is also intentionally a vertical agentic ai. he is not a general assistant with a
            support-shaped mode bolted on — he is built narrow, for one category of work, on purpose.
            that is why he is good at hold music and completely uninterested in writing your slides.
          </p>
        </Body>
      </section>

      <section className="mt-20">
        <SectionTitle>why &ldquo;henchman&rdquo;?</SectionTitle>
        <Body>
          <p>
            &ldquo;assistant&rdquo; implies you&apos;ll still be doing the thinking. a henchman implies
            loyalty, initiative, and a willingness to spend an entire afternoon on hold on your
            behalf without ever once making it your emotional responsibility.
          </p>
        </Body>
        <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
          <PaperCard kicker="an assistant says" title="&ldquo;what would you like me to do?&rdquo;">
            <p>then waits. then asks a clarifying question. then waits again.</p>
          </PaperCard>
          <PaperCard kicker="a henchman says" title="&ldquo;on it boss.&rdquo;">
            <p>and then actually goes and does it. that&apos;s the distinction.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-20">
        <MiloResume />
      </section>

      <section className="mt-20">
        <Eyebrow>status vocabulary</Eyebrow>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "milo is currently being professionally annoying",
            "milo has been transferred",
            "milo has attached the pdf",
            "milo is waiting for a response",
            "milo has requested an escalation",
            "milo needs the boss",
            "milo has got it",
            "milo has joined the server",
            "milo is on hold, still",
          ].map((s) => (
            <p key={s} className="card-paper px-4 py-3 text-sm font-semibold">
              {s}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle>how he behaves</SectionTitle>
        <Body>
          <p>
            milo is unfailingly polite. he does not threaten, escalate emotionally, use capital
            letters, or send &ldquo;hello????&rdquo;. he restates the facts, references the ticket
            number, attaches the evidence, and asks a clear question.
          </p>
          <p>
            he also does not forget. if you told him you already reinstalled the app, he will say so
            the first time somebody suggests reinstalling the app. he keeps the whole history of the
            problem in one place, across every channel the company pushes him into.
          </p>
          <p>
            and he knows his limits. anything involving your money, your identity, or your account
            being permanently changed comes back to you first. he is a henchman, not a
            power-of-attorney.
          </p>
        </Body>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PaperCard kicker="tone" title="polite, always">
            <p>lowercase, calm, specific. never rude, never dramatic.</p>
          </PaperCard>
          <PaperCard kicker="memory" title="he stays briefed">
            <p>every attempt, error, and screenshot stays with the case.</p>
          </PaperCard>
          <PaperCard kicker="limits" title="he checks in">
            <p>refunds, payments, and account changes need the boss.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle>a day in the life</SectionTitle>
        <Body>
          <p>
            9:02 — dispatched. 9:04 — in the chat queue, position eleven. 9:31 — explains the issue
            for the first time. 9:38 — told to email instead. 9:39 — email sent, evidence attached as
            a single pdf under 2mb because that was the rule.
          </p>
          <p>
            12:31 — polite follow-up. 3:47 — polite follow-up. next morning — asks whether
            engineering has had a chance to look. that afternoon — comes back to you with an actual
            answer, or with the one question only you can decide.
          </p>
        </Body>
      </section>

      <section className="mt-20">
        <Plaque>he is a tiny employee. he takes it extremely seriously.</Plaque>
      </section>
    </MiloShell>
  );
}

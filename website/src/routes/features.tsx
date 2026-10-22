import { createFileRoute } from "@tanstack/react-router";
import { Body, Eyebrow, Lede, MiloShell, PaperCard, Plaque, SectionTitle } from "@/components/milo/shell";
import { IMessageChat } from "@/components/milo/imessage";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "milo's features — browser, inbox, phone, persistence" },
      {
        name: "description",
        content:
          "if a human can navigate it, milo can try. browser access, cross-channel continuity, evidence handling, and professional persistence.",
      },
      { property: "og:title", content: "milo's features — half documentation, half character profile" },
      {
        property: "og:description",
        content: "milo doesn't need the company to build a milo integration.",
      },
    ],
  }),
  component: Features,
});

function Features() {
  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>half documentation, half character profile</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">what milo can do</h1>
        <Lede align="center">if a human can navigate it, milo can try.</Lede>
      </section>

      <section className="mt-16">
        <SectionTitle>browser access</SectionTitle>
        <Body>
          <p>
            milo doesn&apos;t need a company to build an integration for him. he uses the website the
            way you do: he clicks things, reads the small print, fills the form, and waits in the
            queue. if a human can navigate it, milo can try.
          </p>
        </Body>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PaperCard kicker="chat widget" title="on it boss.">
            <p>he opens it, waits in the queue, and explains the problem once.</p>
          </PaperCard>
          <PaperCard kicker="support portal" title="on it boss.">
            <p>account creation, ticket categories, dropdowns nobody has ever read.</p>
          </PaperCard>
          <PaperCard kicker="cursed settings page from 2022" title="on it boss.">
            <p>if there&apos;s a website, milo can probably find the button.</p>
          </PaperCard>
        </div>
        <div className="mt-8">
          <Plaque>milo doesn&apos;t need the company to build a milo integration.</Plaque>
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle>same problem. different inbox.</SectionTitle>
        <Body>
          <p>
            being bounced between channels is the most effective way companies get people to give up.
            milo treats it as a non-event: same issue, same context, same little guy, new window.
          </p>
        </Body>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-[#161618] p-5 sm:p-8">
          <IMessageChat
            title="support"
            lines={[
              { from: "support", direction: "left", text: "please email us." },
              { from: "milo", direction: "right", text: "understood. email sent." },
              { from: "support", direction: "left", text: "please continue through our support portal." },
              { from: "milo", direction: "right", text: "understood. support portal opened." },
              { from: "support", direction: "left", text: "please call us." },
              { from: "milo", direction: "right", text: "understood. currently on hold." },
            ]}
          />
        </div>
        <p className="mt-6 text-center text-lg font-semibold">
          same issue. same context. same little guy.
        </p>
      </section>

      <section className="mt-20">
        <SectionTitle>give him the mess. he&apos;ll figure out the paperwork.</SectionTitle>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PaperCard kicker="you give him" title="the mess">
            <p>7 screenshots, 2 error messages, a log file, a paragraph of frustrated rambling.</p>
          </PaperCard>
          <PaperCard kicker="pdf only" title="pdf created.">
            <p>understood.</p>
          </PaperCard>
          <PaperCard kicker="one attachment maximum" title="evidence consolidated.">
            <p>understood.</p>
          </PaperCard>
          <PaperCard kicker="maximum 500 characters" title="message compressed.">
            <p>understood. milo can count to 500.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle>milo remembers what you&apos;ve already suffered through.</SectionTitle>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-[#161618] p-5 sm:p-8">
          <IMessageChat
            title="support"
            lines={[
              {
                from: "you",
                direction: "right",
                text: "restarted. cleared cache. reinstalled. tried another device. reproduced the issue.",
              },
              { from: "support", direction: "left", text: "have you tried restarting?" },
              {
                from: "milo",
                direction: "right",
                text: "hi — yes, this has already been attempted six times and the issue persists",
              },
            ]}
          />
        </div>
        <p className="stamp mt-4 text-center uppercase">he has been briefed.</p>
      </section>

      <section className="mt-20">
        <SectionTitle>he follows up.</SectionTitle>
        <Lede>not aggressively. not rudely. just... annoyingly well.</Lede>
        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] bg-[#161618] p-5 sm:p-8">
          <IMessageChat
            title="support"
            lines={[
              "hi, just checking whether there is an update",
              "hi, following up on the previous message",
              "hi, is this still being investigated",
              "hi, checking whether engineering has had a chance to review this",
            ].map((text) => ({ from: "milo", direction: "right" as const, text }))}
          />
        </div>
        <p className="poster mt-6 text-center text-3xl">
          he will continue to be polite about it.
        </p>
      </section>

      <section className="mt-20">
        <SectionTitle>milo knows when to call the boss.</SectionTitle>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PaperCard kicker="he decides" title="the small stuff">
            <p>channel switching, formats, follow-up timing, ticket categories.</p>
          </PaperCard>
          <PaperCard kicker="he asks you" title="the sensitive stuff">
            <p>refunds, payments, account changes, anything with your name on it.</p>
          </PaperCard>
          <PaperCard kicker="you can say" title="&ldquo;milo, stand down&rdquo;">
            <p>and he stops. he is dispatched, not autonomous.</p>
          </PaperCard>
        </div>
      </section>
    </MiloShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Body,
  Eyebrow,
  Lede,
  MiloShell,
  PaperCard,
  Plaque,
  SectionTitle,
} from "@/components/milo/shell";
import { Star } from "@/components/milo/decor";
import { IMessageChat } from "@/components/milo/imessage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "milo — your friendly personal henchman" },
      {
        name: "description",
        content:
          "you have a problem. milo's on it. brief him once and he goes into the support system for you.",
      },
      { property: "og:title", content: "milo — your friendly personal henchman" },
      {
        property: "og:description",
        content: "you don't need another chatbot. you need a guy. set milo on them.",
      },
    ],
  }),
  component: Home,
});

const dispatchLog = [
  "opening support page...",
  "checking available support channels...",
  "starting chat...",
  "preparing issue summary...",
  "attachment limit detected: 1 file",
  "consolidating screenshots...",
  "submitting...",
  "support has escalated this to engineering.",
];

function useProgressiveReveal(active: boolean, count: number, delayMs = 650) {
  const [visibleCount, setVisibleCount] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (!active) {
      setVisibleCount(0);
      return;
    }
    for (let i = 0; i < count; i++) {
      timersRef.current.push(
        setTimeout(() => setVisibleCount(i + 1), (i + 1) * delayMs),
      );
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [active, count, delayMs]);

  return visibleCount;
}

const supportMessages = [
  { from: "milo", direction: "left" as const, text: "hi, i'm following up on a bug report i submitted — files won't upload past 2mb", time: "9:02 am" },
  { from: "support", direction: "right" as const, text: "hi milo! let me look into that for you. can you share the ticket number?", time: "9:04 am" },
  { from: "milo", direction: "left" as const, text: "#4471. i've attached the screenshot and the error log already", time: "9:04 am" },
  { from: "support", direction: "right" as const, text: "thanks! i see it here. we're looking into it now", time: "9:06 am" },
  { from: "milo", direction: "left" as const, text: "thank you", time: "9:06 am" },
  { from: "milo", direction: "left" as const, text: "hi, just following up on this — any update from engineering?", time: "12:31 pm" },
  { from: "milo", direction: "left" as const, text: "hi, checking whether this is still being investigated", time: "3:47 pm" },
];

function Home() {
  const [dispatched, setDispatched] = useState(false);
  const visibleCount = useProgressiveReveal(dispatched, dispatchLog.length);

  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>awaiting assignment</Eyebrow>
        <h1 className="poster mt-6 text-[4.5rem] leading-[0.82] sm:text-[9rem]">milo</h1>
        <p className="poster mt-4 text-2xl sm:text-4xl">your friendly personal henchman</p>

        <img
          src="/images/Untitled1359_20260818025709.png"
          alt="milo, a small serious man in a fedora, saluting"
          width={1024}
          height={1024}
          className="mx-auto mt-6 w-52 sm:w-64"
        />

        <Lede align="center">
          got a problem? <span className="font-extrabold">milo&apos;s on it.</span>
        </Lede>

        <div className="mt-8">
          <Plaque>you don&apos;t need another chatbot. you need a guy.</Plaque>
        </div>

        <button
          onClick={() => setDispatched(true)}
          className="cta-btn mt-10 border-2 border-ink bg-ink px-8 py-4 text-base uppercase not-italic text-blush transition-colors hover:bg-blush-deep hover:text-ink"
        >
          set milo on them
        </button>
        <p className="stamp mt-3 uppercase text-muted-foreground">
          {dispatched ? "milo has been dispatched" : "he salutes when you click"}
        </p>
      </section>

      <section className="mt-20">
        <Eyebrow>the demo</Eyebrow>
        <div className="mx-auto mt-6 w-full max-w-2xl">
          <IMessageChat
            title="milo"
            lines={[
              {
                from: "you",
                direction: "right",
                text: "this site keeps throwing an error when i upload files. i've tried clearing cache, reinstalling, and reproducing it on another device.",
              },
              { from: "milo", direction: "left", text: "on it boss" },
              {
                from: "milo",
                direction: "left",
                text: dispatched ? "milo has been dispatched" : "awaiting assignment",
              },
            ]}
          />
          <div className="mt-4 rounded-2xl bg-[#161618] p-4 sm:p-6">
            <ol className="space-y-2 text-left text-sm font-medium text-white/80">
              {dispatchLog.map((line, i) => {
                const isVisible = dispatched && i < visibleCount;
                const isPending = dispatched && i >= visibleCount;
                return (
                  <li
                    key={line}
                    className={`task-item flex items-center gap-2 ${
                      isVisible
                        ? "text-white"
                        : isPending
                          ? "text-white/30"
                          : i < 3
                            ? "text-white/70"
                            : "text-white/30"
                    }`}
                    style={isVisible ? undefined : { animation: "none" }}
                  >
                    <span className="stamp mr-2 not-italic text-[#ff6b86]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {isVisible && (
                      <span className="mr-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#34c759]" />
                    )}
                    {line}
                  </li>
                );
              })}
            </ol>
            {dispatched && visibleCount < dispatchLog.length && (
              <p className="stamp mt-3 flex items-center gap-1.5 text-left uppercase text-white/50">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#ff6b86]" />
                milo is working...
              </p>
            )}
            {dispatched && visibleCount >= dispatchLog.length && (
              <p className="stamp mt-4 text-left uppercase text-white/60">i&apos;ll keep an eye on it.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>what milo actually is</SectionTitle>
        <Body>
          <p>
            milo is a personal henchman. you hand him a problem — something broke, something was
            charged twice, something has been &ldquo;under review&rdquo; for eleven days — and he goes
            into the support system on your behalf.
          </p>
          <p>
            he uses the same websites you would. the chat widget, the ticket portal, the email
            address buried in the footer, the discord server, the phone line with the nine-option
            menu. no integration required, no api, no cooperation from the company.
          </p>
          <p>
            you don&apos;t supervise him. you brief him once, and he comes back when there&apos;s an
            answer or a decision that&apos;s genuinely yours to make.
          </p>
        </Body>
      </section>

      <section className="mt-24">
        <SectionTitle>you could do all that. or milo could.</SectionTitle>
        <Body>
          <p>
            here&apos;s the part of the process you already know by heart. every step is small. all of
            them together are your entire evening.
          </p>
        </Body>
        <div className="mx-auto mt-8 grid max-w-3xl gap-x-8 gap-y-1 text-center text-lg font-medium sm:grid-cols-2 sm:text-left">
          {[
            "read the faq",
            "tried restarting",
            "cleared the cache",
            "fought the chatbot",
            "explained it three times",
            "found the support form",
            "it only accepts pdfs",
            "the pdf must be under 2mb",
            "the form has a 500-character limit",
            "the chat closed at 5pm",
          ].map((item) => (
            <p key={item} className="flex items-center gap-2">
              <Star className="w-2.5 shrink-0 text-blush-deep" />
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <Eyebrow>what happens next</Eyebrow>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <PaperCard kicker="01" title="you brief him">
            <p>&ldquo;this is broken. here&apos;s what happened.&rdquo;</p>
          </PaperCard>
          <PaperCard kicker="02" title="milo gets online">
            <p>opens the website, finds the support flow, reads the instructions.</p>
          </PaperCard>
          <PaperCard kicker="03" title="bureaucracy happens">
            <p>500 characters? okay. pdf only? okay. live chat? okay.</p>
          </PaperCard>
          <PaperCard kicker="04" title="milo handles it">
            <p>talks to the chatbot. fills the form. sends the email. attaches the evidence.</p>
          </PaperCard>
          <PaperCard kicker="05" title="they respond">
            <p>milo keeps the conversation moving.</p>
          </PaperCard>
          <PaperCard kicker="06" title="you get involved when you actually need to">
            <p>if something requires your judgment, milo comes back.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>professionally annoying.</SectionTitle>
        <Lede>milo is persistent. milo is polite. milo is lowercase.</Lede>
        <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0d0d0f] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b86] to-[#c84561] text-sm font-bold text-white">
              s
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">support team</p>
              <p className="text-[0.7rem] text-[#98989f]">typically replies in a few hours</p>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#34c759]" />
              <span className="text-[0.7rem] text-[#98989f]">online</span>
            </div>
          </div>
          <div className="space-y-1 px-4 py-5">
            {supportMessages.map((msg, i) => {
              const isMilo = msg.direction === "left";
              const prev = supportMessages[i - 1];
              const next = supportMessages[i + 1];
              const groupedPrev = prev?.from === msg.from;
              const groupedNext = next?.from === msg.from;
              return (
                <div
                  key={i}
                  className={`flex ${isMilo ? "justify-start" : "justify-end"} ${groupedPrev ? "" : "mt-2.5"}`}
                >
                  <div className={`flex max-w-[80%] flex-col ${isMilo ? "items-start" : "items-end"}`}>
                    <div
                      className={`px-3.5 py-2 text-[0.85rem] leading-snug ${
                        isMilo
                          ? `bg-[#2a2a2e] text-[#f2f2f7] ${groupedPrev ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-lg"} ${groupedNext ? "rounded-bl-md" : ""}`
                          : `bg-[#0a84ff] text-white ${groupedPrev ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-lg"} ${groupedNext ? "rounded-br-md" : ""}`
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-0.5 px-1 text-[0.6rem] text-[#98989f]">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 rounded-full bg-[#1c1c1e] px-4 py-2">
              <span className="flex-1 text-[0.8rem] text-[#98989f]">milo is typing...</span>
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98989f] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98989f] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98989f]" />
              </span>
            </div>
          </div>
        </div>
        <p className="poster mt-6 text-center text-3xl">professionally.</p>
      </section>

      <section className="mt-24">
        <SectionTitle>what he decides, and what he asks you</SectionTitle>
        <Body>
          <p>
            milo handles the logistics without checking in: which channel to use, what format the
            evidence needs to be in, when to follow up, which ticket category is least wrong. those
            are chores, not choices.
          </p>
          <p>
            anything with your money or your name on it comes back to you. refunds, plan changes,
            cancellations, address updates, anything irreversible. he&apos;ll have the message drafted
            and the reasoning ready — he just won&apos;t send it until you say go.
          </p>
          <p>
            and you can stop him at any point. &ldquo;milo, stand down&rdquo; ends the mission
            immediately, mid-sentence if necessary.
          </p>
        </Body>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PaperCard kicker="he decides" title="the logistics">
            <p>channels, formats, timing, categories, phone trees.</p>
          </PaperCard>
          <PaperCard kicker="he asks" title="the consequences">
            <p>money, identity, and anything that can&apos;t be undone.</p>
          </PaperCard>
          <PaperCard kicker="you decide" title="when it ends">
            <p>stand him down whenever you like. he salutes and stops.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-24">
        <SectionTitle>when to send him</SectionTitle>
        <Body>
          <p>
            milo is not for questions the faq already answers. he is for the cases where being right
            isn&apos;t enough — where you need someone to sit in the process until it moves.
          </p>
        </Body>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <PaperCard kicker="good use of milo" title="the eleven-day ticket">
            <p>nobody has replied. you&apos;ve followed up twice. you&apos;re out of patience.</p>
          </PaperCard>
          <PaperCard kicker="good use of milo" title="the channel merry-go-round">
            <p>chat says email, email says portal, portal says call.</p>
          </PaperCard>
          <PaperCard kicker="good use of milo" title="the format gauntlet">
            <p>pdf only, one attachment, 500 characters, under 2mb.</p>
          </PaperCard>
          <PaperCard kicker="not milo&apos;s job" title="your lost luggage">
            <p>he has been asked. he has declined. repeatedly.</p>
          </PaperCard>
        </div>
      </section>

      <section className="mt-24 text-center">
        <Plaque>set milo on them.</Plaque>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold">
          <Link to="/features" className="link-underline">
            see what he can do
          </Link>
          <Link to="/philosophy" className="link-underline">
            why he exists
          </Link>
        </div>
      </section>
    </MiloShell>
  );
}

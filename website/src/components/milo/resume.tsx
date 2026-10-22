import {
  CalendarClock,
  Crop,
  FileStack,
  ListTree,
  Paperclip,
  Ticket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import browserIcon from "@/assets/stack/browser.svg.asset.json";
import supportIcon from "@/assets/stack/support.svg.asset.json";
import emailIcon from "@/assets/stack/email.svg.asset.json";
import messagesIcon from "@/assets/stack/messages.svg.asset.json";
import phoneIcon from "@/assets/stack/phone.svg.asset.json";
import discordIcon from "@/assets/stack/discord.svg.asset.json";
import slackIcon from "@/assets/stack/slack.svg.asset.json";
import miloClipboard from "@/assets/milo-clipboard.png.asset.json";


const chipTones = {
  blue: "bg-[oklch(0.95_0.02_240)] text-[oklch(0.55_0.08_240)] border-[oklch(0.88_0.03_240)]",
  violet: "bg-[oklch(0.95_0.02_310)] text-[oklch(0.55_0.09_310)] border-[oklch(0.88_0.03_310)]",
  green: "bg-[oklch(0.95_0.025_130)] text-[oklch(0.53_0.08_130)] border-[oklch(0.88_0.035_130)]",
  rose: "bg-[oklch(0.95_0.025_15)] text-[oklch(0.57_0.11_15)] border-[oklch(0.89_0.035_15)]",
} as const;

type Tone = keyof typeof chipTones;

function Chip({ children, tone }: { children: string; tone: Tone }) {
  return (
    <span
      className={`${chipTones[tone]} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold`}
    >
      <span className="opacity-60">#</span>
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-dotted border-ink/20 py-2.5 last:border-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <p className="stamp pt-0.5 uppercase text-blush-deep">{label}</p>
      <div>{children}</div>
    </div>
  );
}

const stack: Array<{ src: string; name: string }> = [
  { src: browserIcon.url, name: "browser" },
  { src: supportIcon.url, name: "support" },
  { src: emailIcon.url, name: "email" },
  { src: messagesIcon.url, name: "messages" },
  { src: phoneIcon.url, name: "phone" },
  { src: discordIcon.url, name: "discord" },
  { src: slackIcon.url, name: "slack" },
];

function StackIcon({ src, name }: { src: string; name: string }) {
  return (
    <div className="group relative flex flex-col items-center">
      <span className="stamp pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-2 scale-90 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 uppercase not-italic text-paper opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        {name}
        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
      </span>
      <img
        src={src}
        alt={name}
        width={36}
        height={36}
        loading="lazy"
        className="h-9 w-9 origin-bottom transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-125"
      />
    </div>
  );
}

const toolbox: Array<{ name: string; Icon: LucideIcon }> = [
  { name: "pdf consolidation", Icon: FileStack },
  { name: "screenshot annotation", Icon: Crop },
  { name: "ticket number tracking", Icon: Ticket },
  { name: "attachment size limits", Icon: Paperclip },
  { name: "phone tree navigation", Icon: ListTree },
  { name: "follow-up scheduling", Icon: CalendarClock },
  { name: "escalation requests", Icon: TrendingUp },
];

function ToolIcon({ name, Icon }: { name: string; Icon: LucideIcon }) {
  return (
    <div className="group relative flex flex-col items-center">
      <span className="stamp pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-2 scale-90 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 uppercase not-italic text-paper opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        {name}
        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
      </span>
      <Icon
        strokeWidth={1.75}
        className="h-9 w-9 origin-bottom text-ink transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-125"
      />
    </div>
  );
}


function Meter({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 whitespace-nowrap text-sm font-semibold">{label}</p>
      <div className="group relative h-2.5 flex-1 border border-ink/70 bg-muted">
        <div className="h-full bg-blush-deep" style={{ width: `${value}%` }} />
        {note ? (
          <span className="stamp pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 translate-y-2 scale-90 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 uppercase not-italic text-paper opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
            {note}
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReceivedBubble({ children }: { children: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[22rem] rounded-[1.25rem] rounded-bl-[0.3rem] bg-[#3a3a3c] px-4 py-2.5 text-sm leading-snug text-[#f2f2f7]">
        {children}
      </div>
    </div>
  );
}

export function MiloResume() {
  return (
    <div className="card-paper p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="stamp uppercase">milo&apos;s résumé</p>
          <h3 className="poster mt-1 text-7xl leading-[0.9] sm:text-8xl">milo airidian</h3>
          <p className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-ink">
            personal henchman
          </p>
          <div className="mt-2 w-24 border-t-2 border-ink/70" />
        </div>


        <div className="w-36 shrink-0">
          <div className="flex h-40 items-center justify-center border-2 border-dashed border-ink/70 bg-blush/40">
            <img
              src={miloClipboard.url}
              alt="milo's applicant photo"
              loading="lazy"
              className="h-32 w-auto"
            />
          </div>
          <div className="mt-2 border-2 border-ink/70 bg-card px-2 py-1 text-center">
            <span className="signature text-2xl leading-none">@milo.dev</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Row label="department">
          <p className="text-sm font-semibold">getting things done</p>
        </Row>

        <Row label="commanding officer">
          <p className="text-sm font-semibold">you</p>
        </Row>

        <Row label="skills">
          <div className="flex flex-wrap gap-2">
            <Chip tone="blue">getting things done</Chip>
            <Chip tone="violet">following up</Chip>
            <Chip tone="blue">reading the fine print</Chip>
          </div>
        </Row>

        <Row label="personality">
          <div className="flex flex-wrap gap-2">
            <Chip tone="green">professionally annoying</Chip>
            <Chip tone="rose">persistent</Chip>
            <Chip tone="green">unfailingly polite</Chip>
          </div>
        </Row>

        <Row label="stack">
          <div className="flex flex-wrap gap-2 pt-1">
            {stack.map((s) => (
              <StackIcon key={s.name} src={s.src} name={s.name} />
            ))}
          </div>
        </Row>

        <Row label="toolbox">
          <div className="flex flex-wrap gap-2 pt-1">
            {toolbox.map((t) => (
              <ToolIcon key={t.name} name={t.name} Icon={t.Icon} />
            ))}
          </div>
        </Row>

        <Row label="work hours">
          <p className="font-medium">whenever summoned</p>
        </Row>

        <Row label="capabilities">
          <div className="space-y-2">
            <Meter label="professionalism" value={96} />
            <Meter label="patience" value={94} />
            <Meter label="friendly" value={92} />
            <Meter label="knows when to stop emailing" value={8} note="questionable" />
          </div>
        </Row>

        <Row label="catchphrases">
          <div className="space-y-1.5">
            <ReceivedBubble>on it boss</ReceivedBubble>
            <ReceivedBubble>i&apos;ll take it from here</ReceivedBubble>
            <ReceivedBubble>still on hold, will report back</ReceivedBubble>
          </div>
        </Row>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageDecor, Star } from "./decor";

const nav = [
  { to: "/", label: "home" },
  { to: "/about", label: "about" },
  { to: "/features", label: "features" },
  { to: "/support", label: "support" },
  { to: "/philosophy", label: "philosophy" },
  { to: "/roadmap", label: "roadmap" },
  { to: "/faq", label: "faq" },
  { to: "/plans", label: "plans" },
] as const;

function CornerStamp({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`stamp flex items-center gap-1 uppercase ${side === "right" ? "flex-row-reverse" : ""}`}
    >
      <span className="not-italic leading-3">
        personal
        <br />
        henchman
      </span>
      <Star className="w-3" />
    </div>
  );
}

export function MiloShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <PageDecor />
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6">
        <header className="flex items-start justify-between gap-4">
          <CornerStamp side="left" />
          <Link to="/" className="stamp text-base">
            @milo<span className="font-black not-italic">.dev</span>
          </Link>
          <CornerStamp side="right" />
        </header>

        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y-2 border-ink/70 py-2 text-xs font-semibold">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "link-underline text-ink" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main>{children}</main>

        <footer className="mt-24 border-t-2 border-ink/70 pt-5">
          <div className="flex items-end justify-between gap-4">
            <CornerStamp side="left" />
            <p className="stamp text-center text-[0.7rem] not-italic">
              professionally annoying since 2026
              <br />
              <span className="italic">@milo.dev</span>
            </p>
            <CornerStamp side="right" />
          </div>
        </footer>
      </div>
    </div>
  );
}

export function Plaque({ children }: { children: ReactNode }) {
  return (
    <div className="plaque relative mx-auto max-w-2xl text-center">
      <p className="plaque-line poster text-3xl sm:text-4xl">{children}</p>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="stamp flex items-center justify-center gap-2 text-center uppercase">
      <Star className="w-3" />
      {children}
      <Star className="w-3" />
    </p>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="poster max-w-3xl text-left text-4xl sm:text-6xl">{children}</h2>
  );
}

export function Lede({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <p
      className={`mt-6 max-w-2xl text-lg font-medium sm:text-xl ${
        align === "center" ? "mx-auto text-center" : "text-left"
      }`}
    >
      {children}
    </p>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 max-w-2xl space-y-4 text-left text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
      {children}
    </div>
  );
}

export function SectionHead({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      {kicker ? <p className="stamp uppercase text-blush-deep">{kicker}</p> : null}
      <h2 className="poster mt-2 text-left text-3xl sm:text-5xl">{title}</h2>
      {children ? <Body>{children}</Body> : null}
    </div>
  );
}

export function ChatLine({
  who,
  children,
  tone = "them",
}: {
  who: string;
  children: ReactNode;
  tone?: "them" | "milo";
}) {
  return (
    <div className="border-b-2 border-dotted border-ink/30 py-3 last:border-0">
      <p className={`stamp uppercase ${tone === "milo" ? "text-blush-deep" : "text-muted-foreground"}`}>
        {who}
      </p>
      <p className="mt-1 font-medium">{children}</p>
    </div>
  );
}

export function PaperCard({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <article className="card-paper p-6 transition-colors hover:bg-blush/20">
      {kicker ? <p className="stamp uppercase text-blush-deep">{kicker}</p> : null}
      <h3 className="mt-2 text-2xl">{title}</h3>
      <div className="mt-3 space-y-2 text-sm font-medium leading-relaxed">{children}</div>
    </article>
  );
}

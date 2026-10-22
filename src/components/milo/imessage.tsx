import type { ReactNode } from "react";

type Direction = "left" | "right";

function Bubble({
  from,
  children,
  direction,
}: {
  from: string;
  children: ReactNode;
  direction: Direction;
}) {
  const isRight = direction === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[78%] rounded-[1.25rem] px-4 py-2.5 text-sm leading-snug ${
          isRight
            ? "rounded-br-[0.3rem] bg-[#0a84ff] text-white"
            : "rounded-bl-[0.3rem] bg-[#3a3a3c] text-[#f2f2f7]"
        }`}
      >
        {!isRight && <p className="mb-0.5 text-[0.7rem] font-semibold text-[#98989f]">{from}</p>}
        {children}
      </div>
    </div>
  );
}

export type IMessageLine = {
  from: string;
  text: string;
  direction: Direction;
};

export function IMessageChat({
  lines,
  title,
}: {
  lines: IMessageLine[];
  title: string;
}) {
  return (
    <div className="w-full overflow-hidden rounded-[1.5rem] bg-black text-left shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between px-5 pt-3 text-[0.7rem] font-semibold text-white/90">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="text-[0.65rem]">5g</span>
          <span className="inline-block h-2.5 w-4 rounded-[0.2rem] border border-white/60" />
        </div>
      </div>
      <div className="flex flex-col items-center border-b border-white/10 pb-3 pt-1">
        <div className="mt-1 h-10 w-10 rounded-full bg-[#3a3a3c] text-center text-base font-bold leading-10 text-white">
          {title.charAt(0).toUpperCase()}
        </div>
        <p className="mt-1 text-xs font-semibold text-white">{title}</p>
      </div>
      <div className="space-y-1.5 px-3 py-4 sm:px-5">
        {lines.map((line, index) => {
          const previous = lines[index - 1];
          const next = lines[index + 1];
          const groupedWithPrevious =
            previous?.from === line.from && previous.direction === line.direction;
          const groupedWithNext = next?.from === line.from && next.direction === line.direction;
          return (
            <div key={`${line.from}-${index}`} className={groupedWithPrevious ? "" : "mt-2"}>
              <Bubble from={line.from} direction={line.direction}>
                {line.text}
              </Bubble>
              {!groupedWithNext && (
                <div className={`h-1 ${line.direction === "right" ? "text-right" : "text-left"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

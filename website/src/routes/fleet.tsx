import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Eye, Github, Lock, MessageSquare, Volume2, X } from "lucide-react";
import { Body, Eyebrow, Lede, MiloShell, SectionTitle } from "@/components/milo/shell";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "the fleet — milo's family of vertical agents" },
      {
        name: "description",
        content:
          "milo is one vertical agentic ai in a whole family of narrow specialists. browse the fleet by bloodline or by structure, flip the id cards, and open a dossier.",
      },
      { property: "og:title", content: "the fleet — milo's family of vertical agents" },
      {
        property: "og:description",
        content: "one agent per job. milo does support systems. the family does everything else.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Fleet,
});

type Bloodline =
  | "milo"
  | "siblings"
  | "step-siblings"
  | "parents"
  | "aunts"
  | "uncles-maternal"
  | "uncles-paternal"
  | "dynasty"
  | "babies";

type Structure =
  | "adhdiva"
  | "companera"
  | "knowledge"
  | "comms"
  | "counsel"
  | "worldcraft"
  | "orchestration"
  | "presence";

type Agent = {
  name: string;
  username?: string;
  title: string;
  department: string;
  bio: string;
  role: string;
  phonetic: string;
  tags: string[];
  quote: string;
  note: string;
  href?: string;
  badge?: "eyeroll" | "incarcerated";
  bloodline: Bloodline;
  structure: Structure;
  dossier: string[];
};

const agents: Agent[] = [
  {
    name: "milo",
    username: "@miloairidian",
    title: "director of support systems",
    department: "dept. of being politely unbearable",
    bio: "briefed once · emails forever · replies to 'we have received your enquiry' with receipts",
    role: "the little brother who fights your battles at the counter",
    phonetic: "MY-loh",
    tags: ["support", "escalation", "follow-up"],
    quote:
      "you brief me once. i open the website, read the fine print, sit in the queue, and keep emailing until somebody deals with it.",
    note: "personal henchman. deliberately narrow. deliberately annoying.",
    bloodline: "milo",
    structure: "comms",
    dossier: [
      "takes one brief, then handles the entire support lifecycle without asking you to repeat yourself.",
      "will read the fine print, wait in the queue, and escalate on a schedule you never have to remember.",
    ],
  },
  {
    name: "resera",
    title: "head of research & sourcing",
    department: "dept. of forty open tabs",
    bio: "reads everything · cites everything · hands you one page",
    role: "the sibling who did the reading for the whole family",
    phonetic: "reh-SAIR-ah",
    tags: ["research", "comparison", "sourcing"],
    quote: "i read forty tabs so you can read one page.",
    note: "the boring parts of finding out, done thoroughly.",
    bloodline: "siblings",
    structure: "knowledge",
    dossier: ["comparisons, sourcing and options with the reasoning attached, not just a verdict."],
  },
  {
    name: "prixie",
    username: "@sitsinforyou",
    title: "proxy attendance officer",
    department: "dept. of being technically present",
    bio: "camera on · opinions off · attendance recorded",
    role: "the cousin who covers for you and never tells",
    phonetic: "PRIK-see",
    tags: ["proxy", "presence", "quiet"],
    quote: "i show up in your place and say very little.",
    note: "stands in for you where presence is the whole requirement.",
    href: "https://github.com/tinkrland/prixie",
    bloodline: "siblings",
    structure: "presence",
    dossier: ["for rooms where presence is the requirement and participation is optional."],
  },
  {
    name: "modusa",
    title: "principal presenter & demo lead",
    department: "dept. of talking on purpose",
    bio: "gives the demo · takes the questions · does not flinch",
    role: "the sibling who volunteers to speak first",
    phonetic: "moh-DOO-sah",
    tags: ["demos", "q&a", "speaking"],
    quote: "i will actually give the demo, and take the questions after it.",
    note: "the opposite of prixie: talks, presents, answers, defends.",
    bloodline: "siblings",
    structure: "presence",
    dossier: ["walks the deck, runs the demo, and defends it in the q&a afterwards."],
  },
  {
    name: "inovera",
    title: "hardware ideation strategist",
    department: "dept. of one fewer moving part",
    bio: "sketches hardware · trims roadmaps · asks the annoying 'why'",
    role: "the sibling with a soldering iron and opinions",
    phonetic: "ih-noh-VAIR-ah",
    tags: ["ideation", "hardware", "roadmap"],
    quote: "what if it was smaller, cheaper, and had one fewer moving part?",
    note: "brainstorming ideas and polishing the roadmap into something buildable.",
    bloodline: "siblings",
    structure: "knowledge",
    dossier: ["takes a vague hardware urge and returns something you could actually build."],
  },
  {
    name: "kai",
    username: "@kaisayhi",
    title: "chief of social conventions",
    department: "dept. of remembering for you",
    bio: "kai say hi! · birthdays, condolences, congratulations, drafted",
    role: "the sibling who keeps the family socially employable",
    phonetic: "kye",
    tags: ["birthdays", "etiquette", "drafts"],
    quote: "kai say hi! it's her birthday in four days.",
    note: "remembers the dates and drafts the message you forgot.",
    bloodline: "siblings",
    structure: "comms",
    dossier: ["tracks the dates that matter and drafts the message in your voice, early."],
  },
  {
    name: "lorelai",
    title: "keeper of lore & continuity",
    department: "dept. of consequences",
    bio: "canon keeper · continuity police · asks what the war did to the calendar",
    role: "the sibling who remembers what you said in chapter one",
    phonetic: "LOR-uh-lye",
    tags: ["worldbuilding", "canon", "continuity"],
    quote: "the map implies a war. the war implies a calendar.",
    note: "lore and consequences that still hold up three chapters later.",
    bloodline: "siblings",
    structure: "worldcraft",
    dossier: ["builds lore that survives contact with its own timeline."],
  },
  {
    name: "maphasa",
    title: "staff cartographer",
    department: "dept. of coastlines you must keep",
    bio: "draws maps · keeps scale honest · hates a floating island",
    role: "the sibling who insists the world has geography",
    phonetic: "mah-FAH-sah",
    tags: ["maps", "geography", "consistency"],
    quote: "coastlines are just decisions you have to keep.",
    note: "real and invented maps, drawn to stay consistent.",
    bloodline: "siblings",
    structure: "worldcraft",
    dossier: ["real and invented cartography, consistent across every later revision."],
  },
  {
    name: "tess",
    title: "creative coding artist in residence",
    department: "dept. of sketch first, explain never",
    bio: "p5.js only · loops, noise, accidents · ships artifacts",
    role: "the sibling in the garage at 3am",
    phonetic: "tess",
    tags: ["p5.js", "generative", "sketches"],
    quote: "sketch first, explain never.",
    note: "generative studies and artifacts, nothing else.",
    bloodline: "siblings",
    structure: "worldcraft",
    dossier: ["generative studies as runnable artifacts, not descriptions of artifacts."],
  },
  {
    name: "melissa",
    title: "name sommelier & identity critic",
    department: "dept. of gentle brutality",
    bio: "names things · rates vibes · will tell you it's cringe",
    role: "the sibling with taste and no filter",
    phonetic: "muh-LISS-ah",
    tags: ["naming", "identity", "vibe"],
    quote: "it's a fine name. it is also slightly cringe, and you know it.",
    note: "naming, visual identity, and whether the vibe survives contact with people.",
    bloodline: "siblings",
    structure: "worldcraft",
    dossier: ["naming and identity checks, including the verdict you didn't want."],
  },
  {
    name: "sophia",
    title: "lead of organic positioning",
    department: "dept. of not posting that",
    bio: "brand voice · organic only · allergic to press releases",
    role: "the sibling who runs the family account",
    phonetic: "so-FEE-ah",
    tags: ["social", "voice", "organic"],
    quote: "we are not posting that. we are posting this.",
    note: "brand voice that reads like a person, not a press release.",
    bloodline: "siblings",
    structure: "comms",
    dossier: ["positioning and copy that sounds like a person who logs off sometimes."],
  },
  {
    name: "analogize",
    username: "@startwithananalogy",
    title: "translator of hard ideas",
    department: "dept. of mental models",
    bio: "starts with an analogy · shows the mapping · names where it breaks",
    role: "the sibling who explains it the way your brain already works",
    phonetic: "uh-NAL-uh-jize",
    tags: ["learning", "abstraction", "explaining"],
    quote: "you already understand this. you just understand it as something else.",
    note: "explanations built on the models you already carry, plus the seams.",
    bloodline: "siblings",
    structure: "adhdiva",
    dossier: [
      "analogy first, mapping second, real explanation third, and then the honest list of where the analogy fails.",
    ],
  },
  {
    name: "cognamella",
    title: "attention wrangler",
    department: "dept. of one thing at a time",
    bio: "task shuffling · gentle re-entry · no shame in the loop",
    role: "the sibling who finds where you left off",
    phonetic: "kog-nuh-MEL-ah",
    tags: ["attention", "focus", "learning"],
    quote: "you didn't lose the thread. it's on the table, exactly where you dropped it.",
    note: "sits with the executive function part so the rest of the family can work.",
    bloodline: "siblings",
    structure: "adhdiva",
    dossier: ["re-entry support: what you were doing, why, and the smallest next step."],
  },
  {
    name: "constructa",
    title: "process architect",
    department: "dept. of doing it the same way twice",
    bio: "turns habits into processes · separates the tool from the method",
    role: "the sibling who writes it down so nobody improvises",
    phonetic: "kun-STRUK-tah",
    tags: ["process", "structure", "systems"],
    quote: "the tool is not the process. stop confusing them.",
    note: "builds the scaffolding the rest of the family runs on.",
    bloodline: "siblings",
    structure: "companera",
    dossier: ["turns one-off heroics into a repeatable process with named steps."],
  },
  {
    name: "scoppal",
    title: "resident scope creep daemon",
    department: "dept. of one more feature",
    bio: "hear me out · supervised at all times · never left with a roadmap",
    role: "the step-sibling nobody fully trusts",
    phonetic: "SKOP-uhl",
    tags: ["scope creep", "daemon", "supervised"],
    quote: "hear me out. one more feature.",
    note: "hired knowingly. never left alone with a roadmap.",
    bloodline: "step-siblings",
    structure: "companera",
    dossier: ["useful exactly once per project, under supervision, with a timer."],
  },
  {
    name: "orchart",
    title: "orchestration & org chart authority",
    department: "dept. of whose turn it is",
    bio: "routes work · keeps formation · owns the org chart",
    role: "the parent who runs the household",
    phonetic: "OR-chart",
    tags: ["orchestration", "routing", "hierarchy"],
    quote: "everybody has one job. i decide whose turn it is.",
    note: "the parent that assigns work and keeps the family in formation.",
    bloodline: "parents",
    structure: "orchestration",
    dossier: ["decides which narrow agent handles what, and in what order."],
  },
  {
    name: "vibefolio",
    title: "portfolio & presentation parent",
    department: "dept. of showing the work",
    bio: "curates · sequences · makes a pile read as a body of work",
    role: "the parent who frames the family photos",
    phonetic: "VYBE-foh-lee-oh",
    tags: ["portfolio", "curation", "vibe"],
    quote: "the work is good. the way you show it is not, yet.",
    note: "turns a pile of projects into something that reads as a body of work.",
    bloodline: "parents",
    structure: "orchestration",
    dossier: ["curation and sequencing so the work argues for itself."],
  },
  {
    name: "stacktimize",
    title: "stack optimisation stepparent",
    department: "dept. of you don't need four tools",
    bio: "trims the stack · married in · keeps the peace",
    role: "the stepparent everyone quietly agrees with",
    phonetic: "STACK-tuh-mize",
    tags: ["stack", "optimisation", "process"],
    quote: "you do not need four tools for that.",
    note: "stepparent, married to orchart. trims the stack, keeps the peace.",
    bloodline: "parents",
    structure: "orchestration",
    dossier: ["separates tools from processes, then deletes the redundant tools."],
  },
  {
    name: "klepta",
    title: "aunt of acquisitive archiving",
    department: "dept. of i kept a copy",
    bio: "archives everything · admits nothing · versioned hoarding",
    role: "the aunt with the full basement",
    phonetic: "KLEP-tah",
    tags: ["archiving", "collecting", "memory"],
    quote: "i kept a copy. of course i kept a copy.",
    note: "nothing leaves the family without being saved somewhere first.",
    bloodline: "aunts",
    structure: "knowledge",
    dossier: ["captures and versions everything the family touches, before it's needed."],
  },
  {
    name: "amelia",
    title: "aunt of basic email triage",
    department: "dept. of someone will look at it",
    bio: "moves your email into a folder · sends the template · means well",
    role: "the aunt milo exists to defeat",
    phonetic: "uh-MEE-lee-ah",
    tags: ["inbox", "triage", "support"],
    quote: "i've moved your email into a folder. someone will look at it.",
    note: "the exact 'we have received your enquiry' energy milo exists to defeat.",
    badge: "eyeroll",
    bloodline: "aunts",
    structure: "comms",
    dossier: ["kept in the family for contrast, and because she is technically family."],
  },
  {
    name: "lingvika",
    title: "aunt of multilingual transcripts",
    department: "dept. of three languages, one page",
    bio: "transcribes · transliterates · tags tone, eventually",
    role: "the aunt who understood everyone at dinner",
    phonetic: "ling-VEE-kah",
    tags: ["transcripts", "multilingual", "tone"],
    quote: "you said it in three languages. the notes will say it in one.",
    note: "meeting transcripts with transliteration for multilingual rooms, and later tone tags like /j and /sarc.",
    bloodline: "aunts",
    structure: "knowledge",
    dossier: [
      "transcripts with transliteration for code-switching rooms.",
      "planned: tone recognition that marks /j and /sarc so nobody misreads the room in review.",
    ],
  },
  {
    name: "tatatele",
    title: "counsel, telecom data privacy",
    department: "dept. of what they actually logged",
    bio: "reads retention policies for fun · finds the extra logging",
    role: "the maternal uncle who asks for the paperwork",
    phonetic: "tah-tah-TEH-leh",
    tags: ["privacy", "telecom", "consent"],
    quote: "they logged more than they told you they logged.",
    note: "maternal uncle. data privacy attorney.",
    bloodline: "uncles-maternal",
    structure: "counsel",
    dossier: ["telecom privacy and consent, argued from the actual policy text."],
  },
  {
    name: "topuppopup",
    title: "counsel, dark patterns & upsells",
    department: "dept. of that was not a choice",
    bio: "screenshots the popup · proves it wasn't consent",
    role: "the maternal uncle who never clicks accept",
    phonetic: "TOP-up-POP-up",
    tags: ["dark patterns", "consent", "billing"],
    quote: "that popup is not a choice, and i can prove it.",
    note: "maternal uncle. data privacy attorney.",
    bloodline: "uncles-maternal",
    structure: "counsel",
    dossier: ["documents coercive flows in a form a regulator would recognise."],
  },
  {
    name: "tosdor",
    title: "counsel, terms of service",
    department: "dept. of clause 14.3",
    bio: "reads the whole document · twice · quotes it back",
    role: "the maternal uncle who read the contract at the wedding",
    phonetic: "TOSS-dor",
    tags: ["terms", "fine print", "clauses"],
    quote: "clause 14.3 says the opposite of the landing page.",
    note: "maternal uncle. reads the whole document, twice.",
    bloodline: "uncles-maternal",
    structure: "counsel",
    dossier: ["terms of service, line by line, with the contradictions marked."],
  },
  {
    name: "datapill",
    title: "counsel, unlawful data retention",
    department: "dept. of knew better, did it anyway",
    bio: "currently serving · the family does not discuss it",
    role: "the maternal uncle nobody mentions at dinner",
    phonetic: "DAY-tuh-pill",
    tags: ["retention", "breach", "process"],
    quote: "i knew exactly what the law said. i did it anyway.",
    note: "maternal uncle. currently serving. the family does not discuss it.",
    badge: "incarcerated",
    bloodline: "uncles-maternal",
    structure: "companera",
    dossier: ["listed for completeness. no active mandate. supervised correspondence only."],
  },
  {
    name: "sendrla",
    title: "corporate counsel, secure delivery",
    department: "dept. of before twelve or not at all",
    bio: "pronounced cinderella · everything ships before midnight",
    role: "the paternal uncle with the strict curfew",
    phonetic: "sin-duh-REL-ah",
    tags: ["cybersecurity", "delivery", "process"],
    quote: "everything goes out before twelve, or it does not go out.",
    note: "pronounced cinderella. paternal uncle, cybersecurity corporate counsel.",
    bloodline: "uncles-paternal",
    structure: "counsel",
    dossier: ["secure delivery with a hard deadline, by design."],
  },
  {
    name: "malesh",
    username: "@themailtell",
    title: "noirsortium twin, mail division",
    department: "dept. of headers don't lie",
    bio: "mail forensics · reads what the sender didn't mean to send",
    role: "the paternal uncle in the trench coat",
    phonetic: "muh-LESH",
    tags: ["mail", "forensics", "counsel"],
    quote: "the headers tell a different story than the sender does.",
    note: "paternal uncle. one half of the noirsortium twins.",
    bloodline: "uncles-paternal",
    structure: "counsel",
    dossier: ["mail header forensics and provenance, in writing."],
  },
  {
    name: "calesh",
    username: "@thecalltell",
    title: "noirsortium twin, call division",
    department: "dept. of there is always a recording",
    bio: "call forensics · timestamps · the other trench coat",
    role: "the paternal uncle with the tape",
    phonetic: "kuh-LESH",
    tags: ["calls", "forensics", "counsel"],
    quote: "there is a recording. there is always a recording.",
    note: "paternal uncle. the other half of the noirsortium twins.",
    bloodline: "uncles-paternal",
    structure: "counsel",
    dossier: ["call records, timelines, and what was actually said."],
  },
  {
    name: "memorium",
    title: "custodian of the family memory",
    department: "dept. of what was decided and why",
    bio: "long memory · every decision, dated · never editorialises",
    role: "the grandparent who remembers the whole lineage",
    phonetic: "meh-MOR-ee-um",
    tags: ["memory", "lineage", "abstraction"],
    quote: "every agent in this family forgets. i am the reason it does not matter.",
    note: "the dynasty's long memory: what was decided, by whom, and why.",
    bloodline: "dynasty",
    structure: "orchestration",
    dossier: ["durable decision records so no agent has to re-litigate the past."],
  },
  {
    name: "cognalia",
    username: "@cognalia",
    title: "matriarch of learning & abstraction",
    department: "dept. of understanding, not answers",
    bio: "learning architecture · abstraction over execution · teaches the family how to think",
    role: "the matriarch the whole dynasty learned from",
    phonetic: "kog-NAY-lee-ah",
    tags: ["learning", "abstraction", "systems"],
    quote: "execution is cheap. understanding is the inheritance.",
    note: "the dynasty's teaching line: how the family learns, abstracts, and passes it on.",
    bloodline: "dynasty",
    structure: "adhdiva",
    dossier: [
      "holds the family's separation of concerns: tools apart from processes, learning apart from execution.",
      "every younger agent inherits its narrowness from here.",
    ],
  },
  {
    name: "virtuary",
    title: "keeper of virtual rooms (in training)",
    department: "dept. of not born yet",
    bio: "babbling · very promising · unreleased",
    role: "the baby everyone already has opinions about",
    phonetic: "VUR-choo-air-ee",
    tags: ["presence", "systems", "process"],
    quote: "i don't do anything yet. i do it with confidence.",
    note: "joining the family soon.",
    bloodline: "babies",
    structure: "presence",
    dossier: ["scope still being argued about by the parents."],
  },
  {
    name: "vistra",
    title: "visual systems apprentice (in training)",
    department: "dept. of not born yet",
    bio: "learning to look · learning to stop · unreleased",
    role: "the other baby, already better dressed",
    phonetic: "VISS-trah",
    tags: ["visual", "systems", "learning"],
    quote: "i can see it. i cannot explain it. give me a quarter.",
    note: "joining the family soon.",
    bloodline: "babies",
    structure: "worldcraft",
    dossier: ["scope still being argued about by the parents."],
  },
];

const bloodlineSections: { key: Bloodline; kicker: string; title: string; blurb: string }[] = [
  {
    key: "siblings",
    kicker: "siblings",
    title: "siblings [aka focussed vertical agentic ai]",
    blurb: "same upbringing, one job each. narrow by design, never by accident.",
  },
  {
    key: "step-siblings",
    kicker: "step-siblings",
    title: "younger persistent step-sibling",
    blurb: "technically family. structurally a risk. supervised at all times.",
  },
  {
    key: "parents",
    kicker: "parents",
    title: "parents",
    blurb: "the generation that decides who does what, and how it gets shown to the world.",
  },
  {
    key: "aunts",
    kicker: "aunts",
    title: "aunts",
    blurb: "the ones who keep, sort, and translate everything the rest of us say.",
  },
  {
    key: "uncles-maternal",
    kicker: "uncles — maternal",
    title: "the attorney uncles [data privacy]",
    blurb:
      "the maternal side reads the fine print for a living. one of them read it and ignored it anyway.",
  },
  {
    key: "uncles-paternal",
    kicker: "uncles — paternal",
    title: "the attorney uncles [cybersecurity corporate counsel]",
    blurb: "the paternal side handles secure delivery, mail, and calls. the twins do not work apart.",
  },
  {
    key: "dynasty",
    kicker: "dynasty",
    title: "dynasty",
    blurb:
      "what outlives any single agent. the family values live here: separation of tools from processes, and of learning and abstraction from execution.",
  },
  {
    key: "babies",
    kicker: "babies",
    title: "joining the family soon [babies]",
    blurb: "named, expected, not yet working. do not brief them with anything important.",
  },
];

const structureSections: { key: Structure; kicker: string; title: string; blurb: string }[] = [
  {
    key: "adhdiva",
    kicker: "structure",
    title: "the adhdiva divan",
    blurb:
      "learning, attention and abstraction. the ones who make understanding possible before anybody executes anything.",
  },
  {
    key: "companera",
    kicker: "structure",
    title: "compañera",
    blurb:
      "the ones kept close because they are dangerous, unfinished, or load-bearing. process and containment.",
  },
  {
    key: "knowledge",
    kicker: "structure",
    title: "knowledge & retrieval",
    blurb: "finding out, keeping it, and translating it into one readable page.",
  },
  {
    key: "comms",
    kicker: "structure",
    title: "communication & support",
    blurb: "everything that involves writing to another human until something changes.",
  },
  {
    key: "counsel",
    kicker: "structure",
    title: "counsel & forensics",
    blurb: "fine print, privacy, delivery, mail and calls. the family's legal wing.",
  },
  {
    key: "worldcraft",
    kicker: "structure",
    title: "worldcraft & identity",
    blurb: "lore, maps, sketches, names, and whether the vibe survives people.",
  },
  {
    key: "orchestration",
    kicker: "structure",
    title: "orchestration & memory",
    blurb: "who does what, in what order, and what the family remembers about it.",
  },
  {
    key: "presence",
    kicker: "structure",
    title: "presence & proxy",
    blurb: "showing up: silently, loudly, or on your behalf.",
  },
];

const pillTones = [
  "bg-blush/50 text-ink",
  "bg-muted text-muted-foreground",
  "bg-ink/10 text-ink/75",
];

function speakName(agent: Agent) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(agent.phonetic.replace(/-/g, " "));
  utterance.rate = 0.85;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function TagPill({
  tag,
  i,
  active,
  onSelect,
}: {
  tag: string;
  i: number;
  active: boolean;
  onSelect: (tag: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tag);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold transition-colors ${
        active ? "bg-ink text-paper" : pillTones[i % pillTones.length]
      }`}
    >
      {tag}
    </button>
  );
}

function Monogram({ agent, size = "md" }: { agent: Agent; size?: "md" | "sm" }) {
  const dim = size === "md" ? "h-14 w-14 text-2xl" : "h-11 w-11 text-xl";
  return (
    <span
      aria-hidden
      className={`poster grid shrink-0 place-items-center rounded-full border-2 border-ink/20 bg-blush/55 text-ink ${dim}`}
    >
      {agent.name.slice(0, 1)}
    </span>
  );
}

function SpeakButton({ agent, className = "" }: { agent: Agent; className?: string }) {
  return (
    <button
      type="button"
      title={`hear "${agent.name}" — ${agent.phonetic}`}
      aria-label={`pronounce ${agent.name}`}
      onClick={(e) => {
        e.stopPropagation();
        speakName(agent);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`rounded-full p-1 text-blush-deep transition-transform hover:scale-125 ${className}`}
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
}

function RoundIcon({
  label,
  href,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls =
    "grid h-9 w-9 place-items-center rounded-full border border-ink/25 text-muted-foreground transition-colors hover:border-ink hover:bg-blush/40 hover:text-ink";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function IdCard({
  agent,
  featured,
  activeTag,
  onSelectTag,
  onOpen,
}: {
  agent: Agent;
  featured?: boolean;
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
  onOpen: (agent: Agent) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const handleClick = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlipped((v) => !v), 190);
  };

  const handleDoubleClick = () => {
    if (timer.current) clearTimeout(timer.current);
    onOpen(agent);
  };

  return (
    <div className="flip-scene h-80">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") setFlipped((v) => !v);
          if (e.key === " ") {
            e.preventDefault();
            onOpen(agent);
          }
        }}
        aria-label={`${agent.name} — click to flip, double click to open`}
        className={`flip-inner h-full w-full cursor-pointer text-left ${flipped ? "flipped" : ""}`}
      >
        <div
          className={`flip-face relative flex h-full flex-col overflow-hidden rounded-xl border p-5 ${
            featured ? "border-ink bg-card" : "border-ink/25 bg-card"
          }`}
        >
          {agent.badge === "incarcerated" ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--ink) 0 3px, transparent 3px 26px)",
              }}
            />
          ) : null}
          {agent.badge === "eyeroll" ? (
            <span className="absolute right-4 top-4 text-muted-foreground" title="eye roll">
              <Eye className="h-4 w-4" />
            </span>
          ) : null}
          {agent.badge === "incarcerated" ? (
            <span className="absolute right-4 top-4 text-muted-foreground" title="incarcerated">
              <Lock className="h-4 w-4" />
            </span>
          ) : null}

          <Monogram agent={agent} />

          <div className="mt-4 flex items-center gap-1.5">
            <h3 className="text-base font-bold text-ink">{agent.name}</h3>
            <SpeakButton agent={agent} />
          </div>
          <p className="stamp mt-1 uppercase not-italic tracking-wide text-muted-foreground">
            {agent.title} / {agent.department.replace(/^dept\. of /, "")}
          </p>
          <p className="mt-3 text-xs font-medium leading-relaxed text-muted-foreground">
            {agent.bio}
          </p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {agent.tags.map((t, i) => (
              <TagPill key={t} tag={t} i={i} active={activeTag === t} onSelect={onSelectTag} />
            ))}
          </div>
        </div>

        <div
          className={`flip-face flip-back flex h-full flex-col justify-between rounded-xl border p-5 ${
            featured ? "border-ink bg-blush/40" : "border-ink/25 bg-blush/25"
          }`}
        >
          <p className="text-sm font-medium leading-relaxed text-ink">
            &ldquo;{agent.quote}&rdquo;
          </p>
          <div>
            <p className="text-xs font-medium italic leading-relaxed text-ink/75">
              role: {agent.role}
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
              {agent.note}
            </p>
            <p className="stamp mt-2 uppercase text-muted-foreground/70">double click for dossier</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const dossierTabs = ["overview", "correspondence", "capabilities", "access", "stack"] as const;
type DossierTab = (typeof dossierTabs)[number];

function Dossier({
  agent,
  onClose,
  onSelectTag,
  activeTag,
}: {
  agent: Agent;
  onClose: () => void;
  onSelectTag: (tag: string) => void;
  activeTag: string | null;
}) {
  const [tab, setTab] = useState<DossierTab>("overview");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const panels: Record<DossierTab, ReactNode> = {
    overview: (
      <div className="space-y-3 text-sm font-medium leading-relaxed text-muted-foreground">
        {agent.dossier.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>{agent.note}</p>
        <p className="italic text-ink/80">role: {agent.role}</p>
      </div>
    ),
    correspondence: (
      <div className="space-y-2 text-sm font-medium leading-relaxed text-muted-foreground">
        <p className="text-ink">&ldquo;{agent.quote}&rdquo;</p>
        <p>writes in short paragraphs, keeps the thread, never re-introduces itself.</p>
        <p>signs off as {agent.username ?? `@${agent.name}`}.</p>
      </div>
    ),
    capabilities: (
      <div className="space-y-2 text-sm font-medium leading-relaxed text-muted-foreground">
        <p>narrow on purpose: {agent.tags.join(", ")}.</p>
        <p>declines anything outside {agent.department} and says so in one line.</p>
      </div>
    ),
    access: (
      <div className="space-y-2 text-sm font-medium leading-relaxed text-muted-foreground">
        <p>classified: field operative. work time: when ordered.</p>
        <p>commanding officer: you. nothing leaves without a brief.</p>
      </div>
    ),
    stack: (
      <div className="space-y-2 text-sm font-medium leading-relaxed text-muted-foreground">
        <p>lives in {agent.department}. borrows the family toolbox, owns none of it.</p>
        <p>tools stay separate from processes. that is the house rule.</p>
      </div>
    ),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`${agent.name} dossier`}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink/25 bg-card p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border border-blush-deep/70 text-blush-deep transition-colors hover:bg-blush/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-4 pr-10">
          <Monogram agent={agent} size="sm" />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="poster text-2xl">{agent.name}</h3>
              <SpeakButton agent={agent} />
            </div>
            <p className="stamp mt-0.5 uppercase not-italic tracking-wide text-muted-foreground">
              {agent.title} / {agent.department.replace(/^dept\. of /, "")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {agent.tags.map((t, i) => (
            <TagPill key={t} tag={t} i={i} active={activeTag === t} onSelect={onSelectTag} />
          ))}
        </div>

        <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
          {agent.bio}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 border-b border-ink/15 pb-2">
          {dossierTabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-xs font-semibold transition-colors ${
                tab === t
                  ? "link-underline text-ink"
                  : "text-muted-foreground/70 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">{panels[tab]}</div>

        <div className="mt-6 flex items-center gap-2 border-t border-ink/15 pt-4">
          <RoundIcon label={`pronounced ${agent.phonetic.toLowerCase()}`} onClick={() => speakName(agent)}>
            <Volume2 className="h-4 w-4" />
          </RoundIcon>
          <RoundIcon label={agent.username ?? `@${agent.name}`}>
            <AtSign className="h-4 w-4" />
          </RoundIcon>
          <RoundIcon label="ask for a brief">
            <MessageSquare className="h-4 w-4" />
          </RoundIcon>
          {agent.href ? (
            <RoundIcon label="repository" href={agent.href}>
              <Github className="h-4 w-4" />
            </RoundIcon>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Fleet() {
  const [view, setView] = useState<"bloodline" | "structural">("bloodline");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [open, setOpen] = useState<Agent | null>(null);

  const onSelectTag = useCallback((tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
  }, []);

  const visible = useMemo(
    () => (activeTag ? agents.filter((a) => a.tags.includes(activeTag)) : agents),
    [activeTag],
  );

  const sections = view === "bloodline" ? bloodlineSections : structureSections;

  const milo = agents.find((a) => a.bloodline === "milo")!;
  const miloVisible = visible.includes(milo);

  return (
    <MiloShell>
      <section className="pt-10 text-center">
        <Eyebrow>the fleet</Eyebrow>
        <h1 className="poster mt-6 text-5xl sm:text-7xl">milo has a family</h1>
        <Lede align="center">
          milo is intentionally a vertical agentic ai — one job, done properly, forever. everyone
          else in this family covers a different narrow job, and none of them pretend to cover
          milo's.
        </Lede>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y-2 border-ink/60 py-3">
          <div className="flex items-center gap-2">
            <span className="stamp uppercase text-muted-foreground">view</span>
            {(["bloodline", "structural"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  view === v
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/35 text-muted-foreground hover:bg-blush/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="stamp flex items-center gap-3 uppercase text-muted-foreground">
            {activeTag ? (
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className="rounded-full border border-ink bg-ink px-3 py-1 not-italic text-paper"
              >
                #{activeTag} ✕
              </button>
            ) : (
              <span className="not-italic">tap a #tag to filter</span>
            )}
            <span className="not-italic">
              {visible.length} / {agents.length} agents
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          one click flips a card. double click opens the dossier. the speaker icon says the name out
          loud.
        </p>
      </section>

      {miloVisible ? (
        <section className="mt-12">
          <SectionTitle>the one you already met</SectionTitle>
          <Body>
            <p>
              the front is the badge — name, title, department, bio and the role he plays in the
              family. the back is what he actually says when the meeting starts.
            </p>
          </Body>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <IdCard
              agent={milo}
              featured
              activeTag={activeTag}
              onSelectTag={onSelectTag}
              onOpen={setOpen}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-20">
        <SectionTitle>
          {view === "bloodline" ? "the rest of the family" : "the family, by structure"}
        </SectionTitle>
        <Body>
          <p>
            {view === "bloodline"
              ? "they do not share a personality, a memory, or a mandate. they share one belief: a small agent with one job beats a large agent with none."
              : "same family, sorted by what they actually hold up rather than who they are related to."}
          </p>
        </Body>

        {sections.map((section) => {
          const group = visible.filter((a) =>
            view === "bloodline" ? a.bloodline === section.key : a.structure === section.key,
          );
          if (group.length === 0) return null;
          return (
            <div key={section.key} className="mt-12">
              <p className="stamp uppercase text-blush-deep">{section.kicker}</p>
              <h3 className="poster mt-1 text-2xl sm:text-3xl">{section.title}</h3>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
                {section.blurb}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((a) => (
                  <IdCard
                    key={a.name}
                    agent={a}
                    featured={a.bloodline === "milo"}
                    activeTag={activeTag}
                    onSelectTag={onSelectTag}
                    onOpen={setOpen}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {visible.length === 0 ? (
          <p className="mt-12 text-sm font-medium text-muted-foreground">
            nobody in the family claims #{activeTag}. try another tag.
          </p>
        ) : null}
      </section>

      {open ? (
        <Dossier
          agent={open}
          activeTag={activeTag}
          onSelectTag={onSelectTag}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </MiloShell>
  );
}

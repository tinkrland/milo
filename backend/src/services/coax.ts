// the coax engine (milo, oct 22 2026): most support walls are not
// humans, they are the company's own ai agent, and the job is not to
// shout at it, it is to keep the conversation honest until a human
// takes it.
//
// the shape of every ai support agent, observed: it answers fast and
// generic, it marks things solved on its own, it has a human behind a
// phrase ("talk to a person", "not helpful"), and it points at other
// channels when cornered ("email us at", "submit a request at").
// milo's loop is a state machine, calm at every step:
//
//   explain -> bot_answer -> solved? -> done
//                          -> not_solved -> insist
//                          -> (3 insists) -> demand_human
//                          -> human_joined -> handoff (the whole story,
//                             one message, so the human never asks
//                             what the bot already asked)
//                          -> stonewall -> bounce (the pointer the bot
//                             named becomes the mission's next door)
//
// pure halves only: the transport is the chat-widget walk's problem.
// the lines are the landing page's voice: short, specific, no
// begging, no threats.

export interface CoaxState {
  turn: number;
  explained: boolean;
  insistentTurns: number;
  humanJoined: boolean;
  handoffSent: boolean;
  demandedHuman: boolean;
}

export const COAX_MAX_INSISTS = 3;

export function freshCoax(): CoaxState {
  return { turn: 0, explained: false, insistentTurns: 0, humanJoined: false, handoffSent: false, demandedHuman: false };
}

// does the bot's answer address the actual problem? the honest test
// is keyword overlap between the answer and the problem statement,
// plus the closure phrases agents use to end conversations on their
// own. an answer that says "solved" while naming none of the problem
// is a form letter, and milo says so politely.
export function isAnswerRelevant(answer: string, problem: string): boolean {
  const stop = new Set([
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "on",
    "for", "it", "this", "that", "with", "and", "or", "your", "you", "we",
    "i", "my", "me", "not", "be", "have", "has", "when", "if", "at", "by",
  ]);
  const words = (s: string) =>
    [...new Set((s.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 3 && !stop.has(w)))];
  const problemWords = words(problem);
  if (!problemWords.length) return true; // nothing to overlap: accept
  const answerWords = new Set(words(answer));
  const hits = problemWords.filter((w) => answerWords.has(w)).length;
  return hits >= Math.ceil(problemWords.length / 3);
}

// the closure phrases: an agent ending the chat "for you", on its own.
const CLOSURE = /mark(ed|ing)? (this|it|your (ticket|case)) (as )?(solved|resolved)|is there anything else|did (this|that) (help|solve|answer)/i;

export function isFormLetterClosure(text: string): boolean {
  return CLOSURE.test(text || "");
}

// the pointer: when the bot names another door, that door is the
// mission's next channel. email addresses, urls, discord invites.
export interface BouncePointer {
  channel: "email" | "browser" | "discord";
  target: string;
  note: string;
}

export function findChannelPointer(text: string): BouncePointer | null {
  const mail = (text || "").match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  if (mail) return { channel: "email", target: mail[0], note: `the agent named ${mail[0]}` };
  const url = (text || "").match(/https?:\/\/[^\s)"'>]+/);
  if (url) {
    const t = url[0];
    if (/discord\.(gg|com\/invite)/.test(t)) {
      return { channel: "discord", target: t, note: `the agent named the support server: ${t}` };
    }
    return { channel: "browser", target: t, note: `the agent named a page: ${t}` };
  }
  return null;
}

export type CoaxAction =
  | { kind: "explain"; line: string }
  | { kind: "insist"; line: string }
  | { kind: "demand_human"; line: string }
  | { kind: "handoff"; line: string }
  | { kind: "watch"; line: "" } // waiting: nothing to send
  | { kind: "bounce"; line: ""; pointer: BouncePointer }
  | { kind: "done"; line: "" };

// one turn of the loop. inputs: the state, the problem, the attempts,
// and the latest incoming message (bot answer, human hello, or the
// stonewall silence). the returned action is the next line milo sends
// (or the bounce, or done). the state is returned updated; the caller
// persists it on the mission's thread.
export function nextCoaxTurn(
  state: CoaxState,
  problem: string,
  attempts: string[],
  incoming: string,
): { action: CoaxAction; state: CoaxState } {
  const s: CoaxState = { ...state, turn: state.turn + 1 };
  const inc = incoming || "";

  // the first message of the loop is the explain: the whole problem,
  // the attempts, the question. nothing coax-y happens before it.
  if (!s.explained) {
    s.explained = true;
    return { action: { kind: "explain", line: explainLine(problem, attempts) }, state: s };
  }

  // a human in the room changes everything: the story, once, whole.
  const human = /my name is|speaking with|human agent|support (agent|specialist|engineer)|connecting you|an agent will|real person/i.test(inc) && !/ai agent|virtual assistant/i.test(inc);
  if (human || s.humanJoined) {
    s.humanJoined = true;
    if (!s.handoffSent) {
      s.handoffSent = true;
      return {
        action: { kind: "handoff", line: composeHandoff(problem, attempts) },
        state: s,
      };
    }
    return { action: { kind: "watch", line: "" }, state: s };
  }

  // stonewall: the agent went quiet or closed the chat "for you".
  // after three insistent turns the pointer (if any) is the next door;
  // without one the loop ends honestly, not in circles.
  if (!inc || isFormLetterClosure(inc)) {
    if (s.insistentTurns >= COAX_MAX_INSISTS) {
      const pointer = findChannelPointer(inc);
      if (pointer) return { action: { kind: "bounce", line: "", pointer }, state: s };
      if (!s.demandedHuman) {
        s.demandedHuman = true;
        return { action: { kind: "demand_human", line: demandHumanLine(problem) }, state: s };
      }
      return { action: { kind: "done", line: "" }, state: s };
    }
    s.insistentTurns++;
    return { action: { kind: "insist", line: insistLine(problem, s.insistentTurns) }, state: s };
  }

  // a bot answer: relevant solves, irrelevant insists, and after the
  // third round milo asks for the human directly.
  if (isAnswerRelevant(inc, problem)) {
    return { action: { kind: "done", line: "" }, state: s };
  }
  if (s.insistentTurns >= COAX_MAX_INSISTS) {
    return { action: { kind: "demand_human", line: demandHumanLine(problem) }, state: s };
  }
  s.insistentTurns++;
  return { action: { kind: "insist", line: insistLine(problem, s.insistentTurns) }, state: s };
}

// the first message of any coax: the whole problem, the attempts, the
// question. the bot never gets to ask "have you tried".
export function explainLine(problem: string, attempts: string[]): string {
  const tried = attempts.length ? ` already tried: ${attempts.join("; ")}.` : "";
  return `${problem}${tried} what is the actual fix?`;
}

function insistLine(problem: string, n: number): string {
  const shapes = [
    `that does not answer the question. ${problem} what is the actual fix?`,
    `i have explained the problem twice now. ${problem} can you answer it specifically?`,
    `this is the third time i am writing the same problem: ${problem}`,
  ];
  return shapes[Math.min(n - 1, shapes.length - 1)];
}

function demandHumanLine(problem: string): string {
  return `the automated answers are not addressing this. please connect me with a human agent. the problem, again, for them: ${problem}`;
}

// the handoff: the whole story in one message so the human does not
// re-ask what the bot already "solved". this is the one long message
// milo sends in a support chat, and it is still no longer than it has
// to be.
export function composeHandoff(problem: string, attempts: string[]): string {
  const tried = attempts.length ? `already tried: ${attempts.join("; ")}.` : "nothing has been tried yet.";
  return [
    `hi, i am milo, writing on behalf of the account holder.`,
    `the problem: ${problem}`,
    tried,
    `the automated assistant could not address it. the ticket number, if one exists, is in this conversation above.`,
  ].join(" ");
}

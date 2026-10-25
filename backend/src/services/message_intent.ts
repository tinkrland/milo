// what a message is FOR, not what it says. milo knows the
// difference, anne's list:
//
//   support_request     something is broken, an outcome is owed
//   capability_question whether something can be done with it
//   resolution_method   a method of resolution rides in the message,
//                       one the boss can take
//   clarification      they need a fact he has
//   confirmation        a receipt, a status: no action inside it
//
// the same words mean different things by intent: "you can use the
// api export" from support is a path offered, but "can i use the
// api export with this plan?" from the boss is a question to get
// answered, not a case to be filed. the classifier names which is
// which, and the action mapping says what milo does about it.
//
// v2, grown against a 295-message corpus synthesized on adaption
// labs (docs/research/intent-corpus.md has the provenance). the
// orderings the corpus taught:
//
//   1. a question for the boss rides even when it names his errors
//      ("could you send the error code from the failed sync" is
//      a clarification, not a case)
//   2. a receipt beats broken words inside it ("ticket solved:
//      the currency error has been corrected" is a receipt, and
//      a deployed fix is done, not a path: "we've deployed the
//      patch, please try refreshing" asks him to verify, not to
//      resolve)
//   3. a method he can take still beats the broken words around
//      it, but a failed attempt is not a method: "every time i
//      try to upload it crashes" is a case, not an instruction
//   4. broken beats incidental capability clauses ("the export
//      keeps failing, can i get the data another way" is a
//      support request)
//   5. a statement of fact is the honest default, never a guess
//      dressed as knowledge

export type MessageIntent =
  | "support_request"
  | "capability_question"
  | "resolution_method"
  | "clarification"
  | "confirmation";

export interface IntentVerdict {
  intent: MessageIntent;
  /** the words that fired, quoted, so the boss can check the read */
  signals: string[];
  /** the question asked or the method offered, in their own words */
  salient: string | null;
}

// they need a fact he has: the case-detail questions support asks
// before anything can move. checked first, because these questions
// name his errors and failures by necessity, and the failure words
// are context, not a case.
const CLARIFY = [
  /\b(?:could|can) you (?:send|share|provide|clarify|confirm|specify|tell|let me|let us know|reproduce|check|paste)\b/i,
  /\bcould you send over\b/i,
  /\bplease (?:provide|send|share|specify|confirm|clarify)\b/i,
  /\bdo you (?:have|know|happen to have)\b/i,
  /\bdo you happen to have\b/i,
  /\bwhat (?:browser|version|device|os|operating system|plan|account|email|address|order|invoice|error|code|page|url|steps?|model|time ?zone|specific|exact|transaction|asset class|module|section|input|id)\b/i,
  /\bwhich (?:browser|plan|account|option|button|device|version|email|os|operating system|module|section|model|asset class|specific|exact)\b/i,
  /\bwhen (?:did|exactly|were you|was)\b/i,
  /\bare you using\b/i,
  /\bis it a (?:virtual|mac|windows|linux)\b/i,
  /\b(?:could|can) you (?:send|share|provide) (?:a |the |me )?(?:screenshot|photo|copy)\b/i,
  /\bscreenshot of the (?:error|page|settings)\b.*\?/i,
  /\bwe (?:need|require) [^.!?]*\b(?:number|id|reference|email|address|screenshot|timestamp|version|browser|date)\b/i,
];

// a method of resolution rides in the message, one the boss can
// take: a workaround, steps, a setting to change. "we've deployed a
// fix" is NOT here: a deployed fix is done, not a path. the strong
// shapes only: boilerplate help centers say "visit our docs", not
// "as a workaround, use the settings export until the patch ships".
const RESOLUTION = [
  /\b(?:as a workaround|workaround|in the meantime|alternatively)\b/i,
  /\binstead of\b/i,
  /\binstead,? try\b/i,
  /\bwe recommend\b/i,
  /\byou can (?:fix|resolve|bypass|work around|avoid|use|try|get|do|see|generate|download|switch|also|actually)\b/i,
  /\bplease try\b/i,
  /(?<!\b(?:i|we|you) )\btry (?:[a-z]+ing|to)\b/i,
  /\bto (?:fix|resolve|bypass|correct|work around) (?:this|that|the)\b/i,
  /\bfollow these steps\b/i,
  /\bhere'?s how\b/i,
  /\bgo to (?:settings|the|your)\b/i,
  /\bnavigate to\b/i,
];

// a receipt: support announcing state. no action for the boss inside
// it. checked before broken words, because receipts quote the very
// errors they resolved ("ticket solved: the latency error has been
// corrected").
const RECEIPT = [
  /\brequest received\b/i,
  /\b(?:ticket|case|issue|request|appeal|grievance|complaint) (?:has been|was|is now) (?:received|solved|closed|escalated|assigned|reviewed|looked into|submitted|in the queue|updated)\b/i,
  /\byour (?:refund|payment|appeal|grievance|complaint|case|request|ticket) (?:has been|was|will be|should)\b/i,
  /\bhas been (?:escalated|received|reversed|approved|corrected|resolved|submitted|assigned|implemented|reviewed|updated|fixed)\b/i,
  /\bwe(?:'ve| have)? (?:deployed|pushed|shipped|rolled out|rolled back|patched|corrected)\b/i,
  /\bwe'?ve (?:fixed|updated|refreshed|corrected)\b/i,
  /\bwe have (?:fixed|corrected|updated|patched|deployed|refreshed)\b/i,
  /\byou should (?:now )?be able to\b/i,
  /\bwill appear in your account\b/i,
  /\bis now (?:resolved|fixed|closed|solved|available)\b/i,
  /\b(?:team|specialist|agent|engineer)s? (?:is|are|will be) (?:investigating|reviewing|with you|looking into)\b/i,
  /\bwe (?:are|'re) (?:looking into|reviewing)\b/i,
  /\bwe appreciate your patience\b/i,
  /\bin the queue\b/i,
  /\bcase escalated\b/i,
  /\bhas been (?:renewed|flagged|scheduled|corrected)\b/i,
  /\b(?:are|is) now (?:active|available|live)\b/i,
  /\bimplemented in the latest (?:update|release|version)\b/i,
];

// something is broken or an outcome is demanded. failure beats
// capability: "the export is broken, can i get the data another
// way?" is a support request whose capability clause is incidental.
const BROKEN = [
  /\b(?:broken|breaks|fails|failed|failing|error|errors|bug|crash(?:es|ed|ing)?|not working|doesn'?t work|stopped working|stopped sending|500s?|404s?|550\b|timeout|timed out|times out|stuck|locked out|blocked)\b/i,
  /\bgreyed out\b/i,
  /\b(?:spins|spinning|hangs|hung|freezes|frozen|freezing|loops|looping back|blank (?:page|screen|report|dashboard)|showing a blank)\b/i,
  /\bwon'?t (?:load|let|show|open|capture|send|sync|accept|start)\b/i,
  /\bisn'?t (?:working|syncing|loading|returning|capturing|sending|appearing|verifying|updating)\b/i,
  /\bkeeps (?:dropping|freezing|spinning|showing|returning|giving|telling|looping)\b/i,
  /\b(?:returning|null value|returning null)\b/i,
  /\b(?:double charg(?:e|ed|es)|charged twice|duplicate charg(?:e|ed)|charged double)\b/i,
  /\b(?:negative (?:values|balances|counts)|incorrect|discrepanc(?:y|ies)|seems wrong|showing wrong|wrongly|contradictory)\b/i,
  /\b(?:missing|disappeared|never arrived|can'?t find|unable to)\b/i,
  /\bcan'?t (?:find|get|log ?in|see|verify|invite|access|use|open|download|figure)\b/i,
  /\b(?:help me|can you help|please help|resolve this|someone check|walk me through|this is blocking)\b/i,
  /\bfile a (?:complaint|grievance|formal)\b/i,
  /\b(?:close my account|delete (?:all|my) (?:data|account)|gdpr)\b/i,
  /\b(?:nobody|no one|still) (?:is )?(?:fixing|nobody is fixing)\b/i,
  /\b(?:billed twice|need a refund|billing error)\b/i,
  /\bshowing (?:zero|no|empty|no results)\b/i,
  /\b(?:invalid|service down|kicks me out|spinning forever)\b/i,
];

// whether something CAN be done with it. asked by the boss as a
// goal ("does the starter plan support sso?") or by anyone checking
// a possibility. question-shaped: can/could + a subject that is
// not "you" (asking him for a fact is a clarification), or the
// possibility forms. never fires when the thing is reported broken.
const CAPABILITY = [
  /\b(?:can|could) (?:i|we|the|this|that|it|your|they)\b[^.!?]*\?/i,
  /\b(?:can|could) (?:i|we) [^.!?]{0,80}\b(?:with|via|on|in|to|from|using)\b/i,
  /\bdoes (?:the|this|your|it|that|any|our)\b/i,
  /\bdo (?:i|we|they) (?:have|need)\b/i,
  /\bdo (?:i|we) have to\b/i,
  /\bis there (?:a |any )?(?:way|capability|option|possibility)\b/i,
  /\b(?:would|will) it be possible\b/i,
  /\bis it possible\b/i,
  /\bare (?:we|i) able\b/i,
  /\bam i able\b/i,
  /\btrying to figure out if\b/i,
  /\bor (?:is it only|do i have to|do we have to|do they all need)\b/i,
];

// the sentence the signal lives in: the question or the method,
// quoted whole, because the boss reads the quote, not the page.
function sentenceWith(t: string, signal: string): string | null {
  if (!signal) return null;
  const parts = t.split(/(?<=[.!?])\s+|\n+/);
  const hit = parts.find((p) => p.toLowerCase().includes(signal.toLowerCase()));
  return (hit ?? null)?.trim() ?? null;
}

function matches(text: string, patterns: RegExp[]): { hit: boolean; signal: string | null } {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { hit: true, signal: m[0] };
  }
  return { hit: false, signal: null };
}

export function classifyIntent(text: string): IntentVerdict {
  const t = text || "";
  const signals: string[] = [];
  const fire = (patterns: RegExp[]): boolean => {
    const { hit, signal } = matches(t, patterns);
    if (hit && signal) signals.push(signal);
    return hit;
  };

  if (fire(CLARIFY)) {
    return { intent: "clarification", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(RECEIPT)) {
    return { intent: "confirmation", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(RESOLUTION)) {
    return { intent: "resolution_method", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(BROKEN)) {
    return { intent: "support_request", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(CAPABILITY)) {
    return { intent: "capability_question", signals, salient: sentenceWith(t, signals[0]) };
  }
  return { intent: "confirmation", signals: [], salient: null };
}

// what milo does about each, in his own grammar. the mapping is the
// skill; the classifier only names which case he is in.
export function actionForIntent(intent: MessageIntent): string {
  switch (intent) {
    case "support_request":
      return "an outcome is owed: open the case and stay on it";
    case "capability_question":
      return "the goal is an answer, not a fix: ask it plainly, capture the yes or the no";
    case "resolution_method":
      return "the path is the answer: quote it to the boss, take it when the boss says so";
    case "clarification":
      return "they need a fact he has: answer from the brief, or park with the boss. never guess case facts";
    case "confirmation":
      return "a receipt is not an outcome: record it and keep the cadence";
  }
}

// the mission's goal, off the boss's own problem sentence. a brief
// that asks whether something can be done is an answer-kind mission;
// a brief that says something broke is a fix-kind mission. the two
// get different questions asked on their behalf.
export type BriefKind = "fix" | "answer";

export function briefKind(problem: string): BriefKind {
  return classifyIntent(problem).intent === "capability_question" ? "answer" : "fix";
}

// the boss question for the two intents that park. the quote rides
// so the boss can check the read against the page.
export function bossQuestionFor(intent: IntentVerdict, fallback: string): string {
  if (intent.intent === "resolution_method" && intent.salient) {
    return `a method of resolution was offered: "${intent.salient}". want him to take it?`;
  }
  if (intent.intent === "clarification" && intent.salient) {
    return `they asked: "${intent.salient}". the answer is the boss's to give`;
  }
  return fallback;
}

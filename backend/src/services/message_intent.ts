// what a message is FOR, not what it says. milo knows the
// difference, anne's list:
//
//   support_request     something is broken, an outcome is owed
//   capability_question whether something can be done with it
//   resolution_method   a method of resolution rides in the message
//   clarification       they need a fact he has
//   confirmation        a receipt, a status: no action inside it
//
// the same words mean different things by intent: "you can use the
// api export" from support is a path offered, but "can i use the api
// export with this plan?" from the boss is a question to get
// answered, not a case to be filed. the classifier names which is
// which, and the action mapping says what milo does about it.

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

// a method of resolution rides in the message. these are the strong
// shapes only: boilerplate help centers say "visit our docs", not
// "as a workaround, use the settings export until the patch ships".
const RESOLUTION =
  /\b(?:as a workaround|workaround|in the meantime|alternatively|instead of [^.?]{0,40}|instead,? try|you can (?:use|try|download|switch to|also use|also try)|to (?:resolve|fix|work around) (?:this|it|that)|you should (?:now )?be able to|follow these steps|we'?ve (?:deployed|pushed|shipped) (?:a )?(?:fix|patch)|the fix (?:is|was)|try (?:going|using|downloading|clearing|switching|updating))\b/i;

// something is broken or an outcome is demanded. failure beats
// capability: "the export is broken, can i get the data another
// way?" is a support request whose capability clause is incidental.
const BROKEN =
  /\b(?:broken|breaks|fails|failed|failing|error|bug|crash(?:es|ed|ing)?|not working|doesn'?t work|stopped working|500s|404s?|timeout|timed out|stuck|can'?t|cannot|couldn'?t|refund|charged? (?:me )?twice|wrong(?:ly)? charged|missing|never arrived|disappeared|locked out)\b/i;

const HELP_VERBS = /\b(?:fix this|help me|refund (?:this|the|my)|cancel (?:this|the|my)|resend (?:it|the)|reset (?:it|my)|escalate (?:this|the))\b/i;

// whether something CAN be done with it. asked by the boss as a
// goal ("does the starter plan support sso?") or by anyone checking
// a possibility. never fires when the thing is reported broken.
const CAPABILITY =
  /\b(?:can|could) (?:i|we) [^.?]{0,60}\b(?:with|on|in|using) (?:this|it|that|the [a-z]+)\b|\bdoes (?:this|the|your|it|that|your plan) [^.?]{0,40}\b(?:support|allow|include|offer|have)\b|\b(?:is|are) (?:it|there) (?:possible|a way) (?:to|for)\b|\bwould it be possible\b|\b(?:which|what) (?:plans?|tiers?) (?:support|allow|include)\b/i;

// they need a fact he (or the boss) has: the case detail questions
// support asks before anything can move.
const CLARIFY =
  /\bwhat (?:browser|version|device|os|plan|account|email|address|order|invoice|error|code|page|url|steps?|model)\b|\bwhen did (?:you|this|it|the)\b|\bwhich (?:browser|plan|account|option|button|device|version)\b|\b(?:could|can) you (?:share|send|confirm|provide|clarify|tell me|reproduce|check)\b|\bplease (?:share|send|confirm|provide|clarify)\b|\b(?:your|the) (?:order|account|invoice) (?:number|id)\b/i;

// the sentence the signal lives in: the question or the method,
// quoted whole, because the boss reads the quote, not the page.
function sentenceWith(t: string, signal: string): string | null {
  if (!signal) return null;
  const parts = t.split(/(?<=[.!?])\s+|\n+/);
  const hit = parts.find((p) => p.toLowerCase().includes(signal.toLowerCase()));
  return (hit ?? null)?.trim() ?? null;
}

export function classifyIntent(text: string): IntentVerdict {
  const t = text || "";
  const signals: string[] = [];
  const fire = (re: RegExp): boolean => {
    const m = t.match(re);
    if (m) signals.push(m[0]);
    return !!m;
  };

  // ordered: a method offered beats a thing broken (the method is
  // the actionable content), broken beats capability (incidental
  // questions ride on real cases), and a statement of fact is the
  // honest default, never a guess dressed as knowledge.
  if (fire(RESOLUTION)) {
    return { intent: "resolution_method", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(BROKEN) || fire(HELP_VERBS)) {
    return { intent: "support_request", signals, salient: null };
  }
  if (fire(CAPABILITY)) {
    return { intent: "capability_question", signals, salient: sentenceWith(t, signals[0]) };
  }
  if (fire(CLARIFY)) {
    return { intent: "clarification", signals, salient: sentenceWith(t, signals[0]) };
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

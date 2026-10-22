// evidence handling (milo, oct 22 2026): give him the mess.
//
// you hand him 7 screenshots, 2 error messages, a log file, and a
// paragraph of frustrated rambling. the portal accepts one attachment,
// it must be a pdf, and it must be under 2mb. milo consolidates:
// what the form allows decides what the evidence becomes, and the
// receipts say what was cut, never pretend nothing was.
//
// pure halves decide the shapes; the impure halves (the actual pdf
// render, the actual upload) live behind injectable seams so a
// deployment without a renderer reports "unrenderable", never fakes
// an attachment.

export interface EvidenceItem {
  label: string;
  kind: "screenshot" | "log" | "text" | "link" | "file";
  content: string | null;
  url: string | null;
  sizeEstimate: number;
}

export interface ConstraintReport {
  attachmentsAllowed: number;
  acceptsPdfOnly: boolean;
  sizeLimitBytes: number | null;
}

// the consolidation plan for what the form accepts. pure: given the
// evidence and the constraints, what ships. text evidence rides
// inside the message body (it counts against the character limit
// there), file evidence stacks into ONE pdf when the form allows
// one, and anything that cannot ride is dropped WITH A RECEIPT.
export interface ConsolidationPlan {
  attachFiles: string[];
  intoBody: string[];
  dropped: Array<{ label: string; reason: string }>;
}

export function planConsolidation(
  evidence: EvidenceItem[],
  constraints: ConstraintReport,
): ConsolidationPlan {
  const plan: ConsolidationPlan = { attachFiles: [], intoBody: [], dropped: [] };

  if (constraints.attachmentsAllowed <= 0) {
    for (const e of evidence) {
      if (e.kind === "file" || e.kind === "screenshot") {
        plan.dropped.push({ label: e.label, reason: "the form takes no attachments" });
      } else {
        plan.intoBody.push(e.label);
      }
    }
    return plan;
  }

  // text and links ride in the body; they were never attachment
  // candidates.
  for (const e of evidence) {
    if (e.kind === "text" || e.kind === "log" || e.kind === "link") {
      plan.intoBody.push(e.label);
    }
  }

  // the files, by size honesty first: the biggest screenshots and the
  // logs are the payload, but the size limit is the law.
  const files = evidence.filter((e) => e.kind === "screenshot" || e.kind === "file");
  const limit = constraints.sizeLimitBytes;

  if (files.length <= constraints.attachmentsAllowed) {
    // they all fit as-is; the pdf consolidation is only needed when
    // the form demands pdf or the count exceeds the allowance.
    for (const f of files) {
      if (limit && f.sizeEstimate > limit) {
        plan.dropped.push({ label: f.label, reason: `over the ${limit} byte limit` });
      } else {
        plan.attachFiles.push(f.label);
      }
    }
    return plan;
  }

  // more files than the form allows: consolidate into one. the plan
  // names the survivors; the render seam turns them into the single
  // pdf. every survivor must fit the byte budget TOGETHER.
  let budget = limit ?? Number.MAX_SAFE_INTEGER;
  const survivors: string[] = [];
  for (const f of files) {
    if (f.sizeEstimate > budget) {
      plan.dropped.push({
        label: f.label,
        reason: limit ? `the consolidated pdf is full (${limit} bytes)` : "unrenderable",
      });
      continue;
    }
    survivors.push(f.label);
    budget -= f.sizeEstimate;
  }
  plan.attachFiles.push(`consolidated pdf: ${survivors.join(", ")}`);
  return plan;
}

// pdf-only detection from the accept attribute: "application/pdf",
// ".pdf", either shape. null accept means anything, and anything
// still ships as pdf when consolidation is needed: it is the one
// format nobody has ever rejected.
export function pdfOnly(accept: string | null): boolean {
  if (!accept) return false;
  const a = accept.toLowerCase();
  return a.includes("pdf") && !a.includes("png") && !a.includes("jpeg") && !a.includes("jpg");
}

// the attachment limit from the accept/multiple shape: honest default
// is one, because "one attachment maximum" is the portal way.
export function attachmentsAllowedFrom(acceptMultiple: boolean, fileInputCount: number): number {
  if (fileInputCount === 0) return 0;
  return acceptMultiple ? 5 : 1;
}

// injectable: the render seam. a real deployment registers a renderer
// (screenshots + logs -> one pdf under the byte limit); without one,
// file evidence is dropped with a receipt, never faked.
export type PdfRenderer = (labels: string[], limitBytes: number | null) => Promise<{ ok: boolean; pdf?: Uint8Array; error?: string }>;

export function noRenderer(): PdfRenderer {
  return async () => ({
    ok: false,
    error: "no pdf renderer configured: file evidence is reported, not attached",
  });
}

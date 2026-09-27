import { CAUSES } from "./config";
import type { CauseId, Transfer, TriagedTransfer } from "./types";

/** A neutral pending ACH transfer; each case overrides only what it is testing. */
export function base(o: Partial<Transfer>): Transfer {
  return {
    id: "T",
    cust: "C0",
    country: "MX",
    rail: "ACH_IN",
    amt: 100,
    partner: "pending",
    ledger: "none",
    refMatched: true,
    review: false,
    notified: false,
    docIn: false,
    maintAtCreate: false,
    ageH: 1,
    ...o,
  };
}

export interface RuleCase {
  name: string;
  input: Transfer;
  want: CauseId;
}

/**
 * Hand-built edge cases: exactly at the SLA line, two conditions true at once,
 * money that arrived but was never posted. Shared by the Vitest suite and the
 * in-app "How it's checked" tab, so both always run the same cases.
 */
export const RULE_CASES: RuleCase[] = [
  { name: "ACH pending at exactly the 72h SLA is still on track", input: base({ ageH: 72 }), want: "ON_TRACK" },
  { name: "ACH pending 1 minute past SLA is late", input: base({ ageH: 72.02 }), want: "LATE" },
  { name: "SPEI pending 61 min is late (1h SLA)", input: base({ rail: "SPEI_IN", ageH: 1.02 }), want: "LATE" },
  { name: "Settled + matched ref + no ledger credit = arrived, not posted", input: base({ partner: "settled", settledAtH: 0, ageH: 3 }), want: "DESYNC" },
  { name: "Settled + no ledger + unmatched ref = can't match, not desync", input: base({ partner: "settled", settledAtH: 0, refMatched: false, refIssue: "missing", ageH: 3 }), want: "UNMATCHED" },
  { name: "Settled + credited is not stuck (falls through to no rule)", input: base({ partner: "settled", ledger: "credited", ageH: 3 }), want: "UNKNOWN" },
  { name: "Review open + settled: hold explains the missing credit, not a bug", input: base({ review: true, reviewAtH: 0, partner: "settled", settledAtH: 0, ageH: 5 }), want: "HOLD_SILENT" },
  { name: "Review open, customer notified, doc outstanding", input: base({ review: true, notified: true, docNeeded: "proof of address", reviewAtH: 0, ageH: 30 }), want: "HOLD_DOC" },
  { name: "Review open, notified, doc received, still pending = normal flow", input: base({ review: true, notified: true, docIn: true, reviewAtH: 0, ageH: 10 }), want: "ON_TRACK" },
  { name: "Returned beats everything, even an open review", input: base({ partner: "returned", returnCode: "R03 no account", review: true, ageH: 10 }), want: "RETURNED" },
  { name: "Crypto on wrong network", input: base({ rail: "CRYPTO_IN", network: "Tron", expectedNet: "Solana", ageH: 0.5 }), want: "WRONG_NET" },
  { name: "Crypto on right network, pending within SLA", input: base({ rail: "CRYPTO_IN", network: "Base", expectedNet: "Base", ageH: 0.5 }), want: "ON_TRACK" },
  { name: "Rail in maintenance at creation, even if also past SLA", input: base({ rail: "CASH_OUT", maintAtCreate: true, ageH: 100 }), want: "MAINT" },
  { name: "Partner sent nothing = no rule, a human looks", input: base({ partner: "unknown", ageH: 20 }), want: "UNKNOWN" },
];

export interface Invariant {
  name: string;
  holds: (data: TriagedTransfer[]) => boolean;
}

/** Properties that must hold across every item in the generated snapshot. */
export const INVARIANTS: Invariant[] = [
  { name: "Every synthetic item gets exactly one reason", holds: (d) => d.every((x) => Boolean(CAUSES[x.cause])) },
  { name: "No 'on track' item is past its SLA", holds: (d) => d.filter((x) => x.cause === "ON_TRACK").every((x) => !x.past) },
  {
    name: "Every 'arrived, not posted' item has a partner settlement and a matched reference",
    holds: (d) => d.filter((x) => x.cause === "DESYNC").every((x) => x.partner === "settled" && x.refMatched && x.ledger === "none"),
  },
];

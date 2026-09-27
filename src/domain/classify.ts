import { RAILS } from "./config";
import { fmtAge } from "./format";
import type { Classification, Transfer } from "./types";

/**
 * Names the single reason a transfer is stuck.
 *
 * An item can match several conditions at once (e.g. under compliance review
 * AND past SLA), so rules are evaluated in a fixed precedence and the first
 * match wins. The order mirrors ORDER in config.ts; the unit tests pin each
 * overlap.
 */
export function classify(x: Transfer): Classification {
  const rail = RAILS[x.rail];
  const past = x.ageH > rail.sla;

  if (x.partner === "returned") {
    return {
      cause: "RETURNED",
      why: `Partner returned it (${x.returnCode}). Money goes back to the source account.`,
    };
  }
  if (x.review && !x.notified) {
    return {
      cause: "HOLD_SILENT",
      why: `Compliance review opened ${fmtAge(x.ageH - (x.reviewAtH ?? 0))} ago. No notice has gone to the customer.`,
    };
  }
  if (x.review && x.notified && !x.docIn) {
    return {
      cause: "HOLD_DOC",
      why: `Review open. Customer was asked for: ${x.docNeeded}. Not received yet.`,
    };
  }
  if (x.partner === "settled" && x.ledger === "none" && x.refMatched) {
    return {
      cause: "DESYNC",
      why: `Partner confirmed settlement ${fmtAge(x.ageH - (x.settledAtH ?? 0))} ago and the reference matches, but there's no ledger credit. Money is here; balance doesn't show it.`,
    };
  }
  if (x.partner === "settled" && x.ledger === "none" && !x.refMatched) {
    return {
      cause: "UNMATCHED",
      why: `Settled into the pooled account, but the reference is ${x.refIssue}. Can't tell whose money it is.`,
    };
  }
  if (x.rail === "CRYPTO_IN" && x.network && x.network !== x.expectedNet) {
    return {
      cause: "WRONG_NET",
      why: `Sent on ${x.network}; this address expects ${x.expectedNet}.`,
    };
  }
  if (x.maintAtCreate) {
    return {
      cause: "MAINT",
      why: `${rail.label} was flagged for maintenance when this was created. The app still accepted it.`,
    };
  }
  if (x.partner === "pending" && past) {
    return {
      cause: "LATE",
      why: `Still pending at the partner, ${fmtAge(x.ageH - rail.sla)} past the ${rail.sla}h SLA.`,
    };
  }
  if (x.partner === "pending" && !past) {
    return {
      cause: "ON_TRACK",
      why: `Normal. Pending at partner, ${fmtAge(rail.sla - x.ageH)} left on the SLA.`,
    };
  }
  return { cause: "UNKNOWN", why: "Data doesn't match any known pattern. Needs a human." };
}

export const isPastSla = (x: Transfer): boolean => x.ageH > RAILS[x.rail].sla;

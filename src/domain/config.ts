import type { Cause, CauseId, Rail, RailId } from "./types";

/** Rail SLAs are assumptions, flagged in the "Assumptions" tab. */
export const RAILS: Record<RailId, Rail> = {
  ACH_IN: { label: "US ACH in", dir: "in", sla: 72 },
  WIRE_IN: { label: "US wire in", dir: "in", sla: 24 },
  SEPA_IN: { label: "EUR SEPA in", dir: "in", sla: 24 },
  SPEI_IN: { label: "MXN SPEI in", dir: "in", sla: 1 },
  CRYPTO_IN: { label: "Crypto in", dir: "in", sla: 1 },
  BANK_OUT: { label: "Bank payout", dir: "out", sla: 48 },
  CASH_OUT: { label: "Cash pickup", dir: "out", sla: 24 },
};

export const RAIL_IDS = Object.keys(RAILS) as RailId[];

export const CAUSES: Record<CauseId, Cause> = {
  DESYNC: {
    label: "Arrived, not posted",
    owner: "Engineering",
    pill: "p-bad",
    fix: "Nightly + on-webhook check: every partner 'settled' event must have a ledger credit within 15 min, or it pages someone.",
    metric: "Count of settled-but-unposted items older than 15 min (target: 0)",
  },
  HOLD_SILENT: {
    label: "Under review, customer not told",
    owner: "Compliance",
    pill: "p-bad",
    fix: "Opening a review automatically sends the customer a notice with what's needed and the expected timeline. Reviewer picks the reason from a list, not free text.",
    metric: "% of holds where the customer got a notice within 1 hour",
  },
  HOLD_DOC: {
    label: "Waiting on customer document",
    owner: "Customer",
    pill: "p-warn",
    fix: "In-app upload straight from the notice, with reminders at 24h and 72h. Show which document and why.",
    metric: "Median time from doc request to doc received",
  },
  MAINT: {
    label: "Sent into a rail under maintenance",
    owner: "Ops",
    pill: "p-warn",
    fix: "Maintenance flag per rail blocks new transfers into it and shows a banner with an alternative. Items already in flight get a proactive message.",
    metric: "Transfers created on a rail while it was flagged (target: 0)",
  },
  UNMATCHED: {
    label: "Arrived, can't match to a customer",
    owner: "Ops",
    pill: "p-warn",
    fix: "Auto-match on amount + sender name + date window, and show the exact reference field on the deposit screen with a copy button.",
    metric: "% of inbound bank deposits auto-matched",
  },
  RETURNED: {
    label: "Returned by bank",
    owner: "Customer",
    pill: "p-acc",
    fix: "Map each return code to a plain-language reason and a fix ('the account number doesn't exist, check the last 4 digits').",
    metric: "Repeat returns for the same customer within 7 days",
  },
  WRONG_NET: {
    label: "Crypto sent on the wrong network",
    owner: "Engineering",
    pill: "p-warn",
    fix: "Show the network name next to every deposit address and warn on the known wrong-network pairs before the address is copied.",
    metric: "Wrong-network deposits per 1,000 crypto deposits",
  },
  LATE: {
    label: "At partner, past SLA",
    owner: "Ops",
    pill: "p-warn",
    fix: "Auto-escalate to the partner at SLA + 25%, with the partner's reference attached. Track partner-level SLA hit rate.",
    metric: "Partner SLA hit rate by rail",
  },
  ON_TRACK: {
    label: "On its way, within SLA",
    owner: "None yet",
    pill: "p-ok",
    fix: "Nothing to fix. Show the customer the ETA so they don't open a ticket.",
    metric: "Tickets opened on items that were still within SLA",
  },
  UNKNOWN: {
    label: "No rule matched",
    owner: "Investigate",
    pill: "p-acc",
    fix: "Manual look. Every one of these either becomes a new rule or shows a data gap.",
    metric: "Share of stuck items with no reason (target: under 2%)",
  },
};

/** Rule precedence. The classifier returns the first rule that matches, in this order. */
export const ORDER: CauseId[] = [
  "RETURNED",
  "HOLD_SILENT",
  "HOLD_DOC",
  "DESYNC",
  "UNMATCHED",
  "WRONG_NET",
  "MAINT",
  "LATE",
  "ON_TRACK",
  "UNKNOWN",
];

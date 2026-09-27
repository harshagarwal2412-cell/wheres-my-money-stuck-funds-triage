/** Money-movement rails. SLA values are assumptions (see "Assumptions" tab). */
export type RailId =
  | "ACH_IN"
  | "WIRE_IN"
  | "SEPA_IN"
  | "SPEI_IN"
  | "CRYPTO_IN"
  | "BANK_OUT"
  | "CASH_OUT";

export interface Rail {
  label: string;
  dir: "in" | "out";
  /** Service-level target, in hours. */
  sla: number;
}

/** Every reason a transfer can be stuck. Exactly one is assigned per item. */
export type CauseId =
  | "RETURNED"
  | "HOLD_SILENT"
  | "HOLD_DOC"
  | "DESYNC"
  | "UNMATCHED"
  | "WRONG_NET"
  | "MAINT"
  | "LATE"
  | "ON_TRACK"
  | "UNKNOWN";

export type Owner = "Engineering" | "Compliance" | "Customer" | "Ops" | "None yet" | "Investigate";

export type PillTone = "p-bad" | "p-warn" | "p-ok" | "p-acc";

export interface Cause {
  label: string;
  owner: Owner;
  pill: PillTone;
  /** The systemic fix for the thing behind this reason. */
  fix: string;
  /** The one number that says whether the fix worked. */
  metric: string;
}

export type PartnerStatus = "pending" | "settled" | "returned" | "unknown";
export type LedgerStatus = "none" | "credited";

/**
 * A transfer joined across the three systems that each hold part of the truth:
 * the payment partner, the internal ledger, and compliance.
 */
export interface Transfer {
  id: string;
  cust: string;
  country: string;
  rail: RailId;
  /** Amount in USD. */
  amt: number;
  /** Hours since the transfer was created. */
  ageH: number;

  // payment partner
  partner: PartnerStatus;
  settledAtH?: number;
  returnCode?: string;
  refMatched: boolean;
  refIssue?: string;

  // ledger
  ledger: LedgerStatus;

  // compliance
  review: boolean;
  reviewAtH?: number;
  notified: boolean;
  docNeeded?: string;
  docIn: boolean;

  // rail / chain context
  maintAtCreate: boolean;
  network?: string;
  expectedNet?: string;
}

export interface Classification {
  cause: CauseId;
  why: string;
}

/** A transfer after the classifier has run on it. */
export interface TriagedTransfer extends Transfer {
  cause: CauseId;
  why: string;
  /** Past the rail's SLA. */
  past: boolean;
  /** The customer has been given a reason (from the synthetic scenario). */
  told: boolean;
}

export type Lang = "en" | "es";

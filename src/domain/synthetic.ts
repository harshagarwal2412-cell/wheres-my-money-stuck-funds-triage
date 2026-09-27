import { classify, isPastSla } from "./classify";
import { RAILS } from "./config";
import type { CauseId, RailId, Transfer, TriagedTransfer } from "./types";

/** mulberry32: small, fast, seedable PRNG so the snapshot is identical on every load. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTRIES = ["MX", "EC", "SV", "BO", "AR", "CO", "VE", "GT", "PE"];
const DOCS = [
  "proof of address",
  "source of funds for this deposit",
  "a new selfie (the first was blurry)",
  "ID back side",
];
const RETURN_CODES: Record<RailId, string[]> = {
  ACH_IN: ["R01 insufficient funds", "R03 no account", "R16 account frozen"],
  WIRE_IN: ["beneficiary name mismatch"],
  SEPA_IN: ["AC04 account closed"],
  SPEI_IN: ["cuenta inexistente"],
  BANK_OUT: ["R03 no account", "invalid CLABE", "R02 account closed"],
  CASH_OUT: ["recipient ID mismatch"],
  CRYPTO_IN: ["rejected by screening"],
};
const IN_RAILS: RailId[] = ["ACH_IN", "WIRE_IN", "SEPA_IN", "SPEI_IN", "CRYPTO_IN"];
const OUT_RAILS: RailId[] = ["BANK_OUT", "CASH_OUT"];

/** How many items of each scenario the snapshot contains. */
export const MIX: [CauseId, number][] = [
  ["ON_TRACK", 141],
  ["LATE", 34],
  ["HOLD_SILENT", 41],
  ["HOLD_DOC", 29],
  ["MAINT", 31],
  ["UNMATCHED", 26],
  ["RETURNED", 24],
  ["DESYNC", 19],
  ["WRONG_NET", 11],
  ["UNKNOWN", 6],
];

/** Build one raw transfer whose underlying facts produce the target scenario. */
function makeItem(i: number, target: CauseId, R: () => number): Transfer & { told: boolean } {
  const pick = <T,>(a: T[]): T => a[Math.floor(R() * a.length)];

  let rail: RailId;
  if (target === "UNMATCHED" || target === "DESYNC") rail = pick<RailId>(["ACH_IN", "WIRE_IN", "WIRE_IN", "SEPA_IN", "SPEI_IN"]);
  else if (target === "WRONG_NET") rail = "CRYPTO_IN";
  else if (target === "MAINT") rail = pick<RailId>(["BANK_OUT", "CASH_OUT", "CASH_OUT", "WIRE_IN"]);
  else rail = pick(R() < 0.7 ? IN_RAILS : OUT_RAILS);

  const sla = RAILS[rail].sla;
  const amt = Math.round(
    rail === "WIRE_IN" ? 400 + R() * 3600 : rail === "CRYPTO_IN" ? 20 + R() * 900 : 25 + R() * 1100,
  );

  const x: Transfer = {
    id: "TX-" + (10000 + i),
    cust: "C" + (2000 + Math.floor(R() * 9000)),
    country: pick(COUNTRIES),
    rail,
    amt,
    partner: "pending",
    ledger: "none",
    refMatched: true,
    review: false,
    notified: false,
    docIn: false,
    maintAtCreate: false,
    ageH: 0,
  };

  switch (target) {
    case "ON_TRACK":
      x.ageH = R() * sla * 0.95;
      break;
    case "LATE":
      x.ageH = sla * (1.1 + R() * 3);
      break;
    case "HOLD_SILENT":
      x.review = true;
      x.ageH = 4 + R() * 200;
      x.reviewAtH = R() * 2;
      break;
    case "HOLD_DOC":
      x.review = true;
      x.notified = true;
      x.docNeeded = pick(DOCS);
      x.ageH = 10 + R() * 260;
      x.reviewAtH = R() * 3;
      break;
    case "DESYNC":
      x.partner = "settled";
      x.ageH = 2 + R() * 120;
      x.settledAtH = R() * Math.min(x.ageH, sla);
      break;
    case "UNMATCHED":
      x.partner = "settled";
      x.refMatched = false;
      x.refIssue = pick(["missing", "for a different customer", "truncated by the sending bank"]);
      x.ageH = 6 + R() * 220;
      x.settledAtH = R() * 6;
      break;
    case "RETURNED":
      x.partner = "returned";
      x.returnCode = pick(RETURN_CODES[rail]);
      x.ageH = 12 + R() * 120;
      break;
    case "WRONG_NET":
      x.network = pick(["Ethereum", "BNB Chain", "Tron"]);
      x.expectedNet = x.network === "Ethereum" ? "Base" : pick(["Solana", "Base"]);
      x.ageH = 1 + R() * 150;
      break;
    case "MAINT":
      x.maintAtCreate = true;
      x.ageH = sla * (0.5 + R() * 6);
      break;
    case "UNKNOWN":
      x.partner = "unknown";
      x.ageH = 5 + R() * 100;
      break;
    default:
      break;
  }
  x.ageH = Math.round(x.ageH * 10) / 10;

  // Was the customer told anything at all?
  const told = target === "HOLD_DOC" || target === "RETURNED" || target === "ON_TRACK";
  return { ...x, told };
}

/** Generate a deterministic snapshot of open transfers and run the classifier over it. */
export function buildSnapshot(seed = 20260924): TriagedTransfer[] {
  const R = rng(seed);
  const raw: (Transfer & { told: boolean })[] = [];
  let i = 0;
  for (const [cause, n] of MIX) for (let k = 0; k < n; k++) raw.push(makeItem(i++, cause, R));

  return raw
    .map((x) => {
      const { cause, why } = classify(x);
      return { ...x, cause, why, past: isPastSla(x) };
    })
    .sort((a, b) => b.ageH - a.ageH);
}

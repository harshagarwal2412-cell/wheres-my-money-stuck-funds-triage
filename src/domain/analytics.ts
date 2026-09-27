import { CAUSES, ORDER, RAILS } from "./config";
import { fmtAge, median, sum, usd } from "./format";
import type { CauseId, Owner, RailId, TriagedTransfer } from "./types";

export interface QueueFilter {
  cause: CauseId | "";
  owner: Owner | "";
  rail: RailId | "";
  /** "breach" = past SLA; "silent" = stuck and customer never told. */
  age: "" | "breach" | "silent";
}

export const EMPTY_FILTER: QueueFilter = { cause: "", owner: "", rail: "", age: "" };

export function filterQueue(data: TriagedTransfer[], f: QueueFilter): TriagedTransfer[] {
  return data.filter(
    (x) =>
      (!f.cause || x.cause === f.cause) &&
      (!f.owner || CAUSES[x.cause].owner === f.owner) &&
      (!f.rail || x.rail === f.rail) &&
      (!f.age || (f.age === "breach" ? x.past : !x.told && x.cause !== "ON_TRACK")),
  );
}

export interface Kpis {
  open: number;
  stuck: number;
  stuckUsd: number;
  silentPct: number;
  medianStuckAgeH: number;
  desyncCount: number;
  desyncUsd: number;
}

export function kpis(data: TriagedTransfer[]): Kpis {
  const stuck = data.filter((x) => x.cause !== "ON_TRACK");
  const silent = stuck.filter((x) => !x.told);
  const desync = data.filter((x) => x.cause === "DESYNC");
  return {
    open: data.length,
    stuck: stuck.length,
    stuckUsd: sum(stuck.map((x) => x.amt)),
    silentPct: stuck.length ? Math.round((100 * silent.length) / stuck.length) : 0,
    medianStuckAgeH: median(stuck.map((x) => x.ageH)),
    desyncCount: desync.length,
    desyncUsd: sum(desync.map((x) => x.amt)),
  };
}

export interface CauseRank {
  cause: CauseId;
  n: number;
  usd: number;
  medianAgeH: number;
  pastShare: number;
}

/** Rank stuck reasons by customers affected × how long they wait. */
export function rankCauses(data: TriagedTransfer[]): CauseRank[] {
  return ORDER.filter((c) => c !== "ON_TRACK")
    .map((cause) => {
      const items = data.filter((x) => x.cause === cause);
      return {
        cause,
        n: items.length,
        usd: sum(items.map((x) => x.amt)),
        medianAgeH: median(items.map((x) => x.ageH)),
        pastShare: items.length ? items.filter((x) => x.past).length / items.length : 0,
      };
    })
    .sort((a, b) => b.n * b.medianAgeH - a.n * a.medianAgeH);
}

/** Merge partner, compliance, chain and ledger events into one readable timeline. */
export function eventLog(x: TriagedTransfer): string {
  const r = RAILS[x.rail];
  const t = (h: number) => "T+" + fmtAge(h).padStart(5, " ");
  const L: string[] = [];
  L.push(`${t(0)}  app        transfer created (${r.label}, ${usd(x.amt)})`);
  if (x.maintAtCreate) L.push(`${t(0)}  ops-flag   ${r.label}: MAINTENANCE (flag was on)`);
  if (x.review) L.push(`${t(x.reviewAtH ?? 0)}  compliance review opened` + (x.notified ? "" : "  — no customer notice"));
  if (x.review && x.notified) L.push(`${t((x.reviewAtH ?? 0) + 0.2)}  app        notice sent: needs ${x.docNeeded}`);
  if (x.network) L.push(`${t(0.1)}  chain      tx seen on ${x.network}; address expects ${x.expectedNet}`);
  if (x.partner === "settled") L.push(`${t(x.settledAtH ?? 0)}  partner    status=settled  ref=${x.refMatched ? "matched" : x.refIssue}`);
  if (x.partner === "returned") L.push(`${t(Math.min(x.ageH, 8))}  partner    status=returned  code="${x.returnCode}"`);
  if (x.partner === "pending") L.push(`${t(Math.min(x.ageH, 0.3))}  partner    status=pending`);
  if (x.partner === "unknown") L.push(`${t(0.3)}  partner    no webhook received`);
  L.push(`${t(x.ageH)}  ledger     ${x.ledger === "none" ? "no credit posted" : x.ledger}`);
  return L.join("\n");
}

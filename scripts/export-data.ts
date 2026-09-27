/**
 * Exports the synthetic snapshot to CSV for the Python/SQL analysis in /analysis.
 * The TypeScript domain model is the single source of truth; the CSVs are
 * normalized into the three systems a transfer's status actually lives in
 * (payment partner, ledger, compliance) plus the classifier's output.
 *
 *   npm run export:data
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CAUSES, ORDER, RAILS, RAIL_IDS } from "../src/domain/config";
import { buildSnapshot } from "../src/domain/synthetic";

const OUT = join(import.meta.dirname, "..", "analysis", "data");
mkdirSync(OUT, { recursive: true });

type Row = Record<string, string | number | boolean | undefined | null>;
const cell = (v: Row[string]) => {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function write(name: string, rows: Row[]) {
  const cols = Object.keys(rows[0]);
  const body = rows.map((r) => cols.map((c) => cell(r[c])).join(","));
  writeFileSync(join(OUT, name), [cols.join(","), ...body].join("\n") + "\n");
  console.log(`wrote ${name} (${rows.length} rows)`);
}

const data = buildSnapshot();

write("rails.csv", RAIL_IDS.map((id) => ({ rail_id: id, label: RAILS[id].label, direction: RAILS[id].dir, sla_hours: RAILS[id].sla })));

write("causes.csv", ORDER.map((id, i) => ({
  cause_id: id, precedence: i + 1, label: CAUSES[id].label, owner: CAUSES[id].owner, fix: CAUSES[id].fix, metric: CAUSES[id].metric,
})));

write("transfers.csv", data.map((x) => ({
  transfer_id: x.id, customer_id: x.cust, country: x.country, rail_id: x.rail, amount_usd: x.amt, age_hours: x.ageH,
  maint_at_create: x.maintAtCreate, network: x.network, expected_network: x.expectedNet, customer_told: x.told,
})));

write("partner_events.csv", data.map((x) => ({
  transfer_id: x.id, partner_status: x.partner, settled_at_hours: x.settledAtH, ref_matched: x.refMatched,
  ref_issue: x.refIssue, return_code: x.returnCode,
})));

write("ledger_entries.csv", data.map((x) => ({ transfer_id: x.id, ledger_status: x.ledger })));

write("compliance_reviews.csv", data.filter((x) => x.review).map((x) => ({
  transfer_id: x.id, opened_at_hours: x.reviewAtH, customer_notified: x.notified, doc_needed: x.docNeeded, doc_received: x.docIn,
})));

write("triage.csv", data.map((x) => ({ transfer_id: x.id, cause_id: x.cause, past_sla: x.past })));

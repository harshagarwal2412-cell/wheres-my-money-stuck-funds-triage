import { useMemo } from "react";
import { INVARIANTS, RULE_CASES } from "../domain/cases";
import { classify } from "../domain/classify";
import { CAUSES, ORDER } from "../domain/config";
import type { TriagedTransfer } from "../domain/types";
import { Card } from "./ui";

const rowStyle = { padding: "5px 0", borderBottom: "1px solid var(--line)" };

export function ChecksTab({ data }: { data: TriagedTransfer[] }) {
  const results = useMemo(() => {
    const cases = RULE_CASES.map((c) => {
      const got = classify(c.input).cause;
      return { ...c, got, ok: got === c.want };
    });
    const invs = INVARIANTS.map((i) => ({ name: i.name, ok: i.holds(data) }));
    return { cases, invs };
  }, [data]);

  const total = results.cases.length + results.invs.length;
  const pass = results.cases.filter((c) => c.ok).length + results.invs.filter((i) => i.ok).length;

  return (
    <div className="grid two">
      <Card>
        <h2>Rule checks, running live in your browser</h2>
        <p className="muted small">
          Hand-built cases aimed at the edges: exactly at the SLA line, two conditions true at once, money that arrived
          but was never posted. The same cases run in CI with Vitest. If a rule is wrong, a check turns red.
        </p>
        <p>
          <b className={pass === total ? "test-pass" : "test-fail"}>
            {pass} / {total} passing
          </b>
        </p>
        {results.cases.map((c) => (
          <div key={c.name} className="small" style={rowStyle}>
            <span className={c.ok ? "test-pass" : "test-fail"}>{c.ok ? "✓" : "✗"}</span> {c.name}{" "}
            <span className="muted mono">
              → {c.got}
              {c.ok ? "" : ` (wanted ${c.want})`}
            </span>
          </div>
        ))}
        {results.invs.map((i) => (
          <div key={i.name} className="small" style={rowStyle}>
            <span className={i.ok ? "test-pass" : "test-fail"}>{i.ok ? "✓" : "✗"}</span> {i.name}{" "}
            <span className="muted">(invariant over all {data.length} items)</span>
          </div>
        ))}
      </Card>
      <Card>
        <h2>Why the order of the rules matters</h2>
        <p>
          An item can match more than one reason. A deposit can be under compliance review <i>and</i> past SLA. The
          classifier takes the first rule that matches, in this order, and every case in the list tests one of those
          overlaps:
        </p>
        <ol className="small">
          {ORDER.map((c) => (
            <li key={c}>{CAUSES[c].label}</li>
          ))}
        </ol>
        <p className="small">
          The most important one is <b>"Arrived, not posted."</b> In a view that only shows status, it looks the same
          as a normal pending deposit. The partner has confirmed the money arrived, but it was never added to the
          customer's balance. You can only catch it by comparing the partner's record against the ledger, and nobody
          gets an alert for it because nothing technically failed.
        </p>
      </Card>
    </div>
  );
}

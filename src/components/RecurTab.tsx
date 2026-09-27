import { useMemo } from "react";
import { rankCauses } from "../domain/analytics";
import { CAUSES } from "../domain/config";
import { fmtAge, usd } from "../domain/format";
import type { TriagedTransfer } from "../domain/types";
import { Card, CausePill } from "./ui";

export function RecurTab({ data }: { data: TriagedTransfer[] }) {
  const rows = useMemo(() => rankCauses(data), [data]);
  return (
    <Card>
      <h2>Which reasons to fix first</h2>
      <p className="muted small">
        Ranked by customers affected × how long they wait. Each row has a proposed fix and the one number that tells us
        whether it worked. Synthetic data, so the ranking will look different on real data, but the method holds.
      </p>
      <div className="scroll" style={{ maxHeight: "none" }}>
        <table>
          <thead>
            <tr>
              <th>Reason</th>
              <th className="n">Items</th>
              <th className="n">USD stuck</th>
              <th className="n">Median age</th>
              <th className="n">Past SLA</th>
              <th>Fix the thing behind it</th>
              <th>How we'd know it worked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cause}>
                <td>
                  <CausePill cause={r.cause} />
                  <div className="small muted">owner: {CAUSES[r.cause].owner}</div>
                </td>
                <td className="n">{r.n}</td>
                <td className="n">{usd(r.usd)}</td>
                <td className="n">{fmtAge(r.medianAgeH)}</td>
                <td className="n">{Math.round(r.pastShare * 100)}%</td>
                <td className="small">{CAUSES[r.cause].fix}</td>
                <td className="small">{CAUSES[r.cause].metric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

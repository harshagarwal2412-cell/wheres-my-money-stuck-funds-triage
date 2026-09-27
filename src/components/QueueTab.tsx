import { useMemo } from "react";
import { EMPTY_FILTER, eventLog, filterQueue, kpis, type QueueFilter } from "../domain/analytics";
import { CAUSES, ORDER, RAILS, RAIL_IDS } from "../domain/config";
import { fmtAge, sum, usd } from "../domain/format";
import { message } from "../domain/messages";
import type { TriagedTransfer } from "../domain/types";
import { Card, CausePill, Kpi, TabLink } from "./ui";

interface Props {
  data: TriagedTransfer[];
  filter: QueueFilter;
  onFilter: (f: QueueFilter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenCustomer: (id: string) => void;
}

const OWNERS = [...new Set(Object.values(CAUSES).map((c) => c.owner))];
const MAX_ROWS = 300;

export function QueueTab({ data, filter, onFilter, selectedId, onSelect, onOpenCustomer }: Props) {
  const k = useMemo(() => kpis(data), [data]);
  const rows = useMemo(() => filterQueue(data, filter), [data, filter]);
  const selected = data.find((x) => x.id === selectedId);
  const set = (patch: Partial<QueueFilter>) => onFilter({ ...filter, ...patch });

  return (
    <>
      <div className="grid kpis">
        <Kpi value={k.open} label="open transfers in a synthetic snapshot" />
        <Kpi value={k.stuck} label="actually stuck (not just in transit)" />
        <Kpi value={usd(k.stuckUsd)} label="USD sitting in those" />
        <Kpi value={`${k.silentPct}%`} label="of stuck items where the customer was never told why" />
        <Kpi value={fmtAge(k.medianStuckAgeH)} label="median age of a stuck item" />
      </div>

      <div className="callout small">
        <b>The one to look at first:</b> {k.desyncCount} deposits ({usd(k.desyncUsd)}) have already settled at the
        partner with a matching reference and still aren't in the customer's balance. In a view that only shows status
        they look like normal pending. Nothing failed, so nothing alerted.{" "}
        <TabLink onGo={() => onFilter({ ...EMPTY_FILTER, cause: "DESYNC" })}>Show them</TabLink>
      </div>

      <div className="grid two">
        <Card>
          <div className="filters">
            <select value={filter.cause} onChange={(e) => set({ cause: e.target.value as QueueFilter["cause"] })}>
              <option value="">All reasons</option>
              {ORDER.map((c) => (
                <option key={c} value={c}>
                  {CAUSES[c].label}
                </option>
              ))}
            </select>
            <select value={filter.owner} onChange={(e) => set({ owner: e.target.value as QueueFilter["owner"] })}>
              <option value="">All owners</option>
              {OWNERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select value={filter.rail} onChange={(e) => set({ rail: e.target.value as QueueFilter["rail"] })}>
              <option value="">All rails</option>
              {RAIL_IDS.map((r) => (
                <option key={r} value={r}>
                  {RAILS[r].label}
                </option>
              ))}
            </select>
            <select value={filter.age} onChange={(e) => set({ age: e.target.value as QueueFilter["age"] })}>
              <option value="">Any age</option>
              <option value="breach">Past SLA</option>
              <option value="silent">Customer not told</option>
            </select>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rail</th>
                  <th className="n">USD</th>
                  <th className="n">Age</th>
                  <th>Reason</th>
                  <th>Next move</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, MAX_ROWS).map((x) => (
                  <tr key={x.id} className={`click ${selectedId === x.id ? "sel" : ""}`} onClick={() => onSelect(x.id)}>
                    <td className="mono">{x.id}</td>
                    <td>{RAILS[x.rail].label}</td>
                    <td className="n">{usd(x.amt)}</td>
                    <td className="n">
                      {x.past ? <b style={{ color: "var(--bad)" }}>{fmtAge(x.ageH)}</b> : fmtAge(x.ageH)}
                    </td>
                    <td>
                      <CausePill cause={x.cause} />
                    </td>
                    <td className="small">{CAUSES[x.cause].owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {rows.length} items · {usd(sum(rows.map((x) => x.amt)))}
          </p>
        </Card>

        <Card>
          {selected ? (
            <TransferDetail x={selected} onOpenCustomer={() => onOpenCustomer(selected.id)} />
          ) : (
            <p className="muted">Pick a row to see why it's stuck.</p>
          )}
        </Card>
      </div>
    </>
  );
}

function TransferDetail({ x, onOpenCustomer }: { x: TriagedTransfer; onOpenCustomer: () => void }) {
  const c = CAUSES[x.cause];
  return (
    <>
      <div className="small muted mono">
        {x.id} · customer {x.cust} · {x.country}
      </div>
      <h2 style={{ marginTop: 4 }}>
        {usd(x.amt)} · {RAILS[x.rail].label}
      </h2>
      <p>
        <CausePill cause={x.cause} />{" "}
        <span className="small muted">
          &nbsp;owner: <b>{c.owner}</b> · age {fmtAge(x.ageH)} of {RAILS[x.rail].sla}h SLA
        </span>
      </p>
      <h3>Why</h3>
      <p>{x.why}</p>
      <h3>Joined event log</h3>
      <div className="log">{eventLog(x)}</div>
      <h3 style={{ marginTop: 12 }}>What the customer should see</h3>
      <div className="msg">{message(x, "en").body}</div>
      <p className="small" style={{ marginTop: 10 }}>
        <TabLink onGo={onOpenCustomer}>Open on the customer's phone →</TabLink>
      </p>
    </>
  );
}

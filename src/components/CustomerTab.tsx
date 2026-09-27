import { CAUSES, RAILS } from "../domain/config";
import { usd } from "../domain/format";
import { STEP_LABELS, message } from "../domain/messages";
import type { Lang, TriagedTransfer } from "../domain/types";
import { Card } from "./ui";

interface Props {
  /** One example per reason, in rule order. */
  examples: TriagedTransfer[];
  pickedId: string;
  onPick: (id: string) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
}

export function CustomerTab({ examples, pickedId, onPick, lang, onLang }: Props) {
  const x = examples.find((e) => e.id === pickedId) ?? examples[0];
  if (!x) return null;
  const m = message(x, lang);
  const es = lang === "es";

  return (
    <div className="grid two">
      <Card>
        <h2>Same item, customer's side</h2>
        <p className="muted small">
          The facts (amount, step, reason, deadline) come from the rules. The wording is a fixed template in English or
          Spanish. An LLM could adjust the tone, but it never gets to decide what's true about someone's money.
        </p>
        <div className="filters">
          <select value={x.id} onChange={(e) => onPick(e.target.value)}>
            {examples.map((e) => (
              <option key={e.id} value={e.id}>
                {CAUSES[e.cause].label} — {usd(e.amt)}
              </option>
            ))}
          </select>
          <button className={`b ${lang === "es" ? "on" : ""}`} onClick={() => onLang("es")}>
            Español
          </button>
          <button className={`b ${lang === "en" ? "on" : ""}`} onClick={() => onLang("en")}>
            English
          </button>
        </div>
        <table>
          <tbody>
            <tr>
              <th>Today (from reviews)</th>
              <td>"Pending." No reason, no ETA. Customer opens a ticket.</td>
            </tr>
            <tr>
              <th>With this</th>
              <td>
                {CAUSES[x.cause].label}. Step {m.step + 1} of 4. A reason, and the one thing they need to do (if
                anything).
              </td>
            </tr>
            <tr>
              <th>Support sees</th>
              <td className="small">{x.why}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="phone">
          <div className="small muted">
            {es ? "Transferencia" : "Transfer"} · {RAILS[x.rail].label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 650 }}>{usd(x.amt)}</div>
          <div className="steps">
            {STEP_LABELS[lang].map((label, i) => {
              const cls = ["step", i < m.step ? "done" : "", i === m.step ? `now${m.bad ? " bad" : ""}` : ""]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={label} className={cls}>
                  {label}
                </div>
              );
            })}
          </div>
          <div className="msg">{m.body}</div>
          <p className="small muted" style={{ marginTop: 12 }}>
            {es ? "Actualizado hace 1 min" : "Updated 1 min ago"}
          </p>
        </div>
      </Card>
    </div>
  );
}

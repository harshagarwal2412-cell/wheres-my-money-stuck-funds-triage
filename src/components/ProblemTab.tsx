import { Card } from "./ui";

const COMPLAINTS: { tone: string; label: string; said: string; where: string }[] = [
  {
    tone: "p-bad",
    label: "Restricted, no reason",
    said: "Account locked or suspended during verification, not told why, balance stuck inside. One user had just deposited money for a medical emergency.",
    where: "Play, App Store (4+ reviews)",
  },
  {
    tone: "p-bad",
    label: "Deposit not showing",
    said: "A $2,100 wire pending more than a week with no reply; a transfer that went out from the bank but never showed as received.",
    where: "App Store",
  },
  {
    tone: "p-warn",
    label: "Rail down, money in flight",
    said: 'Bank transfers and MoneyGram "suddenly under maintenance," money stuck, about 12 days to resolve.',
    where: "Trustpilot, Play",
  },
  {
    tone: "p-warn",
    label: "Can't finish verification",
    said: "Verification codes by WhatsApp and email not arriving (Ecuador).",
    where: "App Store",
  },
  {
    tone: "p-acc",
    label: "Support goes quiet",
    said: "No reply, no escalation path, no explanation of the account action taken.",
    where: "All three",
  },
];

export function ProblemTab() {
  return (
    <div className="grid two">
      <Card>
        <h2>What customers are saying in public</h2>
        <p className="muted small">
          Read across Trustpilot, the App Store and Google Play, Sept 2026. Paraphrased, grouped by what actually went
          wrong.
        </p>
        <table>
          <thead>
            <tr>
              <th>What went wrong</th>
              <th>What they said, roughly</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            {COMPLAINTS.map((c) => (
              <tr key={c.label}>
                <td>
                  <span className={`pill ${c.tone}`}>{c.label}</span>
                </td>
                <td>{c.said}</td>
                <td className="small">{c.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 10 }}>
          Sources:{" "}
          <a href="https://www.trustpilot.com/review/ugly.cash" target="_blank" rel="noopener">
            Trustpilot
          </a>{" "}
          ·{" "}
          <a href="https://apps.apple.com/us/app/uglycash/id1587912468" target="_blank" rel="noopener">
            App Store
          </a>{" "}
          ·{" "}
          <a href="https://play.google.com/store/apps/details?id=rsv.walletapp.reserve" target="_blank" rel="noopener">
            Google Play
          </a>
        </p>
      </Card>
      <Card>
        <h2>Why this is one problem, not five</h2>
        <p>
          Ratings are strong overall (4.7 on Play across 17.7K reviews, 4.4 on the App Store). The 1-stars aren't about
          the product being bad. They're about a gap in <b>what the customer is told while money is in between states</b>.
        </p>
        <p>
          A restriction might be completely correct. A wire might be sitting at the partner waiting on a missing
          reference. A rail might really be down. The system usually knows which of these it is. The customer just sees
          "pending," and support has to go digging in three tools to find out.
        </p>
        <p>
          Once a customer can't tell why their money is stuck, they stop trusting it's safe, even when it is. And every
          one of those turns into a ticket that someone has to trace by hand.
        </p>
        <div className="callout small">
          <b>The bet:</b> if every stuck item has a named reason, an owner and a message, three things improve at once:
          fewer "where's my money" tickets, faster resolution on the ones that are left, and a ranked list of what's
          actually causing them.
        </div>
      </Card>
    </div>
  );
}

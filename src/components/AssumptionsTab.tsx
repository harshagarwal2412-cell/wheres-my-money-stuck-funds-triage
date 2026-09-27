import { Card } from "./ui";

export function AssumptionsTab() {
  return (
    <div className="grid two">
      <Card>
        <h2>What's sourced vs. what's assumed</h2>
        <h3>From public sources</h3>
        <ul className="tight small">
          <li>Complaint themes and ratings (Trustpilot, App Store, Play, Sept 2026).</li>
          <li>
            Money comes in via US, EU and Mexican bank accounts and crypto; out via bank, cash pickup, and a Visa card
            (ugly.cash, press coverage).
          </li>
          <li>30K+ monthly actives across several Latin American countries (company site, Zerion case study).</li>
        </ul>
        <h3>Assumed, to be confirmed</h3>
        <ul className="tight small">
          <li>SLAs per rail: ACH 3 days, wire 1 day, SPEI and crypto 1 hour, bank payout 2 days, cash pickup 1 day.</li>
          <li>How compliance holds are recorded and whether the customer gets told automatically.</li>
          <li>Whether partner webhooks and ledger entries share an ID, or have to be matched on amount + time + reference.</li>
          <li>How often rails really go into maintenance, and whether the app blocks new transfers into them.</li>
        </ul>
      </Card>
      <Card>
        <h2>Rollout plan</h2>
        <ol className="small">
          <li>
            Pull 30 days of "where's my money" tickets and tag each one by hand with the reasons here. See which reasons
            are missing and which are wrong.
          </li>
          <li>
            Sit with support for a few shifts and time how long it takes to answer "why is this stuck" today, and which
            tools they open to find out.
          </li>
          <li>
            With engineering, find the join key between partner events and ledger entries. The "arrived, not posted"
            check depends on it.
          </li>
          <li>
            Ship the smallest useful piece first: the reason + owner column in the support tool. Customer-facing messages
            come after the reasons have proven accurate.
          </li>
          <li>
            Measure: "where's my money" tickets per 1,000 transfers, median time to resolve, and % of stuck items where
            the customer was told the reason within an hour.
          </li>
        </ol>
      </Card>
    </div>
  );
}

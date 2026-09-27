import { useMemo, useState } from "react";
import { AssumptionsTab } from "./components/AssumptionsTab";
import { ChecksTab } from "./components/ChecksTab";
import { CustomerTab } from "./components/CustomerTab";
import { ProblemTab } from "./components/ProblemTab";
import { QueueTab } from "./components/QueueTab";
import { RecurTab } from "./components/RecurTab";
import { TabLink } from "./components/ui";
import { EMPTY_FILTER, type QueueFilter } from "./domain/analytics";
import { ORDER } from "./domain/config";
import { buildSnapshot } from "./domain/synthetic";
import type { Lang } from "./domain/types";

type TabId = "problem" | "queue" | "customer" | "recur" | "checks" | "assumptions";

const TABS: { id: TabId; label: string }[] = [
  { id: "problem", label: "1 · The problem" },
  { id: "queue", label: "2 · Triage queue" },
  { id: "customer", label: "3 · What the customer sees" },
  { id: "recur", label: "4 · Stop it recurring" },
  { id: "checks", label: "5 · How it's checked" },
  { id: "assumptions", label: "6 · Assumptions & rollout" },
];

export default function App() {
  const data = useMemo(() => buildSnapshot(), []);
  const examples = useMemo(
    () => ORDER.map((c) => data.find((x) => x.cause === c)).filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [data],
  );

  const [tab, setTab] = useState<TabId>("problem");
  const [filter, setFilter] = useState<QueueFilter>(EMPTY_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(() => data.find((x) => x.cause === "DESYNC")?.id ?? null);
  const [customerId, setCustomerId] = useState<string>(() => examples[0]?.id ?? "");
  const [lang, setLang] = useState<Lang>("es");

  const go = (t: TabId) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const openOnCustomerPhone = (id: string) => {
    setCustomerId(id);
    go("customer");
  };

  // The customer tab offers one example per reason; include the selected item if it isn't one of them.
  const customerExamples = examples.some((e) => e.id === customerId)
    ? examples
    : [...examples, ...data.filter((x) => x.id === customerId)];

  return (
    <div className="wrap">
      <header>
        <div className="tag">Case study · Harsh Agarwal</div>
        <h1>Where's my money?</h1>
        <p className="lede">
          Read enough of UGLYCASH's 1-star reviews and one story keeps coming back: money is stuck, and nobody tells
          the customer why. This is a triage console that joins the three places a transfer's truth lives (the payment
          partner, the ledger, and compliance), names the actual reason each item is stuck, tells support who owns the
          next step, and drafts the message the customer should have gotten.
        </p>
        <p className="small muted">
          All transaction data here is synthetic and generated in your browser. Real rails, partners and SLAs aren't
          public, so the assumptions are listed in <TabLink onGo={() => go("assumptions")}>Assumptions & rollout</TabLink>.
        </p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "problem" && <ProblemTab />}
      {tab === "queue" && (
        <QueueTab
          data={data}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenCustomer={openOnCustomerPhone}
        />
      )}
      {tab === "customer" && (
        <CustomerTab examples={customerExamples} pickedId={customerId} onPick={setCustomerId} lang={lang} onLang={setLang} />
      )}
      {tab === "recur" && <RecurTab data={data} />}
      {tab === "checks" && <ChecksTab data={data} />}
      {tab === "assumptions" && <AssumptionsTab />}

      <footer>
        Harsh Agarwal · Not affiliated with or endorsed by UGLYCASH. Synthetic data only; no real customer or
        transaction information is used.
      </footer>
    </div>
  );
}

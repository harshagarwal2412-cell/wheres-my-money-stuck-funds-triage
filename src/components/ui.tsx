import type { ReactNode } from "react";
import { CAUSES } from "../domain/config";
import type { CauseId } from "../domain/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CausePill({ cause }: { cause: CauseId }) {
  const c = CAUSES[cause];
  return <span className={`pill ${c.pill}`}>{c.label}</span>;
}

export function Kpi({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="card kpi">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

/** An in-page link that switches tabs instead of navigating. */
export function TabLink({ onGo, children }: { onGo: () => void; children: ReactNode }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onGo();
      }}
    >
      {children}
    </a>
  );
}

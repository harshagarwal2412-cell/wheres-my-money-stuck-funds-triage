import { describe, expect, it } from "vitest";
import { filterQueue, kpis, rankCauses, EMPTY_FILTER } from "./analytics";
import { INVARIANTS, RULE_CASES, base } from "./cases";
import { classify } from "./classify";
import { MIX, buildSnapshot } from "./synthetic";
import { fmtAge, median } from "./format";
import { message } from "./messages";

describe("classify: rule precedence and edge cases", () => {
  it.each(RULE_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    expect(classify(c.input).cause).toBe(c.want);
  });

  it("always explains itself", () => {
    for (const c of RULE_CASES) expect(classify(c.input).why.length).toBeGreaterThan(10);
  });
});

describe("synthetic snapshot", () => {
  const data = buildSnapshot();

  it("is deterministic for a given seed", () => {
    expect(buildSnapshot().map((x) => x.id)).toEqual(data.map((x) => x.id));
  });

  it("contains every scenario in the configured mix", () => {
    expect(data.length).toBe(MIX.reduce((s, [, n]) => s + n, 0));
    for (const [cause, n] of MIX) {
      expect(data.filter((x) => x.cause === cause).length, cause).toBe(n);
    }
  });

  it.each(INVARIANTS.map((i) => [i.name, i] as const))("invariant: %s", (_n, inv) => {
    expect(inv.holds(data)).toBe(true);
  });

  it("is sorted oldest first", () => {
    for (let i = 1; i < data.length; i++) expect(data[i - 1].ageH).toBeGreaterThanOrEqual(data[i].ageH);
  });
});

describe("analytics", () => {
  const data = buildSnapshot();

  it("KPIs exclude on-track items from 'stuck'", () => {
    const k = kpis(data);
    expect(k.stuck).toBe(data.length - data.filter((x) => x.cause === "ON_TRACK").length);
    expect(k.silentPct).toBeGreaterThan(0);
    expect(k.silentPct).toBeLessThanOrEqual(100);
  });

  it("filters combine with AND", () => {
    const rows = filterQueue(data, { ...EMPTY_FILTER, cause: "LATE", age: "breach" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((x) => x.cause === "LATE" && x.past)).toBe(true);
  });

  it("ranking is ordered by volume × median wait and excludes on-track", () => {
    const r = rankCauses(data);
    expect(r.find((x) => x.cause === "ON_TRACK")).toBeUndefined();
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].n * r[i - 1].medianAgeH).toBeGreaterThanOrEqual(r[i].n * r[i].medianAgeH);
    }
  });
});

describe("customer messages", () => {
  it("has copy in both languages for every scenario in the snapshot", () => {
    for (const x of buildSnapshot()) {
      expect(message(x, "en").body).toContain("$");
      expect(message(x, "es").body).toContain("$");
    }
  });

  it("marks on-track items as not a problem", () => {
    const x = { ...base({ ageH: 1 }), cause: "ON_TRACK" as const, why: "", past: false, told: true };
    expect(message(x, "en").bad).toBe(false);
  });
});

describe("format helpers", () => {
  it("fmtAge picks minutes, hours or days", () => {
    expect(fmtAge(0.5)).toBe("30m");
    expect(fmtAge(5)).toBe("5.0h");
    expect(fmtAge(30)).toBe("30h");
    expect(fmtAge(72)).toBe("3.0d");
    expect(fmtAge(-4)).toBe("0m");
  });

  it("median handles odd, even and empty inputs", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

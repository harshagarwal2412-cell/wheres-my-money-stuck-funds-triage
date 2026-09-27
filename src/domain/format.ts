/** Compact age: minutes under 1h, hours under 48h, otherwise days. */
export function fmtAge(hours: number): string {
  const h = Math.max(0, hours);
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export const usd = (n: number): string => "$" + Math.round(n).toLocaleString("en-US");

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const sum = (values: number[]): number => values.reduce((s, v) => s + v, 0);

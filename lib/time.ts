// Entity dates as the collection holds them: exact years, ranges, centuries, eras, refusals.
export type When = {
  year: number | null;
  from: number | null;
  to: number | null;
  precision: "year" | "range" | "century" | "era" | "none";
  label: string;
};

const NONE: When = { year: null, from: null, to: null, precision: "none", label: "—" };

// span is the display string; from/to are signed years (negative = BCE).
const ERAS: { name: string; from: number; to: number; span: string }[] = [
  { name: "Safavid", from: 1501, to: 1736, span: "1500–1736" },
  { name: "Qajar", from: 1789, to: 1925, span: "1790–1925" },
  { name: "Edo", from: 1603, to: 1868, span: "1600–1868" },
  { name: "Meiji", from: 1868, to: 1912, span: "1868–1912" },
  { name: "Showa", from: 1926, to: 1989, span: "1926–89" },
  { name: "Achaemenid", from: -550, to: -330, span: "550–330 BCE" },
];

const DASH = "[-\\u2013\\u2014\\u2012]";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 < 4 ? n % 10 : 0]}`;
}

// Midpoint is truncated toward zero so the same input always lands on one year.
const mid = (a: number, b: number) => Math.trunc((a + b) / 2);

export function parseWhen(y: string): When {
  let s = (y || "").trim().replace(/\s+/g, " ");
  if (!s) return NONE;

  const bce = /\b(?:bce|bc)\b\.?/i.test(s);
  if (bce) s = s.replace(/\b(?:bce|bc)\b\.?/i, "").trim();
  const sign = bce ? -1 : 1;

  const circa = /^(?:circa|ca\.?|c\.?)\s*(?=\d)/i.test(s);
  if (circa) s = s.replace(/^(?:circa|ca\.?|c\.?)\s*/i, "");
  const c = circa ? "c. " : "";
  const suf = bce ? " BCE" : "";

  const cen = s.match(/^(\d{1,2})(?:st|nd|rd|th)\s+c(?:entury|\.)?/i);
  if (cen) {
    const n = parseInt(cen[1], 10);
    const from = bce ? -n * 100 : (n - 1) * 100 + 1;
    const to = bce ? -((n - 1) * 100 + 1) : n * 100;
    const label = bce ? `${ordinal(n)} c. BCE` : n === 1 ? "1st c." : `c. ${(n - 1) * 100}s`;
    return { year: mid(from, to), from, to, precision: "century", label };
  }

  for (const e of ERAS) {
    if (new RegExp(`\\b${e.name}\\b`, "i").test(s)) {
      return { year: mid(e.from, e.to), from: e.from, to: e.to, precision: "era", label: `${e.name} · c. ${e.span}` };
    }
  }

  const r = s.match(new RegExp(`(\\d{1,4})\\s*${DASH}\\s*(\\d{1,4})`));
  if (r && (bce || r[1].length >= 3)) {
    let b = r[2];
    if (b.length < r[1].length) b = r[1].slice(0, r[1].length - b.length) + b;
    let from = sign * parseInt(r[1], 10);
    let to = sign * parseInt(b, 10);
    if (from > to) [from, to] = [to, from];
    const a = Math.abs(from), z = Math.abs(to);
    // Same-century positive ranges abbreviate the end ("1921–40").
    const short = !bce && String(a).length === 4 && String(a).slice(0, 2) === String(z).slice(0, 2);
    const label = `${c}${a}–${short ? String(z).slice(2) : z}${suf}`;
    return { year: mid(from, to), from, to, precision: "range", label };
  }

  const m = s.match(bce ? /\d{1,4}/ : /\d{3,4}/);
  if (m) {
    const year = sign * parseInt(m[0], 10);
    return { year, from: year, to: year, precision: "year", label: `${c}${Math.abs(year)}${suf}` };
  }
  return NONE;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

export function dayMonth(now: Date): string {
  return `${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

// Time of day is always the viewer's now; only the year belongs to the entity.
export function formatClock(now: Date, when: When | null): { date: string; time: string } {
  const year = when ? when.label : String(now.getFullYear());
  return {
    date: `${dayMonth(now)} ${year}`,
    time: `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`,
  };
}

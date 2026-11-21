export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Normalizes DB timestamp values to YYYY-MM-DD for display.
 *
 * Some drivers return TIMESTAMPTZ as a Date object while others return an ISO
 * string. Rendering code must never assume `.slice()` exists, otherwise a
 * single Date-valued row crashes the whole page (React error boundary).
 */
export function formatDateOnly(
  value: string | Date | number | null | undefined,
  fallback = "\u2014"
): string {
  if (value === null || value === undefined) return fallback;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text) return fallback;

  // Fast path: already an ISO/yyyy-mm-dd value. Keep the literal date instead
  // of shifting it through a timezone while parsing.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

/**
 * Formats an ISO timestamp as IST (Asia/Kolkata) time.
 * Serverless providers (Vercel) run in UTC, so plain toLocaleTimeString()
 * returns UTC hours and off-by-5:30 messages. This makes server-side
 * notification/activity text show the correct local time.
 */
export function formatTimeIST(iso: string | Date, opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    ...opts,
  });
}

/**
 * Minutes-of-day (0–1439) of a given instant as seen in IST (Asia/Kolkata).
 * Shift times like "10:00" are IST, but serverless hosts run in UTC, so
 * comparing them with local setHours() is off by 5:30. This is the display
 * timezone used for attendance everywhere (formatTimeIST etc.).
 */
export function istMinutesOfDay(iso: string | Date | number): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

/**
 * Formats a client as "Company Name (Contact Person)".
 * Falls back to just the contact name when no company is set.
 * e.g. "AK Enterprise (Sudhir Thakor)".
 */
export function formatClientName(
  company: string | null | undefined,
  name: string | null | undefined
): string {
  const co = (company || "").trim();
  const person = (name || "").trim();
  if (co && person) return `${co} (${person})`;
  return co || person || "—";
}

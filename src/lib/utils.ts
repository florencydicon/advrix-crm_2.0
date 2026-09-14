export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
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

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

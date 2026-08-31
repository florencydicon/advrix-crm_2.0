export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
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

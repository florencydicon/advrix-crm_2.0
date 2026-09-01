const WA_NUMBER = "919773124598";

/** Normalize a contact number to the international digits wa.me expects. */
export function normalizeWaNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = "91" + digits.slice(1);
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = "91" + digits;
  return digits;
}

export function openWhatsApp(text: string) {
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/** Open a wa.me deep link to a specific number (used for admin → employee). */
export function openWhatsAppTo(rawNumber: string | null | undefined, text: string) {
  const digits = normalizeWaNumber(rawNumber);
  if (!digits) return false;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  return true;
}

function mapsLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function fmtCoord(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(6);
}

export function buildCheckInMessage(args: {
  name: string;
  role: string;
  status: string;
  time: string;
  date: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const link = mapsLink(args.latitude ?? null, args.longitude ?? null);
  const lines = [
    "[CHECK IN]",
    "",
    `Name: ${args.name}`,
    `Role: ${args.role}`,
    `Date: ${args.date}`,
    `Time: ${args.time}`,
    `Status: ${args.status}`,
  ];
  lines.push(`Lat/Long: ${fmtCoord(args.latitude ?? null)}, ${fmtCoord(args.longitude ?? null)}`);
  if (link) lines.push(`Location Link: ${link}`);
  return lines.join("\n");
}

export function buildCheckOutMessage(args: {
  name: string;
  role: string;
  time: string;
  date: string;
  hoursWorked: number;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const link = mapsLink(args.latitude ?? null, args.longitude ?? null);
  const lines = [
    "[CHECK OUT]",
    "",
    `Name: ${args.name}`,
    `Role: ${args.role}`,
    `Date: ${args.date}`,
    `Time: ${args.time}`,
    `Hours Worked: ${args.hoursWorked}h`,
  ];
  lines.push(`Lat/Long: ${fmtCoord(args.latitude ?? null)}, ${fmtCoord(args.longitude ?? null)}`);
  if (link) lines.push(`Location Link: ${link}`);
  return lines.join("\n");
}

export function buildLeaveMessage(args: {
  name: string;
  role: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}) {
  return [
    "🌴 LEAVE APPLICATION",
    "",
    `Name: ${args.name} (${args.role})`,
    `Type: ${args.leaveType}`,
    `From: ${args.startDate}  To: ${args.endDate}  (${args.days} day${args.days > 1 ? "s" : ""})`,
    `Reason: ${args.reason}`,
  ].join("\n");
}

/** Message shown to the employee when the Super Admin approves/rejects their leave. */
export function buildLeaveDecisionMessage(args: {
  status: "approved" | "rejected";
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
}) {
  const icon = args.status === "approved" ? "✅" : "❌";
  const lines = [
    `${icon} LEAVE ${args.status.toUpperCase()}`,
    "",
    `Your ${args.leaveType} leave request has been ${args.status}.`,
    `From: ${args.startDate}  To: ${args.endDate}  (${args.days} day${args.days > 1 ? "s" : ""})`,
  ];
  if (args.status === "rejected" && args.reason) lines.push(`Reason: ${args.reason}`);
  return lines.join("\n");
}

const WA_NUMBER = "919773124598";

export function openWhatsApp(text: string) {
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export function buildCheckInMessage(args: {
  name: string;
  role: string;
  status: string;
  time: string;
  date: string;
  location?: string | null;
}) {
  const lines = [
    "🟢 CHECK-IN",
    "",
    `Name: ${args.name} (${args.role})`,
    `Date: ${args.date}`,
    `Time: ${args.time}`,
    `Status: ${args.status}`,
  ];
  if (args.location) lines.push(`Location: ${args.location}`);
  return lines.join("\n");
}

export function buildCheckOutMessage(args: {
  name: string;
  role: string;
  time: string;
  date: string;
  hoursWorked: number;
  location?: string | null;
}) {
  const lines = [
    "🔴 CHECK-OUT",
    "",
    `Name: ${args.name} (${args.role})`,
    `Date: ${args.date}`,
    `Time: ${args.time}`,
    `Hours Worked: ${args.hoursWorked}h`,
  ];
  if (args.location) lines.push(`Location: ${args.location}`);
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

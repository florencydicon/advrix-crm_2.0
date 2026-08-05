const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Real phone numbers: digits/spaces/dashes/plus, 7-15 digits.
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{5,18}[0-9]$/;

const NAME_RE = /^[A-Za-z\u00C0-\u017F][A-Za-z\u00C0-\u017F'.\- ]{1,60}$/;

// Words / patterns that indicate placeholder or dummy input.
const PLACEHOLDER_RE =
  /test|dummy|placeholder|sample|example|asdf|qwerty|zzz|foo|bar|baz|lorem|random|temp|dummy|unknown|n\/a|\bnone\b|demo|123|abc|xyz|name@|@email|@test|\.com\.com/;

const WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "passw0rd",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "admin",
  "administrator",
  "letmein",
  "welcome",
  "iloveyou",
  "monkey",
  "dragon",
  "111111",
  "abc123",
  "password1",
]);

export interface FieldError {
  field: string;
  message: string;
}

function looksPlaceholder(value: string): boolean {
  return PLACEHOLDER_RE.test(value.toLowerCase());
}

export function validateEmail(email: string): string | null {
  const v = String(email || "").trim();
  if (!v) return "Email is required.";
  if (v.length > 200) return "Email is too long.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address (e.g. name@company.com).";
  if (looksPlaceholder(v)) return "This email appears to be placeholder data. Enter a real email.";
  const [local] = v.split("@");
  if ((local || "").length < 2) return "Email local-part is too short.";
  return null;
}

export function validatePhone(phone: string): string | null {
  const v = String(phone || "").trim();
  if (!v) return null; // optional
  if (v.length > 20) return "Phone number is too long.";
  if (!PHONE_RE.test(v)) return "Enter a valid phone number (digits, +, spaces or dashes, 7-15 digits).";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Phone number must contain 7-15 digits.";
  return null;
}

export function validateFullName(name: string): string | null {
  const v = String(name || "").trim();
  if (!v) return "Full name is required.";
  if (v.length < 3) return "Full name must be at least 3 characters.";
  if (v.length > 80) return "Full name is too long.";
  if (!NAME_RE.test(v)) return "Name may only contain letters, spaces, apostrophes and dots.";
  const words = v.split(/\s+/).filter(Boolean);
  if (words.length < 2) return "Enter a first and last name.";
  if (words.some((w) => w.length < 2)) return "Each name part must be at least 2 characters.";
  if (looksPlaceholder(v)) return "This name appears to be placeholder data. Enter a real name.";
  return null;
}

export function validateText(value: string, label: string, min = 3, max = 500): string | null {
  const v = String(value || "").trim();
  if (!v) return `${label} is required.`;
  if (v.length < min) return `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} is too long (max ${max}).`;
  if (looksPlaceholder(v)) return `This ${label.toLowerCase()} appears to be placeholder data.`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password is too long (max 72 characters).";
  if (WEAK_PASSWORDS.has(password.toLowerCase())) return "This password is too common. Choose a stronger one.";
  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) return "Password must contain both letters and numbers.";
  return null;
}

export function validateQuantity(qty: number): string | null {
  if (!Number.isInteger(qty) || qty < 1) return "Quantity must be a whole number of at least 1.";
  if (qty > 500) return "Quantity cannot exceed 500 per category.";
  return null;
}

export function validateBrief(brief: string): string | null {
  const v = String(brief || "").trim();
  if (!v) return "Project brief is required.";
  if (v.length < 20) return "Project brief must be at least 20 characters — describe the campaign goal and audience.";
  if (v.length > 2000) return "Project brief is too long (max 2000 characters).";
  if (looksPlaceholder(v)) return "This brief appears to be placeholder data.";
  return null;
}

export function validateDeliverables(
  deliverables: { key: string; label: string; quantity: number; isCustom: boolean; customLabel?: string | null }[]
): FieldError[] {
  const errors: FieldError[] = [];
  const total = deliverables.reduce((s, d) => s + d.quantity, 0);
  if (total < 1) errors.push({ field: "deliverables", message: "Select at least one deliverable with a quantity." });

  for (const d of deliverables) {
    if (d.quantity < 1) continue;
    const qErr = validateQuantity(d.quantity);
    if (qErr) errors.push({ field: `qty_${d.key}`, message: qErr });
    if (d.isCustom) {
      const label = String(d.customLabel || "").trim();
      const lErr = validateText(label, "Custom deliverable name", 3, 60);
      if (lErr) errors.push({ field: `custom_${d.key}`, message: lErr });
    }
  }
  return errors;
}

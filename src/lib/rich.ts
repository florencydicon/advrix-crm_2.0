const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "span",
]);

const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

const DANGEROUS_BLOCK =
  /<\s*(script|style|iframe|object|embed|noscript|form|template|textarea|select|option|button|input|link|meta|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_SELF =
  /<\s*(script|style|iframe|object|embed|noscript|form|template|textarea|select|option|button|input|link|meta|svg|math)\b[^>]*\/?>/gi;
const EVENT_ATTR = /\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SCRIPT_URL =
  /\s+(href|src|action|formaction|background|poster)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi;

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wholesaler: strips every non-whitelisted tag/attribute, kills script/style
 * blocks and javascript: URLs. Environment-agnostic (no DOM) so it is safe to
 * run during SSR and on the client. Plain text with no markup passes through.
 */
export function sanitizeRich(input?: string | null): string {
  if (!input) return "";
  let s = String(input);
  if (s.length > 200_000) s = s.slice(0, 200_000);

  let prev: string;
  do {
    prev = s;
    s = s.replace(DANGEROUS_BLOCK, "");
  } while (s !== prev);
  s = s.replace(DANGEROUS_SELF, "");

  s = s.replace(EVENT_ATTR, "");
  s = s.replace(SCRIPT_URL, "");

  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs: string, inner: string) => {
    const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const url = href ? href[2] || href[3] || "" : "";
    if (/^(https?:|mailto:|tel:)/i.test(url)) {
      return `<a href="${escapeAttr(url)}" rel="noopener noreferrer">${sanitizeRich(inner)}</a>`;
    }
    return sanitizeRich(inner);
  });

  s = s.replace(TAG_PATTERN, (m, name: string) => {
    const isClose = m.startsWith("</");
    const tag = name.toLowerCase();
    if (tag === "br") return "<br>";
    if (tag === "div") return isClose ? "</p>" : "<p>";
    if (tag === "a") {
      if (isClose) return "</a>";
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(m);
      const url = href ? href[2] || href[3] || "" : "";
      return /^(https?:|mailto:|tel:)/i.test(url)
        ? `<a href="${escapeAttr(url)}" rel="noopener noreferrer">`
        : "";
    }
    if (ALLOWED_TAGS.has(tag)) return isClose ? `</${tag}>` : `<${tag}>`;
    return escapeText(m);
  });

  return s;
}

/**
 * Collapses rich HTML to plain text (used for emptiness checks, char
 * counters, WhatsApp/audit snippets and plain-text fallbacks).
 */
export function richToPlain(input?: string | null): string {
  if (!input) return "";
  return String(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|blockquote|tr)>/gi, "\n")
    .replace(/<\/?(ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isEmptyRich(input?: string | null): boolean {
  return richToPlain(input).length === 0;
}
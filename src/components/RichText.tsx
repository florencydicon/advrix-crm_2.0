"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Bold, Italic, Underline, Heading2, List, ListOrdered, RotateCcw, Paintbrush } from "lucide-react";
import { sanitizeRich, richToPlain, isEmptyRich } from "@/lib/rich";

/**
 * Read-safe rich text renderer. Plain/tag-less strings are rendered as
 * pre-wrapped text, so legacy content and server-written fields never display
 * raw markup. Anything that looks like HTML is sanitized before injection.
 */
export function RichText({
  html,
  className = "",
  fallback = "—",
}: {
  html?: string | null;
  className?: string;
  fallback?: string;
}) {
  const raw = html ? String(html) : "";
  if (isEmptyRich(raw)) {
    return <p className={className}>{fallback}</p>;
  }
  const looksHtml =
    /<(?:p|br|ul|ol|li|h[1-4]|blockquote|b|strong|i|em|u|s|span|a)\b/i.test(raw) ||
    /&(?:lt|gt|amp|quot|nbsp);/i.test(raw);
  if (!looksHtml) {
    return <p className={`${className} whitespace-pre-wrap`}>{raw}</p>;
  }
  return <div className={`rich-body ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRich(raw) }} />;
}

interface EditorProps {
  value: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  minRows?: number;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Lightweight WYSIWYG over a contentEditable div using execCommand. Output is
 * sanitized HTML; the container stays uncontrolled during typing so React never
 * re-writes the DOM (which would break the caret). External value resets (save /
 * refresh) are synced back via the effect.
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows = 3,
  maxLength = 20000,
  disabled,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState(() => sanitizeRich(value));
  const lastVal = useRef<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const incoming = sanitizeRich(value);
    if (incoming === lastVal.current && node.innerHTML === incoming) return;
    node.innerHTML = incoming;
    lastVal.current = incoming;
    setSeed(incoming);
  }, [value]);

  function sync() {
    const node = ref.current;
    if (!node) return;
    const safe = sanitizeRich(node.innerHTML || "");
    if (safe !== node.innerHTML) node.innerHTML = safe;
    lastVal.current = safe;
    onChange?.(safe);
  }

  function run(command: string, arg?: string) {
    const node = ref.current;
    if (!node || disabled) return;
    node.focus();
    // execCommand needs the caret to be established first.
    setTimeout(() => {
      if (!ref.current) return;
      document.execCommand(command, false, arg);
      sync();
      ref.current.focus();
    }, 0);
  }

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const raw = e.clipboardData?.getData("text/plain") || "";
    e.preventDefault();
    const current = ref.current ? richToPlain(ref.current.innerHTML || "") : "";
    const remaining = maxLength - current.length;
    if (remaining <= 0) return;
    document.execCommand("insertText", false, raw.length > remaining ? raw.slice(0, remaining) : raw);
    sync();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "Backspace" || e.key === "Delete" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && ref.current && richToPlain(ref.current.innerHTML || "").length >= maxLength) {
      e.preventDefault();
    }
  }

  const plain = richToPlain(seed);
  const showPlaceholder = !isEmptyRich(seed) === false && !!placeholder && plain.length === 0;

  const buttons: { title: string; icon: React.ReactNode; cmd: () => void }[] = [
    { title: "Bold", icon: <Bold className="h-3.5 w-3.5" />, cmd: () => run("bold") },
    { title: "Italic", icon: <Italic className="h-3.5 w-3.5" />, cmd: () => run("italic") },
    { title: "Underline", icon: <Underline className="h-3.5 w-3.5" />, cmd: () => run("underline") },
    { title: "Heading", icon: <Heading2 className="h-3.5 w-3.5" />, cmd: () => run("formatBlock", "<h3>") },
    { title: "Bullet list", icon: <List className="h-3.5 w-3.5" />, cmd: () => run("insertUnorderedList") },
    { title: "Numbered list", icon: <ListOrdered className="h-3.5 w-3.5" />, cmd: () => run("insertOrderedList") },
    { title: "Remove formatting", icon: <Paintbrush className="h-3.5 w-3.5" />, cmd: () => run("removeFormat") },
    { title: "Undo", icon: <RotateCcw className="h-3.5 w-3.5" />, cmd: () => run("undo") },
  ];

  return (
    <div className={`rounded-lg border border-white/10 bg-night-900 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-white/[0.06]">
        {buttons.map((b) => (
          <button
            key={b.title}
            type="button"
            title={b.title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.cmd}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {b.icon}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-slate-600 tabular-nums pr-1">
          {plain.length}
          {maxLength ? `/${maxLength}` : ""}
        </span>
      </div>
      <div className="relative">
        {showPlaceholder && (
          <p className="absolute top-0 left-0 px-3 py-2 text-xs text-slate-600 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={sync}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => onBlur?.(lastVal.current ?? sanitizeRich(ref.current?.innerHTML || ""))}
          className="px-3 py-2 text-xs text-slate-200 outline-none rich-body whitespace-pre-wrap"
          style={{ minHeight: `${minRows * 26}px` }}
          dangerouslySetInnerHTML={{ __html: seed }}
        />
      </div>
    </div>
  );
}
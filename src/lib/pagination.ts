/**
 * Shared pagination primitives.
 *
 * Lives outside any `"use server"` module because Server Action files are only
 * allowed to export async functions.
 */

/** Page sizes offered by every paginated list in the app. */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Coerce arbitrary input to a supported page size (default 25). */
export function clampPageSize(n: number | null | undefined): PageSize {
  const v = Number(n);
  return (PAGE_SIZES as readonly number[]).includes(v) ? (v as PageSize) : 25;
}

/** Clamp a 1-based page number to at least 1. */
export function clampPage(n: number | null | undefined): number {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 1 ? v : 1;
}
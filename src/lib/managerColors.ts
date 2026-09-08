/**
 * Deterministic dark-mode friendly badge colors for Project Manager pills.
 * Same name always yields same variant, evenly distributed via hash % length.
 */
const MANAGER_COLOR_VARIANTS = [
  "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  "bg-pink-500/20 text-pink-300 border border-pink-500/30",
] as const;

export function getManagerColorVariant(managerName: string): string {
  if (!managerName) return MANAGER_COLOR_VARIANTS[0];
  let hash = 0;
  for (let i = 0; i < managerName.length; i++) {
    hash = managerName.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // convert to 32-bit
  }
  const idx = Math.abs(hash) % MANAGER_COLOR_VARIANTS.length;
  return MANAGER_COLOR_VARIANTS[idx];
}

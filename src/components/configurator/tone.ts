/**
 * A status badge's hue, laid over `Badge` from the call site because the
 * installed primitive is replaced on the next `shadcn add --overwrite`. A
 * tint rather than a fill, so a badge never reads as the filled button
 * beside it: green where the person can go on, amber where something is in
 * the way, blue where an offer waits for them (docs/ui.md).
 */
export const TONE = {
  positive: "border-positive/25 bg-positive/10 text-positive",
  caution: "border-caution/25 bg-caution/10 text-caution",
  info: "border-info/25 bg-info/10 text-info",
} as const;

export type Tone = keyof typeof TONE;

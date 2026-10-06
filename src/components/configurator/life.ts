/**
 * The stages of a lift's life, as the canvas and the proposal name them, and
 * the catalogue's families read against them. Footprinting gives the carbon
 * of each stage itself; the price of each is the view's `stages`, a sum by
 * family, and every family that is not installing, maintaining or ending the
 * lift is part of making it.
 */
import type { Carbon, Stage } from "./provider";

export const LIFE = [
  { stage: "made", words: "Making it" },
  { stage: "installed", words: "Installing it" },
  { stage: "maintained", words: "Maintaining it" },
  { stage: "run", words: "Running it" },
  { stage: "ended", words: "At the end of its life" },
] as const satisfies readonly { stage: keyof Carbon; words: string }[];

export type Life = (typeof LIFE)[number]["stage"];

/** The catalogue families that are a stage of the lift's life in their own right. */
const FAMILY: Record<string, Life> = {
  installation: "installed",
  maintenance: "maintained",
  "end-of-life": "ended",
};

/** A family's stage: its own, or making the lift. */
export const stageOf = (family: string): Life => FAMILY[family] ?? "made";

/** The view's sums by family, gathered by stage. Running the lift costs
 * nothing that is priced separately, so it has no line. */
export function priced(stages: Stage[]): Record<Life, { capital: number; monthly: number }> {
  const out = Object.fromEntries(
    LIFE.map(({ stage }) => [stage, { capital: 0, monthly: 0 }]),
  ) as Record<Life, { capital: number; monthly: number }>;
  for (const { family, capital, monthly } of stages) {
    const line = out[stageOf(family)];
    line.capital += capital;
    line.monthly += monthly;
  }
  return out;
}

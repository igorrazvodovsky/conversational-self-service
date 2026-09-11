import type { ChartConfig } from "@/components/ui/chart";

/** The five chart tokens in globals.css; a sixth series repeats the first. */
export const chartColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

export interface Datum {
  label: string;
  value: number;
}

/**
 * A series per label, in shadcn's `ChartConfig` shape. Keyed by position
 * rather than by label, so a label needs no slug to be a CSS custom property:
 * `ChartContainer` turns each key into `--color-<key>` inside the chart.
 */
export function toSeries(data: Datum[]) {
  const rows = data.map((datum, index) => ({
    key: `s${index}`,
    label: datum.label,
    value: Number(datum.value) || 0,
    fill: `var(--color-s${index})`,
  }));
  const config: ChartConfig = { value: { label: "Value" } };
  data.forEach((datum, index) => {
    config[`s${index}`] = { label: datum.label, color: chartColor(index) };
  });
  return { rows, config };
}

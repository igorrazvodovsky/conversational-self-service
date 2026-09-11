import { Pie, PieChart as RechartsPieChart } from "recharts";
import { z } from "zod";
import { chartColor, toSeries } from "./config";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyDescription } from "@/components/ui/empty";

export const PieChartProps = z.object({
  title: z.string().describe("Chart title"),
  description: z.string().describe("Brief description or subtitle"),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
});

type PieChartProps = z.infer<typeof PieChartProps>;

/** A donut of `data`, for the controlled pie chart and the A2UI catalog alike. */
export function Donut({ data }: { data: PieChartProps["data"] }) {
  const { rows, config } = toSeries(data);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <>
      <ChartContainer config={config} className="mx-auto aspect-square max-h-60">
        <RechartsPieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="key" hideLabel />}
          />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="key"
            innerRadius="55%"
            isAnimationActive={false}
          />
        </RechartsPieChart>
      </ChartContainer>

      <ul className="space-y-2 pt-4">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-center gap-3 text-sm">
            <span
              className="size-3 shrink-0"
              style={{ backgroundColor: chartColor(index) }}
            />
            <span className="flex-1 truncate">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {row.value.toLocaleString()}
            </span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {total > 0 ? ((row.value / total) * 100).toFixed(0) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PieChart({ title, description, data }: PieChartProps) {
  const empty = !data || !Array.isArray(data) || data.length === 0;

  return (
    <Card className="mx-auto my-4 max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <Empty className="py-8">
            <EmptyDescription>No data available</EmptyDescription>
          </Empty>
        ) : (
          <Donut data={data} />
        )}
      </CardContent>
    </Card>
  );
}

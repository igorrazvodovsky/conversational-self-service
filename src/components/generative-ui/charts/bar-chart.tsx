import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { z } from "zod";
import { toSeries } from "./config";
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
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

export const BarChartProps = z.object({
  title: z.string().describe("Chart title"),
  description: z.string().describe("Brief description or subtitle"),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
});

type BarChartProps = z.infer<typeof BarChartProps>;

/** Bars of `data`, for the controlled bar chart and the A2UI catalog alike. */
export function Bars({
  data,
  className,
}: {
  data: BarChartProps["data"];
  className?: string;
}) {
  const { rows, config } = toSeries(data);

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-72 w-full", className)}
    >
      <RechartsBarChart
        data={rows}
        margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        {/* Sized to its longest tick, so six-figure values are not clipped. */}
        <YAxis tickLine={false} axisLine={false} width="auto" />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent nameKey="key" hideLabel />}
        />
        <Bar dataKey="value" maxBarSize={48} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.key} fill={row.fill} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ChartContainer>
  );
}

export function BarChart({ title, description, data }: BarChartProps) {
  const empty = !data || !Array.isArray(data) || data.length === 0;

  return (
    <Card className="mx-auto my-4 max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <Empty className="py-8">
            <EmptyDescription>No data available</EmptyDescription>
          </Empty>
        ) : (
          <Bars data={data} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * A2UI Catalog — React Renderers
 *
 * Every renderer is composed from the shadcn primitives in
 * `src/components/ui/` (docs/ui.md), so an agent-drawn dashboard reads in the
 * same zinc, square vocabulary as the configurator beside it. Colours an agent
 * passes in (`PieChart`'s `color`, `BarChart`'s `color`, `FlightCard`'s
 * `statusColor`) are accepted by the schema and not drawn: the chart tokens and
 * badge variants stand in for them.
 *
 * To add a component: define its schema in definitions.ts, then add a
 * renderer here. See README.md "Adding a custom component" for details.
 *
 * The assembled catalog is registered in layout.tsx via
 * <CopilotKit a2ui={{ catalog: demonstrationCatalog }}>.
 */
"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check } from "lucide-react";
import { createCatalog } from "@copilotkit/a2ui-renderer";
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bars } from "@/components/generative-ui/charts/bar-chart";
import { Donut } from "@/components/generative-ui/charts/pie-chart";
import { cn } from "@/lib/utils";
import { demonstrationCatalogDefinitions } from "./definitions";
import type { DemonstrationCatalogDefinitions } from "./definitions";

const BUTTON_VARIANT = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
} as const;

function ActionButton({
  label,
  doneLabel,
  action,
  variant = "secondary",
  children: child,
}: {
  label: string;
  doneLabel: string;
  action: any;
  variant?: keyof typeof BUTTON_VARIANT;
  children?: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={done ? "outline" : BUTTON_VARIANT[variant]}
      disabled={done}
      className="w-full"
      onClick={() => {
        if (!done) {
          action?.();
          setDone(true);
        }
      }}
    >
      {done && <Check />}
      {done ? doneLabel : (child ?? label)}
    </Button>
  );
}

/** Renders a layout container's children, literal ids and template bindings alike. */
function layoutChildren(
  items: unknown,
  children: (id: string, basePath?: string) => React.ReactNode,
  wrap: (key: string, node: React.ReactNode) => React.ReactNode,
) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item: any, i: number) => {
    if (typeof item === "string") return wrap(`${item}-${i}`, children(item));
    if (item && typeof item === "object" && "id" in item)
      return wrap(`${item.id}-${i}`, children(item.id, item.basePath));
    return null;
  });
}

const TREND = {
  up: { icon: ArrowUp, variant: "secondary" },
  down: { icon: ArrowDown, variant: "destructive" },
  neutral: { icon: ArrowRight, variant: "outline" },
} as const;

const BADGE_VARIANT = {
  success: "default",
  warning: "outline",
  error: "destructive",
  info: "outline",
  neutral: "secondary",
} as const;

const FLIGHT_STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  "On Time": "secondary",
  Delayed: "outline",
  Cancelled: "destructive",
};

// ─── Renderers (type-checked against schema definitions) ────────────

const demonstrationCatalogRenderers: CatalogRenderers<DemonstrationCatalogDefinitions> =
  {
    Title: ({ props }) => {
      const level = props.level === "h1" || props.level === "h3" ? props.level : "h2";
      const Tag = level;
      return (
        <Tag
          className={cn(
            "m-0 font-semibold tracking-tight text-card-foreground",
            { h1: "text-2xl", h2: "text-lg", h3: "text-base" }[level],
          )}
        >
          {props.text}
        </Tag>
      );
    },

    // Text: removed — use the basic catalog's Text (supports DynamicStringSchema
    // for path bindings in fixed-schema templates).

    Row: ({ props, children }) => (
      <div
        className={cn(
          "flex w-full flex-row flex-wrap",
          {
            start: "justify-start",
            center: "justify-center",
            end: "justify-end",
            spaceBetween: "justify-between",
          }[props.justify ?? "start"] ?? "justify-start",
        )}
        style={{ gap: `${props.gap ?? 16}px`, alignItems: props.align ?? "stretch" }}
      >
        {layoutChildren(props.children, children as any, (key, node) => (
          <div key={key} className="min-w-0 flex-1">
            {node}
          </div>
        ))}
      </div>
    ),

    Column: ({ props, children }) => (
      <div
        className="flex w-full flex-col"
        style={{ gap: `${props.gap ?? 12}px` }}
      >
        {layoutChildren(props.children, children as any, (key, node) => (
          <React.Fragment key={key}>{node}</React.Fragment>
        ))}
      </div>
    ),

    DashboardCard: ({ props, children }) => (
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          {props.subtitle && (
            <CardDescription>{props.subtitle}</CardDescription>
          )}
        </CardHeader>
        {props.child && <CardContent>{children(props.child)}</CardContent>}
      </Card>
    ),

    Metric: ({ props }) => {
      const trend = props.trend ? TREND[props.trend] : undefined;
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {props.label}
          </span>
          {/* Wraps: in a Row of three, a cell is narrower than a value and
              its trend together. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums">
              {props.value}
            </span>
            {trend && props.trendValue && (
              <Badge variant={trend.variant}>
                <trend.icon />
                {props.trendValue}
              </Badge>
            )}
          </div>
        </div>
      );
    },

    PieChart: ({ props }) => <Donut data={props.data ?? []} />,

    BarChart: ({ props }) => <Bars data={props.data ?? []} className="h-52" />,

    Badge: ({ props }) => (
      <Badge variant={BADGE_VARIANT[props.variant ?? "neutral"] ?? "secondary"}>
        {props.text}
      </Badge>
    ),

    DataTable: ({ props }) => {
      const cols = props.columns ?? [];
      const rows = props.rows ?? [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((col: any) => (
                <TableHead
                  key={col.key}
                  className="uppercase tracking-wide text-muted-foreground"
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: any, i: number) => (
              <TableRow key={i}>
                {cols.map((col: any) => (
                  <TableCell key={col.key}>{String(row[col.key] ?? "")}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    },

    Button: ({ props, children }) => (
      <ActionButton
        label="Click"
        doneLabel="Done"
        action={props.action}
        variant={props.variant}
      >
        {props.child ? children(props.child) : null}
      </ActionButton>
    ),

    FlightCard: ({ props: rawProps }) => {
      // The binder resolves path bindings to strings at runtime.
      const props = rawProps as Record<string, any>;

      return (
        // Fills its Row cell rather than holding a minimum width: beside the
        // canvas a cell is narrower than the 260px the starter card insisted on,
        // and the second card was clipped.
        <Card className="w-full max-w-[340px]">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.airlineLogo}
                alt={props.airline}
                className="size-7 object-contain"
              />
              <CardTitle>{props.airline}</CardTitle>
            </div>
            <span className="text-lg font-bold tabular-nums">{props.price}</span>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{props.flightNumber}</span>
              <span>{props.date}</span>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <span className="text-lg font-bold tabular-nums">
                {props.departureTime}
              </span>
              <span className="text-xs text-muted-foreground">
                {props.duration}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {props.arrivalTime}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{props.origin}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span>{props.destination}</span>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <Separator />
              <Badge
                variant={FLIGHT_STATUS_VARIANT[props.status] ?? "secondary"}
              >
                {props.status}
              </Badge>
              <ActionButton
                label="Select"
                doneLabel="Selected"
                action={props.action}
              />
            </div>
          </CardContent>
        </Card>
      );
    },
  };

// ─── Assembled Catalog ───────────────────────────────────────────────

export const demonstrationCatalog = createCatalog(
  demonstrationCatalogDefinitions,
  demonstrationCatalogRenderers,
  {
    catalogId: "copilotkit://app-dashboard-catalog",
  },
);

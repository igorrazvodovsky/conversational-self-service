"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConfigurator, type Grid } from "./provider";

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

const tonnes = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

function Figure({ value, unit }: { value: string; unit: string }) {
  return (
    <>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
    </>
  );
}

function Line({ term, amount }: { term: string; amount: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="tabular-nums">{amount}</dd>
    </div>
  );
}

export function Totals() {
  const { view, grid, setGrid } = useConfigurator();
  if (!view) return null;
  const { price, footprint, currency } = view;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card size="sm">
        <CardHeader>
          <CardDescription className="uppercase tracking-wide">
            Cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Figure
            value={money(price.capital, currency)}
            unit="equipment, before financing"
          />
          <dl className="mt-3 space-y-1 text-xs">
            <Line
              term={`Monthly, over ${price.term / 12 || "—"} years${
                price.presumed ? " (presumed)" : ""
              }`}
              amount={money(price.instalment, currency)}
            />
            <Line term="Lifetime" amount={money(price.lifetime, currency)} />
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardDescription className="uppercase tracking-wide">
            Carbon, {footprint.horizon} years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Figure
            value={footprint.complete ? tonnes(footprint.total) : "—"}
            unit="CO₂e, modelled"
          />
          <dl className="mt-3 space-y-1 text-xs">
            <Line term="Making it" amount={tonnes(footprint.made)} />
            <Line
              term="Running it"
              amount={footprint.complete ? tonnes(footprint.run) : "—"}
            />
          </dl>
          {/* Two states, both named, rather than one button whose label is
              the state it is in. */}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={grid}
            onValueChange={(value) => value && setGrid(value as Grid)}
            aria-label="Electricity grid"
            title="The same lift ranks differently against a decarbonising grid."
            className="mt-3"
          >
            <ToggleGroupItem value="today">Grid today</ToggleGroupItem>
            <ToggleGroupItem value="decarbonising">Decarbonising</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>
    </div>
  );
}

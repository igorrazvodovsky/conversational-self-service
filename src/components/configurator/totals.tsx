"use client";

import { useConfigurator } from "./provider";

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

const tonnes = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

export function Totals() {
  const { view, grid, setGrid } = useConfigurator();
  if (!view) return null;
  const { price, footprint, currency } = view;

  return (
    <div className="grid grid-cols-2 gap-3">
      <figure className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-4 m-0">
        <figcaption className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
          Cost
        </figcaption>
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {money(price.capital, currency)}
        </div>
        <div className="text-[12px] text-[var(--muted-foreground)]">
          equipment, before financing
        </div>
        <dl className="mt-3 space-y-1 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted-foreground)]">
              Monthly, over {price.term / 12 || "—"} years
              {price.presumed ? " (presumed)" : ""}
            </dt>
            <dd className="tabular-nums">{money(price.instalment, currency)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted-foreground)]">Lifetime</dt>
            <dd className="tabular-nums">{money(price.lifetime, currency)}</dd>
          </div>
        </dl>
      </figure>

      <figure className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-4 m-0">
        <figcaption className="flex items-center justify-between text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
          <span>Carbon, {footprint.horizon} years</span>
          <button
            type="button"
            onClick={() =>
              setGrid(grid === "today" ? "decarbonising" : "today")
            }
            className="rounded-[3px] border border-[var(--border)] px-1.5 py-0.5 text-[10px] normal-case tracking-normal hover:bg-[var(--secondary)] cursor-pointer"
            title="The same lift ranks differently against a decarbonising grid."
          >
            {grid === "today" ? "grid today" : "grid decarbonising"}
          </button>
        </figcaption>
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {footprint.complete ? tonnes(footprint.total) : "—"}
        </div>
        <div className="text-[12px] text-[var(--muted-foreground)]">
          CO₂e, modelled
        </div>
        <dl className="mt-3 space-y-1 text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted-foreground)]">Making it</dt>
            <dd className="tabular-nums">{tonnes(footprint.made)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted-foreground)]">Running it</dt>
            <dd className="tabular-nums">
              {footprint.complete ? tonnes(footprint.run) : "—"}
            </dd>
          </div>
        </dl>
      </figure>
    </div>
  );
}

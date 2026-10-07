/** Number and date formatting shared by the canvas and the proposal. */

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

export const adds = (amount: number, currency: string) =>
  amount === 0 ? "included" : `+${money(amount, currency)}`;

/** Signed with a true minus; no change is a dash. */
export const change = (amount: number, currency: string) =>
  Math.round(amount) === 0
    ? "—"
    : `${amount > 0 ? "+" : "−"}${money(Math.abs(amount), currency)}`;

export const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(iso),
  );

export const tonnes = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

export const kilos = (kg: number) => `${Math.round(kg)} kg`;

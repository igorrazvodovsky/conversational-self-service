/** Number and date formatting shared by the canvas and the proposal. */

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

/** A per-option amount, signed, as an option's contribution reads. */
export const adds = (amount: number, currency: string) =>
  amount === 0 ? "included" : `+${money(amount, currency)}`;

export const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(iso),
  );

export const tonnes = (kg: number) => `${(kg / 1000).toFixed(1)} t`;

export const kilos = (kg: number) => `${Math.round(kg)} kg`;

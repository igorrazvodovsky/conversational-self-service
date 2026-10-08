/**
 * An offer, in the person's own chat: the view `open_quote` carries.
 *
 * The offer as it was frozen when it was issued, laid out so the person can
 * check it against what they asked for before accepting it.
 *
 * Accepting commits the person to the offer, so the button is theirs: a tool
 * only this view can call, recorded under the person, beside the agent's own
 * `commit`, which a person may hand to their agent or not
 * (`docs/syncs/conduct.md`, "In the person's own chat, the facts stay facts").
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Link, mount, type Host, type Result } from "./host";

type Value = {
  variable: string;
  value: string;
  standing: "asked" | "yielded" | "follows";
  how?: string;
  asked?: string;
  because?: string[];
  from?: { heading: string; link: string }[];
  capital: number;
  monthly: number;
  link: string;
};
type Offer = {
  quote: string;
  number: number;
  page: string;
  issued: string;
  until: string;
  title: string | null;
  site: string | null;
  amount: number;
  monthly: number;
  months: number;
  currency: string;
  differs: unknown[];
  required: { clause: string; text: string; answered_by: string[]; link: string }[];
  values: Value[];
  payments: { upon: string; amount: number }[];
  error?: string;
};
type Standing = { standing: string; committed: string | null } | null;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <Separator />
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Quote({ host, result }: { host: Host; result: Result }) {
  const offer = result.structuredContent as Offer | undefined;
  const standing = result._meta?.standing as Standing;
  if (!offer || offer.error)
    return <p className="p-4 text-sm text-muted-foreground">{offer?.error ?? "No offer to show."}</p>;
  const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: offer.currency || "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  const committed = standing?.standing === "committed";
  const open = standing?.standing === "open";
  const adds = (v: Value) =>
    [v.capital ? money(v.capital) : null, v.monthly ? `${money(v.monthly)} a month` : null]
      .filter(Boolean)
      .join(", ");
  const asked = offer.values.filter((v) => v.standing !== "follows");
  const follows = offer.values.filter((v) => v.standing === "follows");

  return (
    <div className="space-y-4 p-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-base font-medium">
            Quote {offer.number}
            {offer.title ? ` — ${offer.title}` : ""}
          </h1>
          <Badge variant={committed ? "default" : "secondary"}>
            {committed ? `accepted ${standing?.committed}` : (standing?.standing ?? "issued")}
          </Badge>
        </div>
        <p className="text-sm">
          {money(offer.amount)}
          {offer.monthly ? `, then ${money(offer.monthly)} a month for ${offer.months} months` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {offer.site ? `${offer.site} · ` : ""}issued {offer.issued}, valid until {offer.until} ·{" "}
          <Link host={host} href={offer.page}>
            the proposal as it prints
          </Link>
        </p>
        <div className="flex gap-2">
          {committed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                host.act("person_revoke", { quote: offer.quote }, `revoked their acceptance of quote ${offer.number}`)
              }
            >
              Revoke my acceptance
            </Button>
          ) : (
            // An offer no longer open stays in reach and says why it cannot
            // be accepted, beside the button, rather than greying out.
            <Button
              size="sm"
              aria-disabled={!open || undefined}
              aria-describedby={open ? undefined : "accept-why-not"}
              onClick={() =>
                open &&
                host.act("person_commit", { quote: offer.quote }, `accepted quote ${offer.number}`)
              }
            >
              Accept this offer
            </Button>
          )}
          {committed || open ? null : (
            <span id="accept-why-not" className="self-center text-xs text-muted-foreground">
              Not open: this offer is {standing?.standing ?? "not yet issued"}.
            </span>
          )}
        </div>
        {host.error ? <p className="text-xs text-destructive">{host.error}</p> : null}
      </header>

      {offer.differs.length ? (
        <Alert>
          <AlertDescription>
            The specification has moved since this offer was issued; the offer stays as it was.
          </AlertDescription>
        </Alert>
      ) : null}

      <Section title="What you asked for, and what answered it">
        <ul className="space-y-1.5">
          {offer.required.map((r) => (
            <li key={r.clause} className="text-sm">
              <Link host={host} href={r.link}>
                {r.text}
              </Link>
              <span className="text-muted-foreground">
                {" — "}
                {r.answered_by.length ? r.answered_by.join(", ") : "nothing answered it"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Asked for">
        <ul className="space-y-1.5">
          {asked.map((v) => (
            <li key={v.variable} className="text-sm">
              <Link host={host} href={v.link}>
                {v.value}
              </Link>
              <span className="text-xs text-muted-foreground">
                {v.how ? ` — ${v.how}` : ""}
                {v.asked ? ` (${v.asked})` : ""}
                {adds(v) ? ` · ${adds(v)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Follows from that">
        <ul className="space-y-1.5">
          {follows.map((v) => (
            <li key={v.variable} className="text-sm">
              <Link host={host} href={v.link}>
                {v.value}
              </Link>
              <span className="text-xs text-muted-foreground">
                {" — "}
                {(v.because ?? []).join("; ")}
                {v.from?.length ? ` (from ${v.from.map((f) => f.heading).join(", ")})` : ""}
                {adds(v) ? ` · ${adds(v)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Payments">
        <ul className="space-y-1 text-sm">
          {offer.payments.map((p) => (
            <li key={p.upon}>
              {money(p.amount)} <span className="text-muted-foreground">upon {p.upon}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

mount(Quote);

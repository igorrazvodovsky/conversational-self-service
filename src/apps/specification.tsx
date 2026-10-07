/**
 * The specification, in the person's own chat: the view `review` carries.
 *
 * The canvas's one list, set beside the agent's reply so that what the agent
 * says about the specification sits next to what is the case. Each
 * requirement is a line in its own words, with the values asserted to answer
 * it and, beneath each, what that value forced and the rule that forced it;
 * then the values answering nothing; then what is open. A value that follows
 * is never shown as one that was asked for, which is the distinction an
 * agent's retelling can lose (`docs/syncs/conduct.md`, "In the person's own
 * chat, the facts stay facts").
 *
 * What the person can do here is theirs, by hand: keep a reading or strike
 * it, and answer a conflict. Each is a tool only this view can call, recorded
 * under the person. Everything else is done on the page, which every item
 * links to.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Link, mount, type Host, type Result } from "./host";

type Forced = { heading: string; label: string; because: string[]; link: string };
type Value = {
  heading: string;
  label: string;
  standing: "asked" | "yielded" | "unmet";
  by: string | null;
  refused: string[];
  forced: Forced[];
  link: string;
};
type Line = {
  clause: string;
  text: string;
  negotiability: string;
  by: string;
  reading: boolean;
  from: string | null;
  answers: Value[];
  link: string;
};
type Question = {
  about: string;
  reason: string | null;
  asked: string | null;
  request: Record<string, unknown>;
  options: { option: unknown; label: string }[];
};
type Sheet = {
  lines: Line[];
  unbound: Value[];
  open: { heading: string; possible: number; proposed: string | null; link: string }[];
  questions: Question[];
  quotable: { ok: boolean; because: string };
  currency: string;
  price: number;
  here: string;
};

/** A value's kind, in the canvas's words. */
const KIND: Record<Value["standing"], string> = {
  asked: "asked for",
  yielded: "gave way",
  unmet: "cannot be met",
};

function Asserted({ host, value }: { host: Host; value: Value }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <Link host={host} href={value.link}>
          {value.heading}: {value.label}
        </Link>
        <Badge variant={value.standing === "unmet" ? "destructive" : "secondary"}>
          {KIND[value.standing]}
          {value.by && value.standing === "asked" ? ` by ${value.by}` : ""}
        </Badge>
        {value.by && value.standing !== "asked" ? (
          <span className="text-xs text-muted-foreground">asked for by {value.by}</span>
        ) : null}
      </div>
      {value.refused.map((why) => (
        <p key={why} className="text-xs text-destructive">
          {why}
        </p>
      ))}
      {value.forced.length ? (
        <ul className="space-y-1 border-l pl-3">
          {value.forced.map((f) => (
            <li key={f.heading} className="text-xs">
              <Badge variant="outline">follows</Badge>{" "}
              <Link host={host} href={f.link}>
                {f.heading}: {f.label}
              </Link>
              <span className="text-muted-foreground"> — {f.because.join("; ")}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Requirement({ host, line }: { host: Host; line: Line }) {
  return (
    <li className="space-y-2 border-t py-3">
      <div className="space-y-1">
        <p className="text-sm">{line.text}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {line.reading ? `read from ${line.from}, not yet yours` : `stated by ${line.by}`}
            {line.negotiability !== "fixed" ? `, ${line.negotiability}` : ""}
          </span>
          <Link host={host} href={line.link}>
            on the page
          </Link>
        </div>
        {line.reading ? (
          <div className="flex gap-2 pt-1">
            <Button
              size="xs"
              variant="outline"
              disabled={host.busy}
              onClick={() =>
                host.act("person_keep", { clause: line.clause }, `kept “${line.text}” as their own`)
              }
            >
              Keep as mine
            </Button>
            <Button
              size="xs"
              variant="ghost"
              disabled={host.busy}
              onClick={() =>
                host.act("person_strike", { clause: line.clause }, `struck “${line.text}”`)
              }
            >
              Strike
            </Button>
          </div>
        ) : null}
      </div>
      {line.answers.length ? (
        <div className="space-y-2 pl-4">
          {line.answers.map((a) => (
            <Asserted key={a.heading} host={host} value={a} />
          ))}
        </div>
      ) : (
        <p className="pl-4 text-xs text-muted-foreground">Nothing answers this yet.</p>
      )}
    </li>
  );
}

function Conflict({ host, question }: { host: Host; question: Question }) {
  return (
    <Alert>
      <AlertTitle>{question.reason ?? "These cannot all hold"}</AlertTitle>
      <AlertDescription className="space-y-2">
        {question.asked ? <p>The assistant asks: {question.asked}</p> : null}
        <div className="flex flex-wrap gap-2">
          {question.options.map((o) => (
            <Button
              key={o.label}
              size="xs"
              variant="outline"
              disabled={host.busy}
              onClick={() =>
                host.act(
                  "person_choose",
                  { request: question.request, option: o.option },
                  `gave up ${o.label} to settle the conflict`,
                )
              }
            >
              Give up {o.label}
            </Button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function Specification({ host, result }: { host: Host; result: Result }) {
  const sheet = result._meta?.sheet as Sheet | undefined;
  if (!sheet) return <p className="p-4 text-sm text-muted-foreground">Nothing to show.</p>;
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: sheet.currency || "EUR",
    maximumFractionDigits: 0,
  }).format(sheet.price);
  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="text-base font-medium">The specification</h1>
          <p className="text-xs text-muted-foreground">
            {sheet.quotable.ok ? "Ready to quote" : `Not quotable yet: ${sheet.quotable.because}`}
            {" · "}
            {price}
          </p>
        </div>
        <Link host={host} href={sheet.here}>
          Open on the page
        </Link>
      </header>

      {sheet.questions.map((q) => (
        <Conflict key={JSON.stringify(q.request)} host={host} question={q} />
      ))}
      {host.error ? <p className="text-xs text-destructive">{host.error}</p> : null}

      <ol>
        {sheet.lines.map((line) => (
          <Requirement key={line.clause} host={host} line={line} />
        ))}
        {sheet.unbound.map((value) => (
          <li key={value.heading} className="space-y-2 border-t py-3">
            <p className="text-sm text-muted-foreground">No stated requirement</p>
            <div className="pl-4">
              <Asserted host={host} value={value} />
            </div>
          </li>
        ))}
      </ol>

      {sheet.open.length ? (
        <section className="space-y-2">
          <Separator />
          <h2 className="text-sm font-medium">Open</h2>
          <ul className="flex flex-wrap gap-2">
            {sheet.open.map((o) => (
              <li key={o.heading}>
                <Badge variant="outline" asChild>
                  <button type="button" onClick={() => host.open(o.link)}>
                    {o.heading}
                    {o.proposed ? ` — proposed: ${o.proposed}` : ` — ${o.possible} possible`}
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

mount(Specification);

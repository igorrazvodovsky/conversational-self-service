"use client";

import { useState } from "react";
import { useConfigurator, type Variable } from "./provider";

function Rules({
  rules,
  tone,
}: {
  rules: Variable["owing"];
  tone?: "refused";
}) {
  if (!rules.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {rules.map((rule) => (
        <li
          key={rule.rule}
          className={`text-[11px] ${
            tone === "refused"
              ? "text-red-700 dark:text-red-300"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          <span className="font-mono text-[10px] opacity-70">{rule.rule}</span>{" "}
          {rule.because}
        </li>
      ))}
    </ul>
  );
}

/** A variable a party asserted a value for, or asserted an impossible one for. */
export function AskedCard({ variable }: { variable: Variable }) {
  const { gesture, busy, label } = useConfigurator();
  const unmet = variable.standing === "unmet";
  return (
    <div
      className={`rounded-[6px] border p-3 ${
        unmet
          ? "border-red-400/70 bg-red-50 dark:bg-red-950/25"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
            {variable.heading}
          </div>
          <div className="text-[13px] font-medium">{label(variable.asked)}</div>
        </div>
        <button
          type="button"
          disabled={busy}
          title="Take this back"
          onClick={() =>
            void gesture({ act: "withdraw", variable: variable.name })
          }
          className="shrink-0 rounded-[3px] px-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
        {variable.how}
      </div>
      {unmet ? (
        <div className="mt-2">
          <div className="text-[11px] font-medium text-red-700 dark:text-red-300">
            On record, and not buildable alongside the rest.
          </div>
          {/* The rules that refused it, kept by `Constraining.refused` rather
              than only carried in the question — so the account survives the
              banner being dismissed. */}
          <Rules rules={variable.refused} tone="refused" />
        </div>
      ) : null}
    </div>
  );
}

/** A variable nobody chose, whose value the rules leave no room to argue with. */
export function FollowsRow({ variable }: { variable: Variable }) {
  const { label } = useConfigurator();
  return (
    <div className="border-l-2 border-[var(--border)] py-1.5 pl-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
          {variable.heading}
        </span>
        <span className="text-[13px] font-medium">{label(variable.value)}</span>
      </div>
      <Rules rules={variable.owing} />
    </div>
  );
}

/** A variable still open, with what the rules have left of its range. */
export function OpenRow({ variable }: { variable: Variable }) {
  const { gesture, busy } = useConfigurator();
  const [showing, setShowing] = useState(false);
  const live = variable.options.filter((option) => option.possible);
  const gone = variable.options.length - live.length;

  return (
    <div className="border-b border-[var(--border)] py-2 last:border-b-0">
      <button
        type="button"
        onClick={() => setShowing(!showing)}
        className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="text-[13px]">{variable.heading}</span>
        <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
          {live.length} left{gone ? ` · ${gone} ruled out` : ""} {showing ? "▴" : "▾"}
        </span>
      </button>
      {showing ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {variable.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={busy}
              title={
                option.possible
                  ? (option.note ?? undefined)
                  : "Ruled out by what has been asserted so far"
              }
              onClick={() =>
                void gesture({
                  act: "assert",
                  variable: variable.name,
                  option: option.id,
                })
              }
              className={`rounded-[4px] border px-2 py-1 text-[11px] disabled:opacity-40 cursor-pointer ${
                option.possible
                  ? "border-[var(--border)] bg-[var(--card)] hover:border-[var(--foreground)]"
                  : "border-transparent bg-[var(--secondary)] text-[var(--muted-foreground)] line-through"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

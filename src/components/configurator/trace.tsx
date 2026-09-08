"use client";

import { useState } from "react";
import { useConfigurator } from "./provider";

/**
 * The action log, read back.
 *
 * Nothing here is derived or summarised. Each row is one completion record:
 * who performed it, which concept's action it was, and the name of the
 * synchronization that authorised it — MSM §5.2.3's accountability property,
 * rendered rather than described.
 *
 * The rows with no rule are root actions, and there are only ever two kinds:
 * a person acted on a surface, or the model called a tool. Everything else in
 * the list happened because some rule said it could.
 */
export function Trace() {
  const { view } = useConfigurator();
  const [showing, setShowing] = useState(false);
  const records = [...(view?.log ?? [])].reverse();
  if (!records.length) return null;

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setShowing(!showing)}
        className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
      >
        {showing ? "▴" : "▾"} What just happened, and on whose authority
      </button>
      {showing ? (
        <ol className="mt-2 space-y-1 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-3">
          {records.map((record) => (
            <li
              key={record.seq}
              className="flex flex-wrap items-baseline gap-x-2 text-[11px]"
            >
              <span
                className={`w-12 shrink-0 font-medium ${
                  record.actor === "model"
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {record.actor}
              </span>
              <span className="font-mono">
                {record.concept}/{record.action}
              </span>
              <span className="text-[var(--muted-foreground)]">
                {record.via ?? "— a root action, authorised by nothing"}
              </span>
              {record.output && "error" in record.output ? (
                <span className="text-red-700 dark:text-red-300">refused</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

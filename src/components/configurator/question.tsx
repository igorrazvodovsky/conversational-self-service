"use client";

import { useConfigurator, type Question } from "./provider";

/**
 * The open questions, from `Deciding`.
 *
 * There can be more than one. A conflict between requirements and a proposed
 * completion are two questions about the same specification, and they used to
 * share a request — so asking either one erased the other. The request now
 * names the question (`about`) as well as its subject, which is also what tells
 * the two `Deciding/choose` rules apart.
 *
 * Neither shape of option is a catalogue option: one is a requirement that
 * might be given up, the other a whole proposed assignment. `Deciding`'s type
 * parameters cannot be constrained, which is what lets one concept carry both.
 */
function OneQuestion({ question }: { question: Question }) {
  const { gesture, busy, label } = useConfigurator();
  const isCompletion = question.about === "completion";

  return (
    <aside className="rounded-[6px] border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 p-4">
      <h2 className="text-[13px] font-semibold">
        {isCompletion ? "A completion is waiting for you" : "These cannot hold together"}
      </h2>
      <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
        {isCompletion
          ? "The assistant worked this out. It cannot adopt it — only you can."
          : question.reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            disabled={busy}
            onClick={() =>
              void gesture({ act: "choose", request: question.request, option })
            }
            className="rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] hover:border-amber-500 disabled:opacity-50 cursor-pointer"
          >
            {isCompletion
              ? `Adopt all ${Object.keys(option).length} values`
              : `Give up ${label((option as { option: string }).option)}`}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void gesture({ act: "decline", request: question.request })
          }
          className="rounded-[4px] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] hover:underline disabled:opacity-50 cursor-pointer"
        >
          Leave it for now
        </button>
      </div>
    </aside>
  );
}

export function PendingQuestions() {
  const { view } = useConfigurator();
  const questions = view?.questions ?? [];
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <OneQuestion key={question.about} question={question} />
      ))}
    </div>
  );
}

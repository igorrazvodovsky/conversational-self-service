"use client";

import { SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConfigurator, type Question } from "./provider";

/**
 * The open questions, from `Deciding`.
 *
 * There can be more than one. A conflict between assertions and a proposed
 * completion are two questions about the same specification, and they used to
 * share a request — so asking either one erased the other. The request now
 * names the question (`about`) as well as its subject, which is also what tells
 * the two `Deciding/choose` rules apart.
 *
 * Neither shape of option is a catalogue option: one is an assertion that
 * might be given up, the other a whole proposed assignment. `Deciding`'s type
 * parameters cannot be constrained, which is what lets one concept carry both.
 */
function OneQuestion({ question }: { question: Question }) {
  const { gesture, busy, label } = useConfigurator();
  const isCompletion = question.about === "completion";

  return (
    <Alert variant={isCompletion ? "default" : "destructive"}>
      {isCompletion ? <SparklesIcon /> : <TriangleAlertIcon />}
      <AlertTitle className="text-sm">
        {isCompletion
          ? "A completion is waiting for you"
          : "These cannot hold together"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {isCompletion
            ? "The assistant worked this out. It cannot adopt it — only you can."
            : question.reason}
        </p>
        {/* The destructive alert colours everything inside it; the choices
            are ordinary controls, not part of the warning. */}
        <div className="mt-2 flex flex-wrap gap-2 text-foreground">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void gesture({ act: "choose", request: question.request, option })
              }
            >
              {isCompletion
                ? `Adopt all ${Object.keys(option).length} values`
                : `Give up ${label((option as { option: string }).option)}`}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            className="text-muted-foreground"
            onClick={() =>
              void gesture({ act: "decline", request: question.request })
            }
          >
            Leave it for now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
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

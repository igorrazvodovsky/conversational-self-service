"use client";

/**
 * The suggestions under the composer, read from the state.
 *
 * A suggestion is an affordance on an existing stimulus (docs/concepts/README.md,
 * "what is deliberately not a concept"): pressing one sends a message, and the
 * message is a move the chat carries (docs/moves.md, "The suggestions"). So
 * the strip is a read over the view, like the canvas, and not a model's guess
 * at what the person might want. A read costs nothing, is the same on every
 * reload, and cannot offer a move no rule permits: nothing here says *adopt
 * the proposal* or *accept the quote*, because the model cannot do either
 * and the person does both on the canvas.
 *
 * Each candidate below is one row of the moves table, offered when the state
 * makes it apt. The first few by priority are shown; the openers appear only
 * while nothing has been asserted or required.
 */

import { useMemo } from "react";
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

import { useConfigurator, type View } from "@/components/configurator/provider";

interface Suggestion {
  title: string;
  message: string;
}

const SHOWN = 4;

/** What an option is called on the canvas, so the pill and the row agree. */
type Label = (id: string | null) => string;

const OPENERS: Suggestion[] = [
  {
    title: "A hospital in Munich",
    message:
      "I need a lift for a new 12-storey hospital in Munich. Say what that already forces, and which rules force it.",
  },
  {
    title: "A six-storey apartment block",
    message:
      "A six-storey residential building in Lyon, eight flats to a floor. Tell me what that already settles and what is still open.",
  },
  {
    title: "What can you configure?",
    message:
      "What does the EP-3000 range cover, and what do you need from me to specify one? I can attach a specification if that helps.",
  },
];

/** The requirement's words, short enough for a pill. */
function clip(text: string, at = 40): string {
  const one = text.replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
  return one.length > at ? `${one.slice(0, at - 1).trimEnd()}…` : one;
}

/** The move the person can make from here, in their own voice. */
export function suggestionsFor(view: View | null, label: Label): Suggestion[] {
  if (!view) return [];
  const { variables, clauses, questions, quotes, counts } = view;

  const nothingYet =
    counts.asked === 0 &&
    counts.unmet === 0 &&
    counts.yielded === 0 &&
    clauses.length === 0 &&
    quotes.length === 0;
  if (nothingYet) return OPENERS;

  const out: Suggestion[] = [];

  // A conflict is open: ask why, or answer it in words. The model withdraws
  // the conceded assertion at the person's word (docs/moves.md, "The
  // conflict, as the worked case").
  const conflict = questions.find((q) => q.about === "conflict");
  if (conflict) {
    const headings = new Map(variables.map((v) => [v.name, v.heading]));
    const giving = conflict.options
      .map((o) => o as { variable: string; option: string })
      .map((o) => ({
        name: label(o.option),
        of: (headings.get(o.variable) ?? o.variable).toLowerCase(),
      }))
      .filter((o) => o.name);
    out.push({
      title: "Why can't these hold together?",
      message: `Why can't ${giving.map((o) => o.name).join(" and ")} hold together? Give me the rules' own sentences, and what would have to give.`,
    });
    for (const { name, of } of giving.slice(0, 2))
      out.push({
        title: `Give up ${name}`,
        message: `Give up the ${of} ${name}, and tell me what comes back.`,
      });
  } else {
    // Refused without a question yet: the same argument.
    const unmet = variables.find((v) => v.standing === "unmet");
    if (unmet)
      out.push({
        title: `Why can't I have ${label(unmet.asked)}?`,
        message: `Why can't I have ${label(unmet.asked)} for the ${unmet.heading.toLowerCase()}? Which rules refuse it, in their own words?`,
      });
  }

  // A negotiable requirement gave way to the rules.
  if (counts.yielded > 0)
    out.push({
      title: "What gave way?",
      message:
        "Which of my negotiable requirements gave way, to what, and which rule decided it?",
    });

  // A proposal waits on the canvas. Asking what it assumed is the chat's; taking it is not.
  const proposed = variables.some((v) => v.proposed);
  if (proposed)
    out.push({
      title: "What did the proposal assume?",
      message:
        "What did your proposal assume about the building and how it is used, and where would I most likely disagree?",
    });

  // A requirement lost its answer to a later assertion on the same variable.
  const displaced = clauses.find((c) => c.displaced);
  if (displaced)
    out.push({
      title: `What displaced “${clip(displaced.text)}”?`,
      message: `My requirement “${displaced.text}” lost its answer. What displaced it, and could both hold?`,
    });

  // A requirement nobody has answered, and not because it was displaced.
  const unanswered = clauses.find(
    (c) => c.answers.length === 0 && !c.displaced && !c.source?.unanswerable,
  );
  if (unanswered)
    out.push({
      title: `What could answer “${clip(unanswered.text)}”?`,
      message: `Narrow the canvas to my requirement “${unanswered.text}” and tell me what could still answer it.`,
    });

  // The model read requirements from words or a document; the person checks its reading.
  if (counts.read > 0)
    out.push({
      title: "Check what you read",
      message:
        "Read back what you took from my words and the documents, item by item, and say where you were unsure or found nothing.",
    });

  // Something follows: argue one entailment, and cost one assertion.
  const follows = variables.find(
    (v) => v.standing === "follows" && v.owing.length > 0 && v.value,
  );
  if (follows)
    out.push({
      title: `Why is the ${follows.heading.toLowerCase()} ${label(follows.value)}?`,
      message: `Why is the ${follows.heading.toLowerCase()} ${label(follows.value)}? Which rule forces it, and what would I have to change?`,
    });
  const costly = mostRestedOn(view);
  if (costly)
    out.push({
      title: `What did ${label(costly.asked)} cost me?`,
      message: `Narrow the canvas to what followed from ${costly.heading.toLowerCase()}: ${label(costly.asked)}, and tell me what it changed.`,
    });

  // Still open, and no proposal waiting: ask for a completion.
  if (counts.open > 0 && !proposed && !conflict) {
    out.push({
      title: "Finish it cheapest",
      message:
        "Propose the cheapest way to finish this specification and tell me the lifetime cost.",
    });
    out.push({
      title: "Finish it lowest-carbon",
      message:
        "Propose the lowest-carbon way to finish this specification, and tell me what the difference costs against the cheapest.",
    });
  }

  // Complete: ask for a quote. The model says what is still missing, if anything.
  if (counts.open === 0 && counts.unmet === 0) {
    const open = quotes.find((q) => q.standing === "open");
    if (open && open.differs.length > 0)
      out.push({
        title: `What moved since quote ${open.number}?`,
        message: `Which values have moved away from quote ${open.number}, and what would a fresh quote come to?`,
      });
    else if (!open || view.quotable.ok)
      out.push({
        title: open ? "Quote it again" : "Request a quote",
        message: "Issue a quote for this specification.",
      });
  }

  // An offer issued: read it against what was asked, or against the one
  // before it. Both are reads (`open_quote`, a comparison's address).
  const standing = quotes.filter((q) => q.standing === "open");
  const latest = standing.at(-1);
  if (latest)
    out.push({
      title: `Does quote ${latest.number} answer what I asked?`,
      message: `Read quote ${latest.number} against my requirements: which does it answer, and which does it leave unanswered?`,
    });
  if (quotes.length > 1) {
    const [before, after] = quotes.slice(-2);
    out.push({
      title: `Compare quotes ${before.number} and ${after.number}`,
      message: `What changed between quote ${before.number} and quote ${after.number}, and what did it do to the price?`,
    });
  }

  // Bring a hidden fact onto the canvas, rather than have it recited.
  const facet = view.showing.find((f) => !f.shown && SHOWABLE.has(f.facet));
  if (facet)
    out.push({
      title: `Show ${SHOWABLE.get(facet.facet)}`,
      message: `Show ${facet.about} on the canvas.`,
    });

  return out.slice(0, SHOWN);
}

/** The facets worth a pill, with a short name for it. */
const SHOWABLE = new Map([
  ["price", "prices"],
  ["carbon", "carbon"],
  ["excluded", "what is ruled out"],
]);

/** The asserted value most of the derived values rest on. */
function mostRestedOn(view: View) {
  const rests = new Map<string, number>();
  for (const v of view.variables)
    if (v.standing === "follows")
      for (const on of v.following) rests.set(on.variable, (rests.get(on.variable) ?? 0) + 1);
  let best: View["variables"][number] | undefined;
  let most = 0;
  for (const v of view.variables) {
    const n = rests.get(v.name) ?? 0;
    if (v.standing === "asked" && v.asked && n > most) [best, most] = [v, n];
  }
  return best;
}

/** Registers the strip with CopilotKit; re-registers only when the read changes. */
export function useStateSuggestions() {
  const { view, label } = useConfigurator();
  const suggestions = useMemo(() => suggestionsFor(view, label), [view, label]);
  const key = JSON.stringify(suggestions);
  useConfigureSuggestions(
    { suggestions, available: "always" },
    [key],
  );
}

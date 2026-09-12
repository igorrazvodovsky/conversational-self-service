"use client";

/**
 * The vocabulary a clause is rendered with, and the answering mode.
 *
 * The requirement ledger itself is a document, in `specification.tsx`. What
 * lives here is what both the document and the value cards need: the
 * references a clause's words may carry, the negotiabilities as words, and
 * the mode in which a pick on the canvas is bound to a clause. The mode is view state and nothing else —
 * it is not recorded, and clearing it records nothing.
 */

import { CheckIcon, PencilLineIcon } from "lucide-react";
import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfigurator, type Clause, type Negotiability } from "./provider";

// -- references: the catalogue named inside a clause's words ------------------

/**
 * A catalogue individual (a variable) or one of its values (an option), named
 * inside a clause. `Specifying` holds the clause as words and nothing else;
 * a reference is written into those words as `[[id|label]]`, where the id is
 * the variable's name or the option's — which already names its variable,
 * `rated_load:kg1250` — so that any reader of the text can show the label
 * and the editor can show the chip. See docs/syncs/gestures.md, "A clause is
 * stated in the person's words".
 */
export interface Reference {
  variable: string;
  /** The option's id, or null for the individual itself. */
  option: string | null;
  /** The label as it stood when the reference was made. */
  label: string;
}

const TOKEN = /\[\[([a-z0-9_]+(?::[a-z0-9_]+)?)\|([^\]]*)\]\]/gi;

export function token(reference: Reference): string {
  return `[[${reference.option ?? reference.variable}|${reference.label}]]`;
}

export type Segment = { text: string } | { reference: Reference };

/** The clause's words, cut at each reference. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    const id = match[1];
    const variable = id.split(":")[0];
    out.push({
      reference: { variable, option: id === variable ? null : id, label: match[2] },
    });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** A clause's words with each reference read as its label. */
export function plain(text: string): string {
  return text.replace(TOKEN, "$2");
}

/**
 * A reference as a chip: a value reads darker than the individual it belongs
 * to, and a value that answers the clause it sits in carries a tick. Given
 * children the chip renders through them, so the editor can make it a button.
 */
export function ReferenceChip({
  reference,
  bound = false,
  children,
}: {
  reference: Reference;
  bound?: boolean;
  children?: ReactNode;
}) {
  return (
    <Badge
      asChild={!!children}
      variant={bound ? "default" : reference.option ? "secondary" : "outline"}
      className="align-baseline font-normal"
      data-reference={reference.option ? "value" : "individual"}
    >
      {children ?? (
        <>
          {bound ? <CheckIcon /> : null}
          {reference.label}
        </>
      )}
    </Badge>
  );
}

/** A clause's words, quoted outside the editor, with its references as chips. */
export function ClauseText({ text }: { text: string }) {
  return (
    <>
      {segments(text).map((segment, i) =>
        "text" in segment ? (
          <Fragment key={i}>{segment.text}</Fragment>
        ) : (
          <ReferenceChip key={i} reference={segment.reference} />
        ),
      )}
    </>
  );
}

// -- negotiability, and the answering mode -----------------------------------

export const NEGOTIABILITY: Record<Negotiability, string> = {
  fixed: "Fixed",
  negotiable: "Negotiable",
  open: "Left open",
};

interface Answering {
  /** The clause the next picked option will answer, if any. */
  answering: Clause | null;
  setAnswering: (clause: Clause | null) => void;
}

const AnsweringContext = createContext<Answering>({
  answering: null,
  setAnswering: () => undefined,
});

export function useAnswering(): Answering {
  return useContext(AnsweringContext);
}

export function AnsweringProvider({ children }: { children: ReactNode }) {
  const { view } = useConfigurator();
  const [id, setId] = useState<string | null>(null);
  // Held by identity so a struck clause drops out of the mode on its own.
  const answering = useMemo(
    () => view?.clauses.find((c) => c.clause === id) ?? null,
    [view, id],
  );
  const value = useMemo(
    () => ({
      answering,
      setAnswering: (clause: Clause | null) => setId(clause?.clause ?? null),
    }),
    [answering],
  );
  return (
    <AnsweringContext.Provider value={value}>{children}</AnsweringContext.Provider>
  );
}

/** The banner that says which clause the next pick will answer. */
export function AnsweringBanner() {
  const { answering, setAnswering } = useAnswering();
  if (!answering) return null;
  return (
    <Alert className="sticky top-0 z-10">
      <PencilLineIcon />
      <AlertTitle className="text-sm">
        Answering: “<ClauseText text={answering.text} />”
      </AlertTitle>
      <AlertDescription>
        <p>
          Pick a value below and it will be recorded as answering this clause.
          Pick several if it takes several.
        </p>
        <div className="mt-2 text-foreground">
          <Button size="sm" variant="outline" onClick={() => setAnswering(null)}>
            <CheckIcon /> Done
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

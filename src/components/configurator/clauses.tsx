"use client";

/**
 * The vocabulary a clause is rendered with, and the answering mode.
 *
 * The requirement ledger itself is a document, in `specification.tsx`. What
 * lives here is what both the document and the value cards need: the
 * disciplines and negotiabilities as words, and the mode in which a pick on
 * the canvas is bound to a clause. The mode is view state and nothing else —
 * it is not recorded, and clearing it records nothing.
 */

import { CheckIcon, PencilLineIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConfigurator, type Clause, type Negotiability } from "./provider";

/** The disciplines a clause may belong to. A fact of the requirement, not a catalogue family. */
export const DISCIPLINES: [string, string][] = [
  ["performance", "Traffic and performance"],
  ["building", "Building and shaft"],
  ["safety", "Safety and code"],
  ["interior", "Car interior"],
  ["commercial", "Service and commercial"],
  ["other", "Other"],
];

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
      <AlertTitle className="text-sm">Answering: “{answering.text}”</AlertTitle>
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

"use client";

/**
 * The read side, and the one way to perform a root action.
 *
 * Every gesture goes to `POST /gesture` as a stimulus with an `act`; what
 * follows from it is decided by the synchronizations, not here. The response
 * carries the recomputed view and the list of what the rules did, so the canvas
 * renders from the action's own outputs rather than from a second fetch.
 *
 * Polling covers only the other root actor. While the model is working, its
 * actions land in the same log and the same state, and nothing in the
 * CopilotKit state channel would tell us — by design: state lives behind the
 * actions now, not in the channel.
 */

import { useAgent } from "@copilotkit/react-core/v2";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Standing = "asked" | "unmet" | "follows" | "open";
/** The surfaces `Moding` offers: the specification and the offer. The chat
 * is not one — where it sits is the person's view state
 * (`example-layout/chat-surface.tsx`), which no rule reaches. */
export type Surface = "canvas" | "quote";
export type Grid = "today" | "decarbonising";

export interface Option {
  id: string;
  label: string;
  note: string | null;
  possible: boolean;
  capital: number | null;
  monthly: number | null;
  embodied: number | null;
  /** The rules that rule the option out, from `Constraining.excluding`.
   * Read only while the `excluded` facet is shown; empty otherwise, and
   * empty when the option is out by the person's own assertion alone. */
  excluded: { rule: string; because: string }[];
}

/**
 * One facet the canvas can show beside an item, from `Showing`: its name,
 * what it is in words, and whether it is shown through the workspace's lens.
 */
export interface Facet {
  facet: string;
  about: string;
  shown: boolean;
}

export interface Variable {
  name: string;
  heading: string;
  family: string;
  standing: Standing;
  asked: string | null;
  how: string | null;
  /** The clauses the asserted value answers, from `Binding`. Empty is a finding. */
  answers: { clause: string; text: string }[];
  value: string | null;
  owing: { rule: string; because: string }[];
  /** The assertions a settled value rests on: the other half of `owing`'s core. */
  following: { variable: string; heading: string }[];
  /** Whether the current frame selects this item; always true with no frame. */
  framed: boolean;
  refused: { rule: string; because: string }[];
  options: Option[];
}

/**
 * The canvas narrowed to what followed from one assertion, from `Framing`.
 * The membership test is the read side's; each variable carries `framed`.
 */
export interface Frame {
  by: "assertion";
  variable: string;
  heading: string;
  asked: string | null;
}

export type Negotiability = "fixed" | "negotiable" | "open";

/** A choice currently answering a clause, read against the assertions. */
export interface Answer {
  choice: string;
  value: string;
  variable: string | null;
  heading: string | null;
  label: string;
  decidedBy: string;
  reason: string | null;
  replaced: string | null;
  standing: "asked" | "unmet" | "displaced" | "unrealisable";
}

/**
 * One line of the requirement ledger: a clause from `Specifying` in the
 * person's words, with the choices from `Binding` that answer it. Four
 * concepts' state composed by a read, and maintained by nobody.
 */
export interface Clause {
  clause: string;
  text: string;
  negotiability: Negotiability;
  statedBy: string;
  formerly: string[];
  answers: Answer[];
}

export type Request = { spec: string; about: "conflict" | "completion" };

export interface Question {
  request: Request;
  about: "conflict" | "completion";
  reason: string;
  options: ({ variable: string; option: string } | Record<string, string>)[];
}

export type QuoteStanding = "open" | "committed" | "revoked" | "lapsed";

/** What a party has said of who they are, from `Profiling`. Every field optional. */
export interface Party {
  name?: string;
  organisation?: string;
  address?: string;
  email?: string;
  phone?: string;
}

/**
 * The terms an offer was issued on, copied into the quote at issue: the
 * seller's stipulations, both parties' profiles and the job's name as they
 * stood. The document renders from these alone.
 */
export interface Terms {
  basis: string;
  months: number;
  recurring: number;
  seller: Party;
  customer: Party;
  title: string;
  site: string;
  validity: number;
  warranty: number;
  approval: number;
  installation: number;
  byOthers: string[];
  stages: { upon: string; share: number }[];
  clauses: Record<string, string[]>;
}

/**
 * A quote, from `Quoting`, read with the three calculations its note names:
 * its standing today, which of its frozen values the specification has since
 * moved away from, and a footprint recomputed from the frozen item.
 */
export interface Quote {
  quote: string;
  number: number;
  standing: QuoteStanding;
  amount: number;
  terms: Terms;
  issued: string | null;
  until: string;
  committed: string | null;
  issuedTo: string;
  how: string | null;
  holds: {
    name: string;
    heading: string;
    family: string;
    value: string;
    label: string;
    note: string | null;
  }[];
  /** The clauses as they stood at issue, each with the option that answered it then. */
  requires: {
    clause: string;
    text: string;
    negotiability: Negotiability;
    answeredBy: { value: string; label: string }[];
  }[];
  differs: string[];
  footprint: { made: number; run: number; total: number; complete: boolean };
}

export interface LogRecord {
  seq: number;
  kind: string;
  concept: string;
  action: string;
  actor: string;
  via: string | null;
  output: Record<string, unknown> | null;
}

export interface View {
  spec: string;
  grid: Grid;
  product: string;
  currency: string;
  mode: Surface;
  /** Which facts the canvas shows at a glance, and what else it could. */
  showing: Facet[];
  /** Which items the canvas is narrowed to, or null for everything. */
  frame: Frame | null;
  variables: Variable[];
  clauses: Clause[];
  price: {
    capital: number;
    recurring: number;
    term: number;
    financed: number;
    instalment: number;
    lifetime: number;
    presumed: boolean;
    basis: string;
    factor: number;
    complete: boolean;
  };
  footprint: {
    made: number;
    run: number;
    total: number;
    grid: string;
    intensity: number;
    basis: string;
    horizon: number;
    uplift: number;
    scope: string;
    complete: boolean;
  };
  questions: Question[];
  quotes: Quote[];
  quotable: { ok: boolean; because: string };
  customer: Party;
  seller: Party;
  project: { title: string; site: string };
  counts: Record<Standing, number> & { unanswered: number; unbound: number };
  log: LogRecord[];
}

export type Stimulus = Record<string, unknown> & { act: string };

interface Configurator {
  view: View | null;
  grid: Grid;
  setGrid: (grid: Grid) => void;
  busy: boolean;
  error: string | null;
  /** Perform a root action; resolves to the view as the rules left it, or null if refused. */
  gesture: (stimulus: Stimulus) => Promise<View | null>;
  label: (id: string | null) => string;
}

const ConfiguratorContext = createContext<Configurator | null>(null);

export function useConfigurator(): Configurator {
  const value = useContext(ConfiguratorContext);
  if (!value) throw new Error("useConfigurator outside ConfiguratorProvider");
  return value;
}

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const { agent } = useAgent();
  const [view, setView] = useState<View | null>(null);
  const [grid, setGrid] = useState<Grid>("today");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/configurator/view?grid=${gridRef.current}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "could not read the state");
      setView(body);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, grid]);

  const running = agent?.isRunning ?? false;
  useEffect(() => {
    if (!running) {
      void refresh();
      return;
    }
    const timer = setInterval(() => void refresh(), 700);
    return () => clearInterval(timer);
  }, [running, refresh]);

  const gesture = useCallback(async (stimulus: Stimulus) => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/configurator/gesture?grid=${gridRef.current}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          // The body carries what the person did and nothing about how they
          // are looking at it: `grid` is a property of the read that comes
          // back, not of the act, and has no business in the action log.
          body: JSON.stringify(stimulus),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "the action was refused");
      setView(body.view);
      setError(null);
      return body.view as View;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const labels = useMemo(() => {
    const index = new Map<string, string>();
    for (const variable of view?.variables ?? [])
      for (const option of variable.options) index.set(option.id, option.label);
    return index;
  }, [view]);

  const label = useCallback(
    (id: string | null) => (id ? (labels.get(id) ?? id) : ""),
    [labels],
  );

  const value = useMemo(
    () => ({ view, grid, setGrid, busy, error, gesture, label }),
    [view, grid, busy, error, gesture, label],
  );

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

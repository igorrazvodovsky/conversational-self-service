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
 *
 * The person's own agent is a third caller and needs no polling: its tool
 * calls run in this page (`webmcp.tsx`) and go to `POST /gesture` as the
 * person's acts under its own actor, or to `POST /invoke` for the model's
 * verbs a person has no gesture for, and the view comes back with the
 * outcome as it does for a gesture.
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

/** `yielded`: asked for softly, and the rules could not honour it. Still
 * asserted, still answering its clause; the solver's answer is what moved. */
export type Standing = "asked" | "yielded" | "unmet" | "follows" | "open";
/** The surfaces `Moding` offers: the configuration (`canvas`), the
 * requirements, and the offer. The chat is not one — where it sits is the
 * person's view state (`example-layout/chat-surface.tsx`), which no rule
 * reaches. */
export type Surface = "requirements" | "canvas" | "quote";
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
  /** The value reached the solver softly: every clause it answers is negotiable. */
  softly: boolean;
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
  /** What the assistant proposed for a variable still open: a `Deciding`
   * request of its own, to take or leave beside the row. */
  proposed: {
    option: string;
    label: string;
    request: Request;
    /** What taking it would settle and cost; only while the
     * `consequences` facet is shown. */
    foreseen?: Foreseen;
  } | null;
  /** The requirements the person stated that rest on this value. A value
   * held for a reason is one the assistant cannot change. */
  held: string[];
  options: Option[];
}

/**
 * The canvas narrowed to what followed from one assertion, or to one
 * requirement, from `Framing`. The membership test is the read side's; each
 * variable carries `framed`. A clause frame is also the answering mode: a
 * pick made while it is on answers the clause.
 */
export type Frame =
  | { by: "assertion"; variable: string; heading: string; asked: string | null }
  | { by: "clause"; clause: string; text: string };

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
  standing: "asked" | "yielded" | "unmet" | "displaced" | "unrealisable";
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
  /** Where the model read the clause from, when it did: the reading's item,
   * the source, and the words. Off the trace, held by no concept. Null for a
   * clause the person typed. */
  source: {
    item: string;
    kind: "file" | "utterance";
    id: string;
    /** The file's name; null for the person's own words. */
    name: string | null;
    /** Who said the words, for a clause read from the chat: `person`, or
     * `browser` for the person's own agent. Null for a file. */
    broughtBy: string | null;
    words: string;
    /** The model recorded no option as answering the words: its claim that
     * nothing in the catalogue does, shown as such and not judged. */
    unanswerable: boolean;
  } | null;
  /** The answer this clause had, and the later assertion for the same
   * variable that displaced it. Only while the clause is unanswered. */
  displaced: {
    value: string;
    label: string;
    by: string;
    byLabel: string;
    how: string;
  } | null;
}

/** One item the model read from a source, and what became of it. */
export interface ReadItem {
  item: string;
  words: string;
  answer: { option: string; label: string }[];
  clause: string | null;
  /** Who the clause it became is stated by now: the assistant's reading
   * until the person keeps or rewords it. */
  statedBy: string | null;
  became: "answered" | "unanswered" | "struck" | null;
}

/**
 * A source, from `Filing` or `Conversing`, with what was read from it: a
 * document the person attached, or something they said that the model read
 * a requirement from. Checking a reading against its source whole is what
 * this is for.
 */
export interface Source {
  kind: "file" | "utterance";
  id: string;
  name: string | null;
  broughtBy: string;
  text: string;
  items: ReadItem[];
}

/** A conflict, a whole completion, or one proposed value; the last names its
 * variable and is carried on the variable's row rather than in `questions`. */
export type Request = {
  spec: string;
  about: "conflict" | "completion";
  variable?: string;
};

export interface Question {
  request: Request;
  about: "conflict" | "completion";
  reason: string;
  options: ({ variable: string; option: string } | Record<string, string>)[];
  /** A conflict question only: what each answer would do, in the options'
   * order. The options are what `choose` takes back; this is beside them. */
  foreseen?: Foreseen[];
  /** The question as the assistant put it to the person, if it did, and
   * where it stands: `awaiting` while nothing has been said or done about
   * it since (`docs/syncs/conduct.md`, "Asking, and waiting for the
   * answer"). */
  asked?: Asked | null;
}

export interface Asked {
  utterance: string;
  text: string;
  /** The question as put: what a reply is about. */
  about: { request: Request; offered: unknown[] };
  replies: { utterance: string; text: string; by: "you" | "your agent" }[];
  status:
    | "awaiting"
    | "replied"
    | "passed"
    | "chosen"
    | "declined"
    | "withdrawn"
    | "overtaken";
}

export interface Foreseen {
  variable: string;
  option: string;
  buildable: boolean;
  follows: { variable: string; heading: string; option: string; label: string }[];
  /** Settled now and not after: what the given-up assertion was forcing. */
  reopens: { variable: string; heading: string; option: string; label: string }[];
  instalment: number;
  lifetime: number;
  carbon: number | null;
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
  sources: Source[];
  /** The flows the person's own agent opened by speaking in the chat. Its
   * message there carries the flow as its id. */
  agentSaid: string[];
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
  /** What the last turn changed while the person was not looking at the
   * canvas, read off the log: who moved it, and which variables and clauses.
   * Null when the person's own gesture was the last thing to move the
   * specification. */
  touched: { by: string; variables: string[]; clauses: string[] } | null;
  counts: Record<Standing, number> & {
    unanswered: number;
    unbound: number;
    /** Clauses the model read, from a document or the person's words. */
    read: number;
  };
  log: LogRecord[];
}

export type Stimulus = Record<string, unknown> & { act: string };

/** What a tool returns to a model: what the rules did with the call, in the
 * vocabulary they did it in, and the reading afterwards. The same shape
 * `agent/tools.py` hands the in-app model. */
export interface Outcome {
  /** The flow the gesture opened, for the person's own agent's words: the
   * chat message that carries them has it as its id. */
  flow?: string;
  did: { action: string; "by rule"?: string; refused?: string }[];
  state: unknown;
}

interface Configurator {
  view: View | null;
  grid: Grid;
  setGrid: (grid: Grid) => void;
  busy: boolean;
  error: string | null;
  /** Perform a root action; resolves to the view as the rules left it, or null if refused. */
  gesture: (stimulus: Stimulus) => Promise<View | null>;
  /** The person's own agent performs one of the person's gestures, as them.
   * Resolves to what the rules did and the digest it reads; rejects when the
   * request fails, so the agent hears it rather than a silent nothing. */
  act: (stimulus: Stimulus) => Promise<Outcome>;
  /** The person's own agent calls one of the model's verbs a person has no
   * gesture for. Resolves to what the tool returns a model; rejects when the
   * engine refuses the call. */
  invoke: (tool: string, args?: Record<string, unknown>) => Promise<Outcome>;
  /** The reading a model gets — `review` in `agent/tools.py` — for the person's own agent. */
  review: () => Promise<unknown>;
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
  // A poll and a gesture are both in flight at once while the assistant is
  // running, and the answers can cross: a read started before the gesture
  // and answered after it would put the state the gesture moved away from
  // back on the canvas. So every response says where the log stood when it
  // was rendered, and one from further back than what is shown is dropped.
  // Equal positions are the same state; the later request wins so a change
  // of grid shows.
  const issued = useRef(0);
  const shown = useRef({ at: -1, ticket: 0 });
  const take = () => ++issued.current;
  const show = useCallback((ticket: number, next: View) => {
    const at = next.log.length ? next.log[next.log.length - 1].seq : 0;
    const current = shown.current;
    if (at < current.at || (at === current.at && ticket < current.ticket)) return;
    shown.current = { at, ticket };
    setView(next);
  }, []);

  const refresh = useCallback(async () => {
    const ticket = take();
    try {
      const response = await fetch(
        `/api/configurator/view?grid=${gridRef.current}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "could not read the state");
      show(ticket, body);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [show]);

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
    const ticket = take();
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
      show(ticket, body.view);
      setError(null);
      return body.view as View;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }, [show]);

  const act = useCallback(
    async (stimulus: Stimulus) => {
      setBusy(true);
      const ticket = take();
      try {
        const response = await fetch(
          `/api/configurator/gesture?actor=browser&grid=${gridRef.current}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(stimulus),
          },
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "the action was refused");
        show(ticket, body.view);
        setError(null);
        return { flow: body.flow, did: body.did, state: body.state } as Outcome;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  const invoke = useCallback(
    async (tool: string, args: Record<string, unknown> = {}) => {
      setBusy(true);
      const ticket = take();
      try {
        const response = await fetch(
          `/api/configurator/invoke?grid=${gridRef.current}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tool, ...args }),
          },
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "the call was refused");
        show(ticket, body.view);
        setError(null);
        return { did: body.did, state: body.state } as Outcome;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  const review = useCallback(async () => {
    const response = await fetch("/api/configurator/digest", {
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "could not read the state");
    return body as unknown;
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
    () => ({ view, grid, setGrid, busy, error, gesture, act, invoke, review, label }),
    [view, grid, busy, error, gesture, act, invoke, review, label],
  );

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

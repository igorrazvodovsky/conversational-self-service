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
 * actions, not in the channel.
 *
 * The person's own agent is a third caller, and may act with no page
 * involved: its tools are the MCP server's (`agent/delegate.py`), called
 * from its own client or forwarded there from this page (`webmcp.tsx`). So
 * while the model is idle the page asks only where the log stands
 * (`GET /at`), which costs nothing to answer, and reads the view again when
 * it has moved past what is shown.
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

/** A quantity, with what it is and the unit it is counted or measured in. */
export type Quantity = {
  quantity: string;
  meaning: string;
  value: number;
  unit: string;
};

/** One derivation (Deriving): a quantity worked out from stated ones. */
export type WorkedOut = Quantity & {
  derivation: string;
  method: string;
  formula: string;
  stated: Quantity[];
  assumed: Quantity[];
  option: string | null;
  label: string | null;
};

/** `yielded`: asked for softly, and the rules could not honour it. Still
 * asserted, still answering its clause; the solver's answer is what moved. */
export type Standing = "asked" | "yielded" | "unmet" | "follows" | "open";
export type Grid = "today" | "decarbonising";

export interface Option {
  id: string;
  label: string;
  note: string | null;
  possible: boolean;
  capital: number | null;
  monthly: number | null;
  /** What the option adds to the carbon over the lift's life, every stage
   * it has a figure for; null when it has none. */
  carbon: number | null;
  /** The rules that rule the option out, from `Constraining.excluding`.
   * Read only while the `excluded` facet is shown; empty otherwise, and
   * empty when the option is out by the person's own assertion alone. */
  excluded: { rule: string; because: string }[];
}

/** From `Showing`; `shown` is through the workspace's lens. */
export interface Facet {
  facet: string;
  about: string;
  shown: boolean;
  /** Shown before anybody has touched the menu. */
  usual: boolean;
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
  /** The party whose root action the assertion followed from — the person,
   * their own agent, or the assistant — read off the same edge as `how`. */
  by: "person" | "browser" | "model" | null;
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
 * The canvas narrowed to what followed from one assertion, to one
 * requirement, or to one gap, from `Framing`. The membership test is the
 * read side's; each variable carries `framed`. A clause frame is also the
 * answering mode: a pick made while it is on answers the clause. A gap frame
 * is a filter over the one list: what is still open, the requirements
 * nothing answers, or the values answering none.
 */
export type Gap = "open" | "unanswered" | "unbound";

export type Frame =
  | { by: "assertion"; variable: string; heading: string; asked: string | null }
  | { by: "clause"; clause: string; text: string }
  | { by: "gap"; gap: Gap }
  /** A step of the job, with a gap filtering within it; `counts` are the
   * gaps counted within the step (docs/syncs/stepping.md). */
  | {
      by: "step";
      step: string;
      name: string;
      gap: Gap | null;
      counts: { open: number; unanswered: number; unbound: number };
    };

export type Negotiability = "fixed" | "negotiable" | "open";

/**
 * What an out-of-date mark names as having changed: the clause an answer was
 * chosen for, or the variable whose asked-for value moved since an offer
 * was issued (`docs/syncs/staling.md`). The mark stays until the person
 * clears it.
 */
export type Basis = { clause: string } | { variable: string };

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
  /** Non-empty when the clause was reworded or relaxed since this was chosen. */
  stale: Basis[];
}

/**
 * One line of the requirement ledger: a clause from `Specifying` in the
 * person's words, with the choices from `Binding` that answer it. Several
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
    /** What the quantities read from the words were worked out into, by the
     * catalogue's methods: the result, what was stated, what was assumed,
     * and the option whose range holds the result, if one does. */
    workedOut: WorkedOut[];
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

export interface ReadItem {
  item: string;
  words: string;
  answer: { option: string; label: string }[];
  /** What the quantities the words were read as stating came to. */
  workedOut: WorkedOut[];
  clause: string | null;
  /** Who the clause it became is stated by now: the assistant's reading
   * until the person keeps or rewords it. */
  statedBy: string | null;
  became: "answered" | "unanswered" | "struck" | null;
}

/**
 * From `Filing` or `Conversing`. Checking a reading against its source whole
 * is what this is for.
 */
export interface Source {
  kind: "file" | "utterance";
  id: string;
  name: string | null;
  broughtBy: string;
  text: string;
  items: ReadItem[];
}

/** A conflict, what to finish the specification for, a whole completion, or
 * one proposed value; the last names its variable and is carried on the
 * variable's row rather than in `questions`. */
export type Request = {
  spec: string;
  about: "conflict" | "goal" | "completion";
  variable?: string;
};

export type Goal = "cost" | "carbon";

export interface Question {
  request: Request;
  about: "conflict" | "goal" | "completion";
  reason: string;
  options: ({ variable: string; option: string } | { goal: Goal } | Record<string, string>)[];
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

/** Who the quote is for, as the assistant asked it: `awaiting` while the
 * specification lacks only some of the fields asked for and nobody has
 * spoken since; `recorded` once none is missing; `withdrawn` once it lacks
 * something else as well (`docs/syncs/conduct.md`, "Asking who the quote
 * is for"). */
export interface AskedAddressee {
  utterance: string;
  text: string;
  about: { spec: string; missing: ("name" | "site")[] };
  replies: { utterance: string; text: string; by: "you" | "your agent" }[];
  status: "awaiting" | "replied" | "passed" | "recorded" | "withdrawn";
  /** What is still missing of what was asked. */
  lacking: ("name" | "site")[];
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

/** `draft` is the deal as it stands, which no one has issued; the rest are
 * an issued offer's. */
export type QuoteStanding = "draft" | "open" | "committed" | "revoked" | "lapsed";

/** What a party has said of who they are, from `Profiling`. */
export interface Party {
  name?: string;
  organisation?: string;
  address?: string;
  email?: string;
  phone?: string;
}

/**
 * The terms an offer was issued on, copied into the quote at issue as they
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
  /** The draft only: no term is chosen, so the months are the basis's presumption. */
  presumed?: boolean;
  validity: number;
  warranty: number;
  approval: number;
  installation: number;
  byOthers: string[];
  /** Each payment stage, in the seller's words and as the milestone it falls due on. */
  stages: { upon: string; event?: string; share: number }[];
  clauses: Record<string, string[]>;
  /**
   * Stipulating's programme as it answered at issue: each milestone's week
   * from order, and the months of warranty and of maintenance after
   * acceptance. Absent on a quote that holds none.
   */
  programme?: {
    milestones: { event: string; week: number }[];
    warranty: number;
    maintenance: number;
  } | null;
}

/**
 * An assignment with its requirements and the grounds of each value: what a
 * quote froze at issue, or the specification as it stands read the same
 * way. Either side of a comparison is one.
 */
export interface Side {
  amount: number;
  terms: { months: number; recurring: number };
  holds: {
    name: string;
    heading: string;
    family: string;
    value: string;
    label: string;
    note: string | null;
  }[];
  requires: {
    clause: string;
    text: string;
    negotiability: Negotiability;
    answeredBy: { value: string; label: string }[];
  }[];
  /**
   * Why each value holds, by variable: asserted, gave way, or follows, with
   * the rules and assertions behind it and what it adds to the price. Null
   * on a quote whose frozen item carries none.
   */
  grounds: Record<string, Ground> | null;
}

/**
 * The document at one moment: from `Quoting`, with what the read side works
 * out from it today, its side as it stood at issue; or the draft, the deal
 * as it stands read the same way (`docs/ui.md`, "One document, read several
 * ways"). The draft has no number and no validity.
 */
export interface Quote extends Side {
  quote: string;
  number: number | null;
  standing: QuoteStanding;
  terms: Terms;
  issued: string | null;
  until: string | null;
  committed: string | null;
  issuedTo: string;
  how: string | null;
  differs: string[];
  /** The assertions that moved since issue, until the person clears the mark;
   * `differs` is the detail, recomputed on every read. */
  stale: Basis[];
  footprint: Carbon;
}

/** The draft: the deal as it stands, with the keys an issued quote has, so
 * every view lays it out as it lays out an offer. The default moment. */
export interface Draft extends Quote {
  quote: "draft";
  standing: "draft";
  number: null;
  until: null;
  /** The variables still open, which have no line. */
  open: { name: string; heading: string }[];
  /** False while anything is open or the term is presumed. */
  complete: boolean;
  /** Why it cannot yet be issued, or that it can, in the words the standing gives. */
  because: string;
}

/**
 * From `HandingOver`: the specification put into the seller's hands, with the
 * reason. Nothing travelled — the seller reads the specification as it
 * stands, and the log says how it got there (`docs/syncs/handover.md`). Who
 * handed it over and when are the log's, as `how` and `issued` are for a
 * quote. `received` stays null: nothing here performs the receipt.
 */
export interface Handover {
  handover: string;
  number: number;
  to: string;
  reason: string;
  sent: string | null;
  received: string | null;
  how: string | null;
}

/**
 * What the person wants has gone beyond what any rule lets the assistant do
 * or any gesture lets them do, as far as the state can tell: a fixed
 * requirement the catalogue cannot meet as stated, or a conflict they replied
 * to in words and left open. The chat offers the seller then; nothing hands
 * over on its own (`docs/syncs/handover.md`, "When the assistant hands over").
 */
export type Beyond =
  | { because: "fixed"; clause: string; text: string; variable: string }
  | { because: "replied"; request: Request };

/** Footprinting's estimate, by stage of the lift's life. `complete` when
 * the energy in use is known. */
export interface Carbon {
  made: number;
  installed: number;
  maintained: number;
  run: number;
  ended: number;
  total: number;
  complete: boolean;
}

/** The settled values' prices summed by the catalogue's family, in its order. */
export interface Stage {
  family: string;
  capital: number;
  monthly: number;
}

export interface Ground {
  /** `unmet` only on the specification as it stands: no quote holds one. */
  standing: "asked" | "yielded" | "follows" | "unmet";
  /** The option asserted, when it gave way to another. */
  asked?: string;
  askedLabel: string | null;
  party?: string;
  /** Who asserted it, as the canvas said at issue, or says now. */
  how: string | null;
  owing: { rule: string; because: string }[];
  following: { variable: string; heading: string }[];
  capital: number;
  monthly: number;
}

/** One turn of the log: a flow, with every completion it wrote
 * (`docs/ui.md`, "What a view is"). */
export interface Turn {
  flow: string;
  /** Who opened it. */
  actor: string;
  /** Every party with a root action in it. */
  parties: string[];
  /** What it did, by the concepts it reached: each a `kind` in `View.kinds`. */
  kinds: string[];
  /** Whether it only narrowed the canvas or changed what is shown beside its items. */
  moved: boolean;
  /** Whether it came after the person last changed the specification
   * themselves, whoever took it. */
  fresh: boolean;
  /** Seconds since the epoch. */
  at: number;
  /** What started it: a gesture's act, the tool the model called, or the action. */
  opened: string;
  /** What started it, in a phrase, for a turn that changed no clause or value. */
  did: string;
  /** The words said in it, when it was opened by words. */
  said: { utterance: string; text: string } | null;
  /** The documents read in it. */
  files: string[];
  /** The clauses and values it changed, each as it was then. */
  stated: { clause: string; text: string }[];
  reworded: { clause: string; text: string }[];
  struck: { clause: string; text: string }[];
  asserted: { variable: string; option: string }[];
  withdrawn: string[];
  records: {
    seq: number;
    concept: string;
    action: string;
    actor: string;
    via: string | null;
    refused: boolean;
  }[];
}

/** One step of the job, as the seller's template names it or as the person
 * renamed or added it. `wanting` is the variables of its needs that stand
 * open: nothing asserted and nothing following (docs/syncs/stepping.md). */
export interface Step {
  step: string;
  at: string;
  name: string;
  template: string | null;
  owner: string;
  status: "open" | "finished" | "skipped";
  needs: { variable: string; heading: string; standing: Standing; at: string }[];
  wanting: string[];
  deviation: { kind: string; text: string }[];
}

export interface View {
  spec: string;
  grid: Grid;
  product: string;
  currency: string;
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
  /** The utterance each chat message became, by the message's id. */
  said: Record<string, string>;
  /** The conversation each utterance was said in, when it was recorded. */
  saidIn: Record<string, string>;
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
  footprint: Carbon & {
    grid: string;
    intensity: number;
    basis: string;
    horizon: number;
    uplift: number;
    scope: string;
    complete: boolean;
  };
  /** What falls at each stage of the lift's life, by the catalogue's family. */
  stages: Stage[];
  questions: Question[];
  quotes: Quote[];
  /** The deal as it stands, read the way a quote requested now would freeze it. */
  draft: Draft;
  quotable: { ok: boolean; because: string; asked?: AskedAddressee | null };
  handovers: Handover[];
  beyond: Beyond | null;
  /** Where the person is in the job: `at` is the step they took, `start`
   * the first still wanting something while they have taken none. */
  stepping: { at: string | null; start: string | null; steps: Step[] };
  customer: Party;
  seller: Party;
  project: { title: string; site: string };
  counts: Record<Standing, number> & {
    unanswered: number;
    unbound: number;
    /** Clauses the model read, from a document or the person's words. */
    read: number;
  };
  /** The log, read by turn, latest activity first. */
  turns: Turn[];
  /** Who has taken a turn, with their name and the side of the sale they
   * act for; `person` is whoever is looking. */
  parties: { actor: string; label: string; side: "buyer" | "seller" | null }[];
  /** What a turn can have done, in order, with its name. */
  kinds: { kind: string; label: string }[];
  /** Where the log stood when the view was read. */
  at: number;
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

/** A tool on the person's own agent's MCP server (`agent/delegate.py`). */
export interface DelegatedTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  _meta?: { ui?: { resourceUri?: string; visibility?: ("model" | "app")[] } };
}

/** Stateless, so no session is opened first. */
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await fetch("/api/configurator/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await response.json();
  if (!response.ok || body.error)
    throw new Error(body.error?.message ?? body.error ?? `${method} failed`);
  return body.result;
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
  tools: () => Promise<DelegatedTool[]>;
  /** Call one of them; resolves to what it returns once the canvas shows
   * what it did, and rejects when the call fails. */
  call: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** The reading a model gets — `review` in `agent/tools.py` — for the person's own agent. */
  review: () => Promise<unknown>;
  label: (id: string | null) => string;
  /** The view as last shown, read when called rather than when rendered:
   * what a tool's result links to once the call has settled. */
  latest: () => View | null;
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
  // How many gestures and calls are in flight: they can overlap, so the
  // first to settle must not say the canvas is quiet while another runs.
  const [inFlight, setInFlight] = useState(0);
  const busy = inFlight > 0;
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
  const shown = useRef<{ at: number; ticket: number; view: View | null }>({
    at: -1,
    ticket: 0,
    view: null,
  });
  const take = () => ++issued.current;
  const show = useCallback((ticket: number, next: View) => {
    const at = next.at;
    const current = shown.current;
    if (at < current.at || (at === current.at && ticket < current.ticket)) return;
    shown.current = { at, ticket, view: next };
    setView(next);
  }, []);
  const latest = useCallback(() => shown.current.view, []);

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

  useEffect(() => {
    if (running) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/configurator/at", { cache: "no-store" });
        const { at } = await response.json();
        if (typeof at === "number" && at > shown.current.at) void refresh();
      } catch {
        // The next tick asks again; `refresh` reports a server that is down.
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [running, refresh]);

  // No control is disabled while a gesture is in flight (`docs/ui.md`), so
  // the guard against a double press is here: the same gesture pressed again
  // before the first has settled is the first, and resolves with it. A
  // question takes one answer, so any second answer to it in that time is
  // the first too. A different gesture goes ahead, as one a followed link
  // performs always has; the engine takes actions one at a time.
  const pending = useRef(new Map<string, Promise<View | null>>());
  const perform = useCallback(async (stimulus: Stimulus) => {
    setInFlight((n) => n + 1);
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
      setInFlight((n) => n - 1);
    }
  }, [show]);

  const gesture = useCallback(
    (stimulus: Stimulus) => {
      const answers = stimulus.act === "choose" || stimulus.act === "decline";
      const key = JSON.stringify(answers ? ["answer", stimulus.request] : stimulus);
      const same = pending.current.get(key);
      if (same) return same;
      const done = perform(stimulus).finally(() => pending.current.delete(key));
      pending.current.set(key, done);
      return done;
    },
    [perform],
  );

  const act = useCallback(
    async (stimulus: Stimulus) => {
      setInFlight((n) => n + 1);
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
        setInFlight((n) => n - 1);
      }
    },
    [show],
  );

  const tools = useCallback(
    async () => (await rpc("tools/list")).tools as DelegatedTool[],
    [],
  );

  const call = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      setInFlight((n) => n + 1);
      try {
        const result = await rpc("tools/call", { name, arguments: args });
        await refresh();
        if (result.isError)
          throw new Error(result.content?.[0]?.text ?? `${name} failed`);
        return result.structuredContent ?? result.content;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      } finally {
        setInFlight((n) => n - 1);
      }
    },
    [refresh],
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
    () => ({
      view, grid, setGrid, busy, error, gesture, act, tools, call, review, label, latest,
    }),
    [view, grid, busy, error, gesture, act, tools, call, review, label, latest],
  );

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

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
 * actions now, not in the channel. See docs/conceptual-model.md.
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
export type Grid = "today" | "decarbonising";

export interface Option {
  id: string;
  label: string;
  note: string | null;
  possible: boolean;
  capital: number | null;
  monthly: number | null;
  embodied: number | null;
}

export interface Variable {
  name: string;
  heading: string;
  family: string;
  standing: Standing;
  asked: string | null;
  how: string | null;
  value: string | null;
  owing: { rule: string; because: string }[];
  refused: { rule: string; because: string }[];
  options: Option[];
}

export type Request = { spec: string; about: "conflict" | "completion" };

export interface Question {
  request: Request;
  about: "conflict" | "completion";
  reason: string;
  options: ({ variable: string; option: string } | Record<string, string>)[];
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
  mode: "chat" | "canvas";
  variables: Variable[];
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
  counts: Record<Standing, number>;
  log: LogRecord[];
}

export type Stimulus = Record<string, unknown> & { act: string };

interface Configurator {
  view: View | null;
  grid: Grid;
  setGrid: (grid: Grid) => void;
  busy: boolean;
  error: string | null;
  gesture: (stimulus: Stimulus) => Promise<void>;
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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

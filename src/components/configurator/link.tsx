"use client";

/**
 * The page's URL is its state (`docs/ui.md`, "Links").
 *
 * The fragment names an item (`address.tsx`); the query names the view, in
 * the page's own words:
 *
 *   view     asked | proposal | timeline | drawing | compared  which view of the document
 *   quote    a quote's id; absent for the draft                 which moment it shows
 *   against  a quote's id, or `now`, the draft                  the other side, when compared
 *   check    unanswered | changed                               a filter over an offer read as asked
 *   frame    none | gap:<gap> | assertion:<variable> | clause:<id>
 *            | step:<id> | step:<id>:<gap>                     Framing
 *   show     facet names, comma-separated, possibly none       Showing
 *   grid     today | decarbonising                             the read
 *   thread   a conversation's id                               the chat
 *
 * `frame` and `show` are facts every party shares, so opening a link
 * performs the gestures that bring the recorded view to what the query
 * says, each only where it differs, and an absent one leaves its part as it
 * is; going back to an entry the page wrote reads an absent one as its
 * default, since the page leaves out only defaults. The rest are the
 * viewer's and are never recorded; an absent one is its default: the draft,
 * read against what was asked, compared with nothing, on today's grid. The
 * page writes the view back as it changes, defaults left out: a navigation
 * the person makes pushes an entry, a change anyone else makes replaces it,
 * so the address bar is always a link to what is on screen and the back
 * button returns to where the person was.
 *
 * Older forms go on working as aliases and are never written: `on=quotes`
 * opens the latest offer, and `reading=` is `view=`.
 *
 * Readers off the page need links that work off the page: `linked` gives
 * every unit a tool returns its URL beside its address.
 */

import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { CheckIcon, LinkIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { arrive, goTo, NOW, placeOf, type Place } from "./address";
import {
  useConfigurator,
  type Frame,
  type Grid,
  type Stimulus,
  type View,
} from "./provider";

// -- the words ----------------------------------------------------------------

export const VIEWS = ["asked", "proposal", "timeline", "drawing", "compared"] as const;
export type ViewName = (typeof VIEWS)[number];
/** The views, as the tab, the heading and the nav name them. */
export const TITLE: Record<ViewName, string> = {
  asked: "Specification",
  proposal: "Proposal",
  timeline: "Along time",
  drawing: "To scale",
  compared: "Compared",
};
export const CHECKS = ["unanswered", "changed"] as const;
export type Check = (typeof CHECKS)[number];

const GAPS = ["open", "unanswered", "unbound"];
const GRIDS: Grid[] = ["today", "decarbonising"];

type FrameAsked =
  | { by: "assertion"; variable: string }
  | { by: "clause"; clause: string }
  | { by: "gap"; gap: string }
  | { by: "step"; step: string; gap?: string | null };

export function frameWord(frame: Frame | FrameAsked | null): string {
  if (!frame) return "none";
  if (frame.by === "gap") return `gap:${frame.gap}`;
  if (frame.by === "assertion") return `assertion:${frame.variable}`;
  if (frame.by === "step") return frame.gap ? `step:${frame.step}:${frame.gap}` : `step:${frame.step}`;
  return `clause:${frame.clause}`;
}

/** The frame a word names: null for none, undefined for a word it cannot read. */
function frameNamed(word: string): FrameAsked | null | undefined {
  if (word === "none") return null;
  const at = word.indexOf(":");
  const [by, rest] = [word.slice(0, at), word.slice(at + 1)];
  if (at < 0 || !rest) return undefined;
  if (by === "gap") return GAPS.includes(rest) ? { by, gap: rest } : undefined;
  if (by === "assertion") return { by, variable: rest };
  if (by === "clause") return { by, clause: rest };
  if (by === "step") {
    // A step's id carries a colon of its own (`spec:shaft`), so the gap is
    // the last word only when it names one.
    const last = rest.lastIndexOf(":");
    const gap = last >= 0 ? rest.slice(last + 1) : "";
    if (GAPS.includes(gap)) return { by, step: rest.slice(0, last), gap };
    return { by, step: rest };
  }
  return undefined;
}

const shownOf = (view: View) =>
  view.showing.filter((f) => f.shown).map((f) => f.facet);

// -- the moment and the view --------------------------------------------------

/** Which view of the document is open, at which moment, compared with what. */
export interface Moment {
  view: ViewName;
  /** An issued quote's id, or null for the draft. */
  quote: string | null;
  against: string | null;
  check: Check | null;
}

/** The moment and the view a query names, defaults filled in. `quotes` are
 * the issued offers, for the older `on=quotes`, which meant the latest. */
export function momentOf(params: URLSearchParams, quotes: { quote: string }[] = []): Moment {
  const word = params.get("view") ?? params.get("reading");
  const view = VIEWS.includes(word as ViewName) ? (word as ViewName) : "asked";
  let quote = params.get("quote") || null;
  if (!quote && params.get("on") === "quotes") quote = quotes.at(-1)?.quote ?? null;
  if (quote === "draft") quote = null;
  const checked = params.get("check");
  return {
    view,
    quote,
    against: params.get("against") || null,
    check: CHECKS.includes(checked as Check) ? (checked as Check) : null,
  };
}

/** The moment and the view, read from the URL, and a way to change them:
 * each change is the person going somewhere, so a new entry in the history. */
export function useMoment(): Moment & { set: (update: Partial<Moment>) => void } {
  const params = useSearchParams();
  const { view } = useConfigurator();
  const quotes = view?.quotes ?? [];
  const moment = useMemo(
    () => momentOf(new URLSearchParams(params.toString()), quotes),
    // The quotes matter only for the older form, which names the latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, quotes.length],
  );
  // An older form is read once and written back in the current one, so
  // the address bar is a link in the page's own words.
  useEffect(() => {
    if (!params.has("on") && !params.has("reading")) return;
    if (params.get("on") === "quotes" && !quotes.length) return;
    setQuery({
      on: null,
      reading: null,
      view: moment.view === "asked" ? null : moment.view,
      quote: moment.quote,
    });
  }, [params, moment, quotes.length]);
  const set = useCallback((update: Partial<Moment>) => {
    const next: Record<string, string | null> = {};
    if ("view" in update) next.view = update.view && update.view !== "asked" ? update.view : null;
    if ("quote" in update) next.quote = update.quote ?? null;
    if ("against" in update) next.against = update.against ?? null;
    if ("check" in update) next.check = update.check ?? null;
    // The older forms say nothing once the new ones do.
    next.on = null;
    next.reading = null;
    setQuery(next, true);
  }, []);
  return { ...moment, set };
}

// -- reading and writing the URL ----------------------------------------------

/** The order the parameters are written in, so the same view is the same URL. */
const ORDER = ["view", "quote", "against", "check", "frame", "show", "grid", "thread"];

/** A query, written so a person can read it: `:` and `,` are left as they
 * are, which a query may carry (RFC 3986), rather than `%3A` and `%2C`. */
function queryOf(params: URLSearchParams): string {
  const keys = [...new Set([...ORDER.filter((k) => params.has(k)), ...params.keys()])];
  const parts = keys.map((k) => {
    const value = encodeURIComponent(params.get(k) ?? "")
      .replace(/%3A/gi, ":")
      .replace(/%2C/gi, ",");
    return `${encodeURIComponent(k)}=${value}`;
  });
  return parts.length ? `?${parts.join("&")}` : "";
}

/** A null removes a parameter, and the fragment is kept unless `leave`.
 * Through the native history API, which the router keeps `useSearchParams` in step with; a
 * router navigation would fetch the page's server half again. */
export function setQuery(
  update: Record<string, string | null>,
  push = false,
  leave = false,
) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(update))
    if (v === null) params.delete(k);
    else params.set(k, v);
  const fragment = leave ? "" : window.location.hash;
  const next = `${window.location.pathname}${queryOf(params)}${fragment}`;
  const now = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === now) return;
  window.history[push ? "pushState" : "replaceState"](null, "", next);
}

/** The recorded view's parameters, defaults left out — or, `complete`,
 * every recorded part spelled out, so whoever opens the link sees this
 * view whatever theirs was. */
function viewParams(view: View, complete: boolean): Record<string, string | null> {
  const usual = view.showing.every((f) => f.shown === f.usual);
  return {
    frame: complete || view.frame ? frameWord(view.frame) : null,
    show: complete || !usual ? shownOf(view).join(",") : null,
  };
}

function paramsOf(stimulus: Stimulus): Record<string, string | null> | null {
  if (stimulus.act === "frame") return { frame: frameWord(stimulus.frame as FrameAsked) };
  if (stimulus.act === "unframe") return { frame: null };
  return null;
}

export const linkTo = (at: string) =>
  `${window.location.origin}/${at.startsWith("#") ? at : `#${at}`}`;

export function viewLink(view: View, at = false): string {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(viewParams(view, true)))
    if (v !== null) params.set(k, v);
  return `${window.location.origin}/${queryOf(params)}${at ? window.location.hash : ""}`;
}

/** For the person's own agent, which reports in a chat of its own where a
 * fragment means nothing. */
export function linked(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(linked);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = linked(v);
  if (typeof out.at === "string" && out.at.startsWith("#")) out.link = linkTo(out.at);
  if (typeof out.page === "string" && out.page.startsWith("/"))
    out.page = `${window.location.origin}${out.page}`;
  return out;
}

// -- following a URL ----------------------------------------------------------

/** Resolves once every gesture has. `written` is an entry in this tab's
 * history, which the page wrote, so an absent part reads as its default. */
function useBring() {
  const { view, gesture, grid, setGrid } = useConfigurator();
  const chat = useCopilotChatConfiguration();
  const latest = useRef({ view, grid, chat });
  latest.current = { view, grid, chat };

  return useCallback(
    async (search: string, written = false) => {
      const params = new URLSearchParams(search);
      let now = latest.current.view;
      if (!now) return;
      if (written) {
        if (!params.has("frame")) params.set("frame", "none");
        if (!params.has("show"))
          params.set("show", now.showing.filter((f) => f.usual).map((f) => f.facet).join(","));
        if (!params.has("grid")) params.set("grid", "today");
      }
      const perform = async (stimulus: Stimulus) => {
        const next = await gesture(stimulus);
        if (next) now = next;
      };

      const word = params.get("frame");
      const frame = word === null ? undefined : frameNamed(word);
      if (frame !== undefined && frameWord(frame) !== frameWord(now.frame))
        await perform(frame ? { act: "frame", frame } : { act: "unframe" });

      const show = params.get("show");
      if (show !== null) {
        const wanted = new Set(show.split(",").filter(Boolean));
        for (const facet of now.showing)
          if (wanted.has(facet.facet) !== facet.shown)
            await perform({ act: facet.shown ? "hide" : "show", facet: facet.facet });
      }

      const grid = params.get("grid") as Grid | null;
      if (grid && GRIDS.includes(grid) && grid !== latest.current.grid) setGrid(grid);

      const thread = params.get("thread");
      const config = latest.current.chat;
      if (thread && config && thread !== config.threadId)
        config.setActiveThreadId(thread, { explicit: true });
    },
    [gesture, setGrid],
  );
}

/**
 * Once the first view has arrived, the query the page was opened with is followed; until then
 * nothing is written, so the link is not overwritten before it is read.
 * After that the view is written back as it changes, and going back through
 * the history follows the query again. Resolves to whether the link has
 * been followed, which the fragment waits on (`useFollowAddress`).
 */
export function usePlace(): boolean {
  const { view, grid } = useConfigurator();
  const chat = useCopilotChatConfiguration();
  const bring = useBring();
  const [arrived, setArrived] = useState(false);
  // While a query is being followed the view passes through states it does
  // not name; the URL is written once it has settled.
  const bringing = useRef(false);
  const [settled, settle] = useState(0);
  const ready = view !== null;

  useEffect(() => {
    if (!ready || arrived) return;
    bringing.current = true;
    void bring(window.location.search).finally(() => {
      bringing.current = false;
      setArrived(true);
    });
  }, [ready, arrived, bring]);

  useEffect(() => {
    if (!arrived) return;
    const back = () => {
      bringing.current = true;
      void bring(window.location.search, true).finally(() => {
        bringing.current = false;
        settle((n) => n + 1);
      });
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [arrived, bring]);

  const params = view ? viewParams(view, false) : null;
  const key = params ? `${params.frame}|${params.show}` : "";
  const thread = chat?.threadId ?? null;
  useEffect(() => {
    if (!arrived || !params || bringing.current || !view) return;
    setQuery({ ...params, grid: grid === "today" ? null : grid, thread });
    // `key` stands for `params`.
  }, [arrived, settled, key, grid, thread]);

  return arrived;
}

/**
 * Follow the page's fragment, once each time it changes: open the moment and
 * the view that hold the item, then scroll to it once it has rendered. The
 * view arrives after the page does, so the browser's own scroll to the
 * fragment finds nothing; this repeats it when the view has rendered. A
 * fragment already followed is left alone when the view changes for another
 * reason, so the address does not pull the person back.
 */
export function useFollowAddress(arrived: boolean): string | null {
  const { view, gesture } = useConfigurator();
  const hash = useHashWord();
  const ready = view !== null && arrived;
  // The address followed last, when nothing was found at it.
  const [lost, setLost] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const framed = useRef(false);
  const isFramed = !!view?.frame;
  useEffect(() => {
    framed.current = isFramed;
  }, [isFramed]);
  useEffect(() => {
    pending.current = hash || null;
    setLost(null);
  }, [hash]);
  useEffect(() => {
    const id = pending.current;
    if (!ready || !id) return;
    pending.current = null;
    const place = placeOf(id);
    if (place) open(place);
    let tries = 0;
    let widened = false;
    const find = () => {
      const el = document.getElementById(id);
      if (el) arrive(el);
      else if (tries++ < 10) setTimeout(find, 50);
      else if (framed.current && !widened && place?.view === "asked" && !place.quote) {
        // Not drawn: the frame leaves it out. Show everything, and look again.
        widened = true;
        tries = 0;
        void gesture({ act: "unframe" }).then(() => setTimeout(find, 50));
      } else if (tries < 40) setTimeout(find, 50);
      // Words in the chat render once their conversation has loaded, and go
      // to themselves then (`chat/index.tsx`).
      else if (place) setLost(id);
    };
    find();
  }, [ready, hash, gesture]);
  return lost;
}

/** Open the moment and the view an item is in, where the ones open do not
 * hold it. Following the address made the history entry already. */
function open(place: Place) {
  const params = new URLSearchParams(window.location.search);
  const now = momentOf(params);
  const update: Record<string, string | null> = {};
  if (now.quote !== place.quote) update.quote = place.quote;
  if (place.view && now.view !== place.view) update.view = place.view === "asked" ? null : place.view;
  if (place.against !== undefined && now.against !== place.against) update.against = place.against;
  if (Object.keys(update).length) {
    update.on = null;
    update.reading = null;
    setQuery(update);
  }
}

function useHashWord(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

/**
 * Perform a gesture that is the person navigating — a filter, a frame — as
 * a new entry in the history first, so the back button returns to where
 * they were.
 */
export function useNavigate() {
  const { gesture } = useConfigurator();
  return useCallback(
    (stimulus: Stimulus) => {
      const params = paramsOf(stimulus);
      if (params) setQuery(params, true);
      return gesture(stimulus);
    },
    [gesture],
  );
}

/**
 * Follow a link to this page from inside it — one the chat carries, the
 * assistant's or pasted by the person — in place rather than in a new tab:
 * the view its query names, then the item its fragment names. Returns false
 * for a link to anywhere else, which is left to open as links do.
 */
export function useFollowLink() {
  const bring = useBring();
  return useCallback(
    (href: string): boolean => {
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname)
        return false;
      const hash = decodeURIComponent(url.hash.slice(1));
      if (url.search) {
        const params = new URLSearchParams(window.location.search);
        new URLSearchParams(url.search).forEach((v, k) => params.set(k, v));
        window.history.pushState(null, "", `${url.pathname}${queryOf(params)}${window.location.hash}`);
        void bring(url.search).then(() => hash && goTo(hash));
      } else if (hash) goTo(hash);
      return true;
    },
    [bring],
  );
}

export { NOW };

// -- copying a link -----------------------------------------------------------

/** Copy a URL, and say so: the icon for the eye, a live region for a screen
 * reader. */
export function CopyLink({
  url,
  label = "Copy link",
  size = "icon-sm",
  className,
}: {
  url: () => string | null;
  label?: string;
  size?: "icon-xs" | "icon-sm" | "sm";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const icon = copied ? <CheckIcon /> : <LinkIcon />;
  return (
    <>
      <Button
        variant={size === "sm" ? "outline" : "ghost"}
        size={size}
        title={label}
        className={className}
        onClick={() => {
          const text = url();
          if (!text) return;
          void navigator.clipboard.writeText(text).then(() => setCopied(true));
        }}
      >
        {icon}
        {size === "sm" ? label : <span className="sr-only">{label}</span>}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}

export function CopyViewLink() {
  const { view } = useConfigurator();
  return (
    <CopyLink
      label="Copy link to this view"
      // The header's other triggers, the bell and the Show menu, are `xs` and muted.
      size="icon-xs"
      className="text-muted-foreground"
      url={() => (view ? viewLink(view, true) : null)}
    />
  );
}

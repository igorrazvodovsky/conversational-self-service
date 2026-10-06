"use client";

/**
 * The page's URL is its state (`docs/ui.md`, "Links").
 *
 * The fragment names an item (`address.tsx`); the query names the view, in
 * the page's own words:
 *
 *   on       specification | quotes                          Moding
 *   frame    none | gap:<gap> | assertion:<variable> | clause:<id>   Framing
 *   show     facet names, comma-separated, possibly none     Showing
 *   grid     today | decarbonising                           the read
 *   quote    a quote's id                                    the quote surface
 *   reading  asked | timeline | proposal                     the quote surface
 *   against  a quote's id, or `now`                          the quote surface
 *   thread   a conversation's id                             the chat
 *
 * `on`, `frame` and `show` are facts every party shares, so opening a link
 * performs the gestures that bring the recorded view to what the query
 * says, each only where it differs, and an absent one leaves its part as it
 * is; going back to an entry the page wrote reads an absent one as its
 * default, since the page leaves out only defaults. The rest are the
 * viewer's and are never recorded; an absent one is its default. The page writes the view back as it changes, defaults left out:
 * a navigation the person makes pushes an entry, a change anyone else makes
 * replaces it, so the address bar is always a link to what is on screen and
 * the back button returns to where the person was.
 *
 * Readers off the page need links that work off the page: `linked` gives
 * every unit a tool returns its URL beside its address.
 */

import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { CheckIcon, LinkIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { goTo, surfaceOf } from "./address";
import {
  useConfigurator,
  type Frame,
  type Grid,
  type Stimulus,
  type Surface,
  type View,
} from "./provider";

// -- the words ----------------------------------------------------------------

const SURFACE: Record<Surface, string> = { canvas: "specification", quote: "quotes" };
const surfaceNamed = (word: string | null): Surface | null =>
  word === "specification" ? "canvas" : word === "quotes" ? "quote" : null;

const GAPS = ["open", "unanswered", "unbound"];
const GRIDS: Grid[] = ["today", "decarbonising"];
export const READINGS = ["asked", "timeline", "proposal"] as const;
export type Reading = (typeof READINGS)[number];

type FrameAsked =
  | { by: "assertion"; variable: string }
  | { by: "clause"; clause: string }
  | { by: "gap"; gap: string };

/** A frame in the query's words. */
export function frameWord(frame: Frame | FrameAsked | null): string {
  if (!frame) return "none";
  if (frame.by === "gap") return `gap:${frame.gap}`;
  if (frame.by === "assertion") return `assertion:${frame.variable}`;
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
  return undefined;
}

const shownOf = (view: View) =>
  view.showing.filter((f) => f.shown).map((f) => f.facet);

// -- reading and writing the URL ----------------------------------------------

/** The order the parameters are written in, so the same view is the same URL. */
const ORDER = ["on", "frame", "show", "grid", "quote", "reading", "against", "thread"];

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

/** Set parameters on the current URL — a null removes one — keeping the
 * fragment unless `leave`. `push` makes it a new entry in the history. Through the native
 * history API, which the router keeps `useSearchParams` in step with; a
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
  // The person going to the other surface leaves the item they were at: a
  // link still carrying it would bring that surface back.
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const on = push && "on" in update ? surfaceNamed(params.get("on") ?? "specification") : null;
  const item = hash ? surfaceOf(hash) : null;
  const fragment = leave || (item && on && item !== on) ? "" : window.location.hash;
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
    on: complete || view.mode !== "canvas" ? SURFACE[view.mode] : null,
    frame: complete || view.frame ? frameWord(view.frame) : null,
    show: complete || !usual ? shownOf(view).join(",") : null,
  };
}

/** The parameters a gesture navigates to, for the history entry it makes. */
function paramsOf(stimulus: Stimulus): Record<string, string | null> | null {
  if (stimulus.act === "focus")
    return { on: stimulus.surface === "canvas" ? null : SURFACE[stimulus.surface as Surface] };
  if (stimulus.act === "frame") return { frame: frameWord(stimulus.frame as FrameAsked) };
  if (stimulus.act === "unframe") return { frame: null };
  return null;
}

/** An address as a URL that works off the page. */
export const linkTo = (at: string) =>
  `${window.location.origin}/${at.startsWith("#") ? at : `#${at}`}`;

/** The URL of the view as it stands, every recorded part spelled out; with
 * the item the page is at, when `at` is true. */
export function viewLink(view: View, at = false): string {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(viewParams(view, true)))
    if (v !== null) params.set(k, v);
  // The quote shown, named rather than left to mean the latest, which moves.
  if (view.mode === "quote" && !params.has("quote") && view.quotes.length)
    params.set("quote", view.quotes[view.quotes.length - 1].quote);
  return `${window.location.origin}/${queryOf(params)}${at ? window.location.hash : ""}`;
}

/**
 * Every unit a tool returns, with its URL beside its address: `link` beside
 * an `at`, and a quote's `page` made absolute. For the person's own agent,
 * which reports in a chat of its own where a fragment means nothing.
 */
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

/** Bring the view to what a query says: the recorded parts by gesture, each
 * only where it differs; the grid and the conversation directly. Resolves
 * once every gesture has.
 *
 * A link from elsewhere that leaves a recorded part out leaves it as it is.
 * An entry in this tab's history was written by the page, which leaves out
 * only defaults, so going back to one reads an absent part as its default
 * (`written`). */
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
        if (!params.has("on")) params.set("on", SURFACE.canvas);
        if (!params.has("frame")) params.set("frame", "none");
        if (!params.has("show"))
          params.set("show", now.showing.filter((f) => f.usual).map((f) => f.facet).join(","));
        if (!params.has("grid")) params.set("grid", "today");
      }
      const perform = async (stimulus: Stimulus) => {
        const next = await gesture(stimulus);
        if (next) now = next;
      };

      const surface = surfaceNamed(params.get("on"));
      if (surface && surface !== now.mode) await perform({ act: "focus", surface });

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
 * The page's URL and its view, kept in step. Once the first view has
 * arrived, the query the page was opened with is followed; until then
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
  const key = params ? `${params.on}|${params.frame}|${params.show}` : "";
  const thread = chat?.threadId ?? null;
  // The item the page was at, once its surface has been in front. Another
  // party bringing the other surface forward leaves it off screen, and the
  // address bar is to name what is on screen; until then the fragment is
  // still on its way and is kept.
  const reached = useRef<string | null>(null);
  useEffect(() => {
    if (!arrived || !params || bringing.current || !view) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const item = hash ? surfaceOf(hash) : null;
    if (item === view.mode) reached.current = hash;
    setQuery(
      { ...params, grid: grid === "today" ? null : grid, thread },
      false,
      !!item && item !== view.mode && reached.current === hash,
    );
    // `key` stands for `params`.
  }, [arrived, settled, key, grid, thread]);

  return arrived;
}

/**
 * Perform a gesture that is the person navigating — another surface, a
 * filter, a frame — as a new entry in the history first, so the back button
 * returns to where they were.
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

/** Copy the link to the view as it stands, every recorded part spelled out,
 * with the item the page is at. */
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

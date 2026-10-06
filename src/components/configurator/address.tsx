"use client";

/**
 * Addresses on the surfaces.
 *
 * Every item worth returning to has a fragment: a variable at
 * `#variable:<name>`, a clause at `#clause:<id>`, a source at
 * `#source:<kind>:<id>`, a section at `#<section>`. The fragment is the id of
 * the element that renders the item, wherever the current state puts it — the
 * same variable is a card under asserted today and a row under still open
 * after a withdrawal, and the address follows it. A link between two items is
 * a plain anchor to one of these, and so is a link from the chat.
 *
 * A quote's lines are items too: `#quote:<id>:variable:<name>` and
 * `#quote:<id>:clause:<id>`, the frozen value or clause as that offer holds
 * it, which the live address of the same variable does not reach; and
 * `#quote:<id>:event:<key>`, a milestone of its programme.
 *
 * Two offers compared are a place too: `#compare:<id>:<other>`, where the
 * other is a quote or `now`, the specification as it stands. A line of the
 * comparison is `#compare:<id>:<other>:variable:<name>` or
 * `…:clause:<id>`. The pair is named by the address and held nowhere else, so
 * a reply in the chat can put a comparison in front of the person without
 * anything being recorded.
 *
 * An item lives on one of `Moding`'s surfaces: a clause or a source on the
 * requirements, a variable, a question, a turn or a section of the
 * configuration on the canvas,
 * a quote's line on the quotes.
 * Following an address to the other surface performs `focus` on it — the one
 * thing here that is recorded, and it is what a link is for — and then
 * scrolls to the item once it has rendered. The address itself records
 * nothing: it names a place on a view, and the state the view shows is
 * reconstructed from the log on its own.
 */

import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";
import { useConfigurator, type Surface } from "./provider";

export const address = {
  variable: (name: string) => `variable:${name}`,
  clause: (id: string) => `clause:${id}`,
  source: (kind: string, id: string) => `source:${kind}:${id}`,
  item: (kind: string, id: string, item: string) => `source:${kind}:${id}:item:${item}`,
  question: (about: string) => `question:${about}`,
  turn: (flow: string) => `turn:${flow}`,
  said: (utterance: string) => `said:${utterance}`,
  quote: (quote: string, kind: "variable" | "clause" | "event", id: string) =>
    `quote:${quote}:${kind}:${id}`,
  compare: (quote: string, other: string, kind?: "variable" | "clause", id?: string) =>
    kind && id ? `compare:${quote}:${other}:${kind}:${id}` : `compare:${quote}:${other}`,
};

/** The pair a comparison's address names: a quote, and a quote or `now`. */
export const compareOf = (id: string): [string, string] | null => {
  if (!id.startsWith("compare:")) return null;
  const [, quote, other] = id.split(":");
  return quote && other ? [quote, other] : null;
};

/** The quote an address on the quote surface names, if it names one. */
export const quoteOf = (id: string): string | null =>
  id.startsWith("quote:") ? id.split(":")[1] ?? null : null;

/** The kind of a quote's line an address names: a value, a clause or a milestone. */
export const quoteKindOf = (id: string): string | null =>
  id.startsWith("quote:") ? id.split(":")[2] ?? null : null;

export const href = (id: string) => `#${id}`;

/** The fragment the page is at, kept current. */
export function useHash(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

/** Whether the page is at this item's address. */
export function useTargeted(id: string): boolean {
  return useHash() === id;
}

/** The surface an address is on; none for the chat, which is always there. */
export function surfaceOf(id: string): Surface | null {
  if (id.startsWith("said:")) return null;
  if (id.startsWith("clause:") || id.startsWith("source:")) return "requirements";
  if (id === "required" || id === "read-from") return "requirements";
  if (id.startsWith("quote:") || id.startsWith("compare:")) return "quote";
  return "canvas";
}

/**
 * Follow the page's fragment, once each time it changes: bring the surface it
 * is on forward, then scroll to the item once it has rendered. The view
 * arrives after the page does, so the browser's own scroll to the fragment
 * finds nothing; this repeats it when the surface has rendered. A fragment
 * already followed is left alone when the surface changes for another
 * reason — a rule bringing the configuration forward, the toggle — so the
 * address does not pull the person back.
 */
export function useFollowAddress() {
  const { view, gesture } = useConfigurator();
  const hash = useHash();
  const mode = view?.mode ?? null;
  const ready = view !== null;
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = hash || null;
  }, [hash]);
  useEffect(() => {
    const id = pending.current;
    if (!ready || !id || !mode) return;
    const surface = surfaceOf(id);
    if (surface && mode !== surface) {
      void gesture({ act: "focus", surface });
      return;
    }
    pending.current = null;
    let tries = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (el) arrive(el);
      else if (tries++ < 10) setTimeout(find, 50);
    };
    find();
  }, [ready, hash, mode, gesture]);
}

/** Bring an item into view and take focus to it, so the keyboard and a screen
 * reader arrive where the eye does rather than staying on the link. An item
 * that is not itself a control takes focus by script only (`tabIndex = -1`),
 * which adds no stop to the tab order. */
export function arrive(el: HTMLElement) {
  el.scrollIntoView({ block: "start" });
  if (!el.matches("a[href], button, input, select, textarea, [tabindex]"))
    el.tabIndex = -1;
  el.focus({ preventScroll: true });
}

/** Go to an address: set the fragment, or scroll again if it is already
 * set. An item at the address the page is already at may be on the other
 * surface — followed once, then the surfaces toggled — and setting the same
 * fragment again fires nothing, so the fragment is cleared first and the
 * change is followed as any other. */
export function goTo(id: string) {
  if (window.location.hash === `#${id}` || window.location.hash === `#${encodeURIComponent(id)}`) {
    const el = document.getElementById(id);
    if (el) {
      arrive(el);
      return;
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.location.hash = id;
}

/** The classes an addressable item carries: room under the sticky header. The
 * ring while it is the target comes from `useTargeted`, since `:target` is
 * not re-evaluated for an element mounted after the fragment was set — which
 * is what happens when a link changes surface. */
export const addressable = "scroll-mt-28";
export const targeted = "ring-1 ring-ring";

/** A link from one item on the canvas to another, by address. */
export function To({
  id,
  children,
  className,
  title,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <a
      href={href(id)}
      onClick={(event) => {
        event.preventDefault();
        goTo(id);
      }}
      title={title}
      className={
        "underline decoration-dotted underline-offset-2 hover:decoration-solid " +
        (className ?? "")
      }
    >
      {children}
    </a>
  );
}

/** The mark on an item the last turn moved, with who moved it. The square is
 * for the eye; the words are for everyone else. */
export function Moved({ by }: { by: string }) {
  return (
    <>
      <span
        aria-hidden
        title={`Moved by ${by} since you last acted`}
        className="mr-1.5 inline-block size-1.5 bg-primary align-middle"
      />
      <span className="sr-only">Moved by {by} since you last acted: </span>
    </>
  );
}

/** Words a person said, linked to where they are in the chat. Words said
 * in another conversation are reached by opening it first, which changes
 * only what the chat pane shows; the bubble goes to itself once it renders
 * (`chat/index.tsx`). Words recorded with no conversation stay plain. A
 * leaf of its own, because `useAgent` re-renders its caller on every
 * streamed token. */
export function Said({ utterance, text }: { utterance: string; text: string }) {
  const { view } = useConfigurator();
  const { agent } = useAgent();
  const chat = useCopilotChatConfiguration();
  const here = agent.messages.some((m) => view?.said[m.id] === utterance);
  const thread = view?.saidIn[utterance];
  const id = address.said(utterance);
  if (here)
    return (
      <To id={id} title="The words, in the chat">
        “{text}”
      </To>
    );
  if (!thread || !chat) return <>“{text}”</>;
  return (
    <a
      href={href(id)}
      title="The words, in the conversation they were said in"
      onClick={(event) => {
        event.preventDefault();
        chat.setActiveThreadId(thread, { explicit: true });
        goTo(id);
      }}
      className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
    >
      “{text}”
    </a>
  );
}

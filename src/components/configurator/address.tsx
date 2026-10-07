"use client";

/**
 * Addresses on the surfaces.
 *
 * An address is the id of the element that renders an item, so it names the
 * item rather than a place: the same variable is an answer on a requirement's
 * line today and an open row after a withdrawal, and the address follows it.
 * A quote's lines have addresses of their own, because the frozen value is
 * not the live one. A comparison is named by its address and held nowhere
 * else, so a reply in the chat can put one in front of the person without
 * anything being recorded.
 *
 * Following an address to the other surface performs `focus`, and following
 * one the frame leaves out performs `unframe`. Those two are recorded; the
 * address itself records nothing. The fragment is half of the URL, and the
 * query (`link.tsx`) is followed first. An address with nothing at it still
 * arrives, and the page says so, because a link given out goes on working
 * (`docs/ui.md`, "Links").
 */

import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConfigurator, type Surface } from "./provider";

export const address = {
  variable: (name: string) => `variable:${name}`,
  clause: (id: string) => `clause:${id}`,
  choice: (id: string) => `choice:${id}`,
  source: (kind: string, id: string) => `source:${kind}:${id}`,
  item: (kind: string, id: string, item: string) => `source:${kind}:${id}:item:${item}`,
  question: (about: string) => `question:${about}`,
  addressee: "addressee",
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

export const quoteOf = (id: string): string | null =>
  id.startsWith("quote:") ? id.split(":")[1] ?? null : null;

export const quoteKindOf = (id: string): string | null =>
  id.startsWith("quote:") ? id.split(":")[2] ?? null : null;

export const href = (id: string) => `#${id}`;

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

export function useTargeted(id: string): boolean {
  return useHash() === id;
}

/** The surface an address is on; none for the chat, which is always there. */
export function surfaceOf(id: string): Surface | null {
  if (id.startsWith("said:") || id.startsWith("turn:")) return null;
  if (id.startsWith("quote:") || id.startsWith("compare:") || id === address.addressee)
    return "quote";
  return "canvas";
}

/**
 * Follow the page's fragment, once each time it changes: bring the surface it
 * is on forward, then scroll to the item once it has rendered. The view
 * arrives after the page does, so the browser's own scroll to the fragment
 * finds nothing; this repeats it when the surface has rendered. A fragment
 * already followed is left alone when the surface changes for another
 * reason — a rule bringing the specification forward, the toggle — so the
 * address does not pull the person back.
 */
export function useFollowAddress(arrived: boolean): string | null {
  const { view, gesture } = useConfigurator();
  const hash = useHash();
  const mode = view?.mode ?? null;
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
    if (!ready || !id || !mode) return;
    const surface = surfaceOf(id);
    if (surface && mode !== surface) {
      void gesture({ act: "focus", surface });
      return;
    }
    pending.current = null;
    let tries = 0;
    let widened = false;
    const find = () => {
      const el = document.getElementById(id);
      if (el) arrive(el);
      else if (tries++ < 10) setTimeout(find, 50);
      else if (framed.current && !widened && surface === "canvas") {
        // Not drawn: the frame leaves it out. Show everything, and look again.
        widened = true;
        tries = 0;
        void gesture({ act: "unframe" }).then(() => setTimeout(find, 50));
      } else if (tries < 40) setTimeout(find, 50);
      // Words in the chat render once their conversation has loaded, and go
      // to themselves then (`chat/index.tsx`).
      else if (surface) setLost(id);
    };
    find();
  }, [ready, hash, mode, gesture]);
  return lost;
}

export function Lost({ id }: { id: string | null }) {
  return (
    <div role="status">
      {id ? (
        <Alert>
          <AlertDescription>
            Nothing is at <code>#{id}</code> now: it may have been struck,
            withdrawn or never issued.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
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
  // Arriving again at the item already targeted plays its flash again.
  for (const animation of el.getAnimations())
    if (animation instanceof CSSAnimation && animation.animationName === "arrive") {
      animation.cancel();
      animation.play();
    }
}

/** An item at the address the page is already at may be on the other
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
 * tint while it is the target, and the flash it arrives with, come from
 * `useTargeted`, since `:target` is not re-evaluated for an element mounted after the fragment was set — which
 * is what happens when a link changes surface. */
export const addressable = "scroll-mt-28";
export const targeted = "bg-muted/60 animate-arrive";

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

/** Words said in another conversation are reached by opening it first, which changes
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

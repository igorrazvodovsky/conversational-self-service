"use client";

/**
 * Addresses on the document.
 *
 * An address is the id of the element that renders an item, so it names the
 * item rather than a place: the same variable is an answer on a requirement's
 * line today and an open row after a withdrawal, and the address follows it.
 * A quote's lines have addresses of their own, because the frozen value is
 * not the live one. A comparison is named by its address and held nowhere
 * else, so a reply in the chat can put one in front of the person without
 * anything being recorded.
 *
 * Following an address opens the moment and the view that hold the item,
 * which are the viewer's and recorded nowhere (`link.tsx`), and following
 * one the frame leaves out performs `unframe`, which is recorded. The
 * fragment is half of the URL, and the query is followed first. An address
 * with nothing at it still arrives, and the page says so, because a link
 * given out goes on working (`docs/ui.md`, "Links").
 */

import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConfigurator } from "./provider";

/** The draft, as the other side of a comparison names it. */
export const NOW = "now";

export const address = {
  variable: (name: string) => `variable:${name}`,
  clause: (id: string) => `clause:${id}`,
  choice: (id: string) => `choice:${id}`,
  source: (kind: string, id: string) => `source:${kind}:${id}`,
  item: (kind: string, id: string, item: string) => `source:${kind}:${id}:item:${item}`,
  question: (about: string) => `question:${about}`,
  addressee: "addressee",
  handover: (id: string) => `handover:${id}`,
  step: (id: string) => `step:${id}`,
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

/** Where an item is: the moment and the view of the document that hold it.
 * `view` null leaves the view as it is, since the item is in every view; the
 * chat's items are in none, and give null. */
export interface Place {
  quote: string | null;
  view: "asked" | "proposal" | "timeline" | "drawing" | "compared" | null;
  against?: string;
}

export function placeOf(id: string): Place | null {
  if (id.startsWith("said:") || id.startsWith("turn:")) return null;
  const pair = compareOf(id);
  if (pair) return { quote: pair[0] === "draft" ? null : pair[0], against: pair[1], view: "compared" };
  const quote = quoteOf(id);
  if (quote) {
    const kind = quoteKindOf(id);
    return {
      quote: quote === "draft" ? null : quote,
      view: kind === "event" ? "timeline" : kind ? "asked" : null,
    };
  }
  if (id === address.addressee) return { quote: null, view: "proposal" };
  return { quote: null, view: "asked" };
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

/** An item at the address the page is already at may be in another view
 * or at another moment — followed once, then the view changed — and setting
 * the same fragment again fires nothing, so the fragment is cleared first
 * and the change is followed as any other. */
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
 * is what happens when a link changes the view. */
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

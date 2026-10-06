"use client";

/**
 * Addresses on the surfaces.
 *
 * Every item worth returning to has a fragment: a variable at
 * `#variable:<name>`, a clause at `#clause:<id>`, a choice — a value bound
 * to the clause it answers, on its ledger line — at `#choice:<id>`, a source at
 * `#source:<kind>:<id>`, the list at `#asserted`. The fragment is the id of
 * the element that renders the item, wherever the current state puts it — the
 * same variable is an answer on a requirement's line today and an open row at
 * the list's tail after a withdrawal, and the address follows it. An item the
 * frame leaves out is not drawn, so following its address, once it is not
 * found, takes the frame off and looks again. A link between two items is
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
 * An item lives on one of `Moding`'s two surfaces: a clause, a choice, a
 * source, a variable, a question or a section on the specification, a
 * quote's line on the quotes. A turn is in the log, which opens over
 * either, and the words said are in the chat.
 * Following an address to the other surface performs `focus` on it — what a
 * link is for — and then scrolls to the item once it has rendered; following
 * one the frame leaves out performs `unframe`. Those two are recorded. The address itself records
 * nothing: it names a place on a view, and the state the view shows is
 * reconstructed from the log on its own.
 *
 * The fragment is half of the page's URL; the query, which names the view
 * the item is shown in, is `link.tsx`'s, and a link's query is followed
 * before its fragment. An address with nothing at it — an item struck,
 * withdrawn, never issued — still arrives: the page says nothing is there
 * now, and stays where it landed. The addresses are kept, so a link given
 * out goes on working (`docs/ui.md`, "Links").
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
  if (id.startsWith("said:") || id.startsWith("turn:")) return null;
  if (id.startsWith("quote:") || id.startsWith("compare:")) return "quote";
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

/** What the page says when a link's item is not there now. */
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

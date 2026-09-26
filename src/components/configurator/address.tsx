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
 * An item lives on one of `Moding`'s surfaces: a clause or a source on the
 * requirements, a variable or a section of the configuration on the canvas.
 * Following an address to the other surface performs `focus` on it — the one
 * thing here that is recorded, and it is what a link is for — and then
 * scrolls to the item once it has rendered. The address itself records
 * nothing: it names a place on a view, and the state the view shows is
 * reconstructed from the log on its own.
 */

import { useEffect, useRef, useState } from "react";
import { useConfigurator, type Surface } from "./provider";

export const address = {
  variable: (name: string) => `variable:${name}`,
  clause: (id: string) => `clause:${id}`,
  source: (kind: string, id: string) => `source:${kind}:${id}`,
};

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

/** The surface an address is on. */
export function surfaceOf(id: string): Surface {
  if (id.startsWith("clause:") || id.startsWith("source:")) return "requirements";
  if (id === "required" || id === "read-from") return "requirements";
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
    if (mode !== surface) {
      void gesture({ act: "focus", surface });
      return;
    }
    pending.current = null;
    let tries = 0;
    const find = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: "start" });
      else if (tries++ < 10) setTimeout(find, 50);
    };
    find();
  }, [ready, hash, mode, gesture]);
}

/** Go to an address: set the fragment, or scroll again if it is already set. */
export function goTo(id: string) {
  if (window.location.hash === `#${id}`) {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
    return;
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

/** The mark on an item the last turn moved, with who moved it. */
export function Moved({ by }: { by: string }) {
  return (
    <span
      aria-label={`Moved by ${by} since you last acted`}
      title={`Moved by ${by} since you last acted`}
      className="mr-1.5 inline-block size-1.5 bg-primary align-middle"
    />
  );
}

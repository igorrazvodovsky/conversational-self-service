"use client";

/**
 * The split between the artifact panel and the chat, and the four geometries
 * the chat takes against it.
 *
 * The chat is mounted exactly once, in one place in the tree, in every mode.
 * Modes change `className` on its container and nothing else, because the
 * transcript's scroll offset is a property of a DOM node, and re-parenting
 * the node — a portal whose target changes, or rendering per mode — rebuilds
 * its layout box and sends the offset to zero.
 *
 * | mode       | chat panel                                   | handle | artifact panel |
 * |------------|----------------------------------------------|--------|----------------|
 * | sidebar    | in flow, sized by the group                  | shown  | the rest       |
 * | floating   | absolute, bottom-right, 400px, over the panel| hidden | fills the group|
 * | fullscreen | absolute inset-0, above the panel            | hidden | out of view    |
 * | hidden     | absolute inset-0, transparent, inert         | hidden | fills the group|
 */

import { useEffect, useState, type ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { recordsTheSplit, rememberCanvasPercent } from "@/lib/split-layout";
import { cn } from "@/lib/utils";
import type { ChatSurfaceMode } from "./chat-surface";

function useSplitOrientation(): "horizontal" | "vertical" {
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setStacked(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return stacked ? "vertical" : "horizontal";
}

/** `ResizablePanel` renders an outer box the group sizes and an inner one that
 * takes `className`, so these classes move the panel's *contents* and
 * `UNDOCKED` empties the box. Both halves are needed. */
const CHAT_GEOMETRY: Record<ChatSurfaceMode, string> = {
  sidebar: "",
  floating:
    "absolute end-4 bottom-4 z-30 h-[70%] w-[400px] border bg-background shadow-lg",
  fullscreen: "absolute inset-0 z-40 bg-background",
  // `inert`, not `display:none`: a node with no layout box has no scroll
  // offset to keep.
  hidden: "absolute inset-0 opacity-0 pointer-events-none",
};

/** Beats the inline `flex` the group writes, rather than going through its
 * layout API, which validates against `minSize`. Coupled to the panel's `id`. */
const UNDOCKED = "[&>#chat]:!flex-none";

export function Split({
  artifact,
  canvasPercent,
  chat,
  chatHeader,
  mode,
}: {
  artifact: ReactNode;
  canvasPercent: number;
  chat: ReactNode;
  chatHeader: ReactNode;
  mode: ChatSurfaceMode;
}) {
  const orientation = useSplitOrientation();
  const sideBySide = orientation === "horizontal";
  const docked = mode === "sidebar";

  // Every id here is explicit: `useId` diverges between the SSR pass and
  // hydration, which is why the size arrives as a prop the server can read too.
  return (
    <ResizablePanelGroup
      id="workspace-split"
      orientation={orientation}
      // The positioning context for the three modes that leave the flow.
      className={cn("relative", !docked && UNDOCKED)}
      onLayoutChanged={(layout, { isUserInteraction }) => {
        // Only a drag of this handle, in the geometry the stored split is
        // about, may write.
        if (!recordsTheSplit({ isUserInteraction, sideBySide, docked })) return;
        const { canvas: canvasGrow, chat: chatGrow } = layout;
        if (!canvasGrow || !chatGrow) return;
        rememberCanvasPercent((canvasGrow / (canvasGrow + chatGrow)) * 100);
      }}
    >
      <ResizablePanel
        id="canvas"
        defaultSize={`${canvasPercent}%`}
        // Pixel floors, side by side only: stacked, they would apply to the
        // cross axis, where a short viewport could not satisfy both.
        minSize={sideBySide ? "360px" : undefined}
        // min-h-0/min-w-0 so the artifact scrolls inside the panel rather
        // than growing it.
        className="relative flex min-h-0 min-w-0 flex-col bg-ground"
      >
        {artifact}
      </ResizablePanel>

      <ResizableHandle
        id="workspace-split-handle"
        aria-label="Resize the chat"
        withHandle
        className={cn(!docked && "hidden")}
      />

      <ResizablePanel
        id="chat"
        defaultSize={`${100 - canvasPercent}%`}
        minSize={sideBySide ? "360px" : undefined}
        className={cn("flex min-h-0 min-w-0 flex-col", CHAT_GEOMETRY[mode])}
        // A hidden pane is still laid out, so it leaves the tab order and the
        // accessibility tree by hand.
        inert={mode === "hidden"}
      >
        {/* A named region, so the chat is a landmark beside the panel's
            `main` and a screen reader can jump between the two. */}
        <section aria-label="Chat" className="flex min-h-0 flex-1 flex-col">
          {chatHeader}
          <div
            className={cn(
              "min-h-0 w-full flex-1 overflow-y-auto",
              // Full width is unreadable for a transcript at desktop sizes.
              mode === "fullscreen" && "mx-auto max-w-3xl",
            )}
          >
            {chat}
          </div>
        </section>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

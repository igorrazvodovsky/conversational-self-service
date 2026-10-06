"use client";

/**
 * The ledger, edited as a document: the canvas's *asked for* section.
 *
 * A Tiptap editor whose schema is a sequence of clause nodes and nothing
 * else. Each node carries the clause's identity from `Specifying` as an
 * attribute and is one line of the requirement ledger: the text is editable
 * in place on the left, and everything else about the clause — its
 * negotiability, its source, and on the right the values answering it with
 * what each forced (`ledger.tsx`) — is rendered by the node view and is not
 * text. The requirement and its answer are one line, on one surface. Nothing is asked of a line as it is
 * typed: it is a clause the moment it has words. The words may name the
 * catalogue — `@` offers it — and a reference so placed is part of the text,
 * written as a token (`references.tsx`).
 *
 * The document is never the state. A transaction here is a stimulus: a node
 * that appears is `require`, one that vanishes is `strike`, changed text is
 * `reword`, a changed order is `move`, and the node view's controls are
 * `settle` and `relax`. A clause is dragged by the grip that appears beside
 * it on hover. The mapping lives in `flush` below and holds nothing across
 * renders except what has not yet been sent. See
 * docs/concepts/specifying.md, "The specification is edited as a document".
 *
 * While the person is typing it owns the text; the view from the server is
 * written back into it only when they are not, so that a refresh while the
 * model is working cannot overwrite what a person is in the middle of typing.
 * Focus on a control inside a line — a card's *Change*, *Take back* — is not
 * typing. While a frame is on the document is read, not written: only the
 * lines in the frame are shown, and nothing can be typed into lines that are
 * not.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { Placeholder } from "@tiptap/extensions";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import { ArrowDownIcon, ArrowUpIcon, EllipsisIcon, GripVerticalIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { address, addressable, Moved, To, useTargeted } from "./address";
import {
  NEGOTIABILITY,
  plain,
  segments,
  token,
  useAnswering,
  type Reference,
} from "./clauses";
import { referencing } from "./references";
import {
  useConfigurator,
  type Clause,
  type Negotiability,
  type View,
} from "./provider";
import { Answers, framedAsserted, ledger, Unbound } from "./ledger";
import { Sources } from "./sources";

// -- the schema ---------------------------------------------------------------

/** Whether the selection reaches beyond one clause — a document-level selection counts. */
function spansClauses(editor: Editor): boolean {
  const { $from, $to } = editor.state.selection;
  if ($from.depth < 1 || $to.depth < 1) return true;
  return $from.before(1) !== $to.before(1);
}

/** One clause. `clause` is the identity in `Specifying`; null until required. */
const ClauseNode = Node.create({
  name: "clause",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      clause: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-clause]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-clause": "" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ClauseView);
  },
  addKeyboardShortcuts() {
    return {
      // A new clause after this one. Not `splitBlock`, which would carry
      // half the text into a new clause and reword this one.
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        const node = $from.parent;
        if (node.type.name !== "clause") return false;
        const after = $from.after();
        return editor
          .chain()
          .insertContentAt(after, {
            type: "clause",
            attrs: { clause: null },
          })
          .setTextSelection(after + 1)
          .run();
      },
      // Backspace at the start of a clause with words in it does nothing:
      // joining it into the clause above would strike one and reword the
      // other. An empty clause is deleted, which is a strike if it had an
      // identity and nothing at all if it did not. A selection that spans
      // clauses is never deleted from the keyboard — select-all and Backspace
      // would strike every clause in one keystroke, and striking is a thing
      // done one clause at a time, on purpose.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return spansClauses(editor);
        if ($from.parentOffset !== 0) return false;
        if ($from.parent.content.size > 0) return true;
        if (editor.state.doc.childCount === 1) return true;
        return editor.commands.deleteNode("clause");
      },
      Delete: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty) return spansClauses(editor);
        return $from.parentOffset === $from.parent.content.size;
      },
      // Select-all selects the clause the cursor is in, not the document:
      // the document is not a thing a person edits as one.
      "Mod-a": ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.depth < 1) return false;
        return editor.commands.setTextSelection({ from: $from.start(1), to: $from.end(1) });
      },
    };
  },
});

const ClauseDocument = Document.extend({ content: "clause+" });

/**
 * The hint on an empty clause. The extension decides which empty clauses
 * carry one and what it says; it lands as a decoration on the clause node,
 * and the node view reads it there and puts it where the words go, since the
 * extension's own `::before` would sit on the wrapper and not on the line.
 */
const ClausePlaceholder = Placeholder.configure({
  showOnlyCurrent: false,
  placeholder: ({ editor, pos }) =>
    pos === 0 && editor.state.doc.childCount === 1
      ? "What the lift must do, in your words"
      : "Another requirement, in your words",
});

/** The placeholder's hint on this node, if the extension put one there. */
function hintOf(decorations: NodeViewProps["decorations"]): string | null {
  for (const decoration of decorations) {
    const hint = decoration.type.attrs?.["data-placeholder"];
    if (typeof hint === "string") return hint;
  }
  return null;
}

/** A clause's text as inline content: words, and a reference node per token. */
function inlineOf(text: string) {
  return segments(text).map((segment) =>
    "text" in segment
      ? { type: "text", text: segment.text }
      : { type: "reference", attrs: segment.reference },
  );
}

/** The document a view describes, for writing into the editor. */
function documentOf(view: View | null) {
  const clauses = view?.clauses ?? [];
  return {
    type: "doc",
    content: clauses.length
      ? clauses.map((c) => ({
          type: "clause",
          attrs: { clause: c.clause },
          content: inlineOf(c.text),
        }))
      : [{ type: "clause", attrs: { clause: null } }],
  };
}

/** A clause node's text as `Specifying` holds it: words, with each reference as its token. */
function textOf(node: ProseMirrorNode): string {
  let out = "";
  node.forEach((child) => {
    out += child.type.name === "reference" ? token(child.attrs as Reference) : (child.text ?? "");
  });
  return out.trim();
}

/**
 * The clauses of `placed` that can stay where the state has them: the
 * longest run that is in the same relative order in both. Every other one
 * was moved.
 */
function keeping(placed: string[], order: string[]): Set<string> {
  const rank = placed.map((c) => order.indexOf(c));
  // Patience sorting: `ends[k]` is the index in `placed` ending the best run
  // of length k + 1 found so far, and `back` links each index to the one
  // before it in its run.
  const ends: number[] = [];
  const back: number[] = [];
  rank.forEach((r, i) => {
    let lo = 0;
    let hi = ends.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rank[ends[mid]] < r) lo = mid + 1;
      else hi = mid;
    }
    back[i] = lo > 0 ? ends[lo - 1] : -1;
    ends[lo] = i;
  });
  const out = new Set<string>();
  for (let i = ends.length ? ends[ends.length - 1] : -1; i >= 0; i = back[i])
    out.add(placed[i]);
  return out;
}

/** The clauses a document holds, in order, for diffing against the view. */
function clausesOf(editor: Editor) {
  const out: { pos: number; clause: string | null; text: string }[] = [];
  editor.state.doc.forEach((node, offset) => {
    out.push({
      pos: offset,
      clause: node.attrs.clause ?? null,
      text: textOf(node),
    });
  });
  return out;
}

// -- one clause, rendered -----------------------------------------------------

function Relax({ clause, onDone }: { clause: Clause; onDone: () => void }) {
  const { gesture, busy } = useConfigurator();
  const [wording, setWording] = useState(clause.text);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = wording.trim();
    if (text && text !== clause.text)
      void gesture({ act: "relax", clause: clause.clause, text });
    onDone();
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        autoFocus
        value={wording}
        onChange={(event) => setWording(event.target.value)}
        aria-label="Relaxed wording"
      />
      <Button type="submit" size="sm" disabled={busy}>
        Relax
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

/**
 * The node view. The text is `NodeViewContent`, editable; the rest is read
 * from the view by the clause's identity and is not part of the document.
 */
/**
 * Take focus to a control in a clause once the clause has rendered again.
 * A gesture on a clause comes back as a new document, and the node views are
 * made afresh, so the control the person pressed is gone; this finds its
 * successor, or the clause itself, so the keyboard keeps its place.
 */
function refocus(clause: string, control?: string, tries = 0) {
  const again = () => setTimeout(() => refocus(clause, control, tries + 1), 50);
  const at = document.getElementById(address.clause(clause));
  // While the gesture settles, every control is disabled and the node views
  // are about to be replaced; wait for live, enabled ones.
  const wanted =
    control &&
    (at?.querySelector<HTMLElement>(`[data-control="${control}"]:not(:disabled)`) ??
      // A clause moved to an end has that end's button disabled for good;
      // the other one is the nearest control.
      at?.querySelector<HTMLElement>(`[data-control^="move-"]:not(:disabled)`));
  const last = tries >= 40;
  const target = wanted || (last || !control ? at : null);
  if (!target) {
    if (!last) again();
    return;
  }
  if (target === at) at.tabIndex = -1;
  target.focus();
  // Focused, it may still be replaced by a write-back a moment later.
  if (!last) setTimeout(() => {
    if (!target.isConnected) refocus(clause, control, tries + 1);
  }, 100);
}

function ClauseView({ node, decorations }: NodeViewProps) {
  const { view, gesture, busy } = useConfigurator();
  const { answering, setAnswering } = useAnswering();
  const [relaxing, setRelaxing] = useState(false);
  // Back to the Relax button when the form it opened closes.
  const relaxButton = useRef<HTMLButtonElement>(null);
  const wasRelaxing = useRef(false);
  useEffect(() => {
    if (wasRelaxing.current && !relaxing) relaxButton.current?.focus();
    wasRelaxing.current = relaxing;
  }, [relaxing]);
  const id: string | null = node.attrs.clause;
  const clause = id ? (view?.clauses.find((c) => c.clause === id) ?? null) : null;
  const active = !!clause && answering?.clause === clause.clause;
  const hint = hintOf(decorations);
  const open = clause?.negotiability === "open";
  const moved = clause && view?.touched?.clauses.includes(clause.clause) ? view.touched.by : null;
  const isTarget = useTargeted(clause ? address.clause(clause.clause) : "");
  // This line's place in the ledger: whether the frame leaves it, and what
  // answers it.
  const lines = view ? ledger(view, framedAsserted(view)) : null;
  const outside = !!view?.frame && (!clause || !lines?.shown.has(clause.clause));
  // Moving by button is the same `move` gesture a drag ends in, for the
  // keyboard and for anyone who cannot drag.
  const order = view?.clauses.map((c) => c.clause) ?? [];
  const at = clause ? order.indexOf(clause.clause) : -1;
  const move = (direction: "up" | "down") => {
    if (!clause) return;
    const before = direction === "up" ? order[at - 1] : (order[at + 2] ?? null);
    void gesture({ act: "move", clause: clause.clause, before }).then(() =>
      refocus(clause.clause, `move-${direction}`),
    );
  };

  return (
    <NodeViewWrapper
      id={clause ? address.clause(clause.clause) : undefined}
      className={cn(
        "group/clause relative border-b py-3 last:border-b-0",
        clause && addressable,
        "scroll-mt-28",
        (active || isTarget) && "ring-1 ring-ring",
        outside && "hidden",
      )}
    >
      {/* One line of the ledger: the requirement on the left, in the
          person's words; what answers it on the right. */}
      <div className="grid gap-3 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {moved ? (
            <div contentEditable={false} className="pt-1.5 select-none">
              <Moved by={moved} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            {relaxing && clause ? (
              <div contentEditable={false}>
                <Relax clause={clause} onDone={() => setRelaxing(false)} />
              </div>
            ) : (
              <div className="relative">
                {hint ? (
                  <span
                    contentEditable={false}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 text-sm text-muted-foreground"
                  >
                    {hint}
                  </span>
                ) : null}
                <NodeViewContent className="text-sm outline-none" />
              </div>
            )}
            {clause?.formerly.length ? (
              <p
                contentEditable={false}
                className="text-xs text-muted-foreground select-none"
                title={clause.formerly.join(" → ")}
              >
                relaxed from <s>{clause.formerly[clause.formerly.length - 1]}</s>
                {clause.formerly.length > 1 ? (
                  <span className="sr-only">
                    ; in full, {clause.formerly.join(", then ")}
                  </span>
                ) : null}
              </p>
            ) : null}
            {/* Where the clause came from, when the model read it: the source
                beside the words, so the reading is checked where it stands.
                A clause the person typed says nothing here. */}
            {clause?.source ? (
              <p
                contentEditable={false}
                className="text-xs text-muted-foreground select-none"
                title={clause.source.words}
              >
                {/* The assistant's reading until the person keeps or rewords
                    it; keeping makes them the party who stated it. */}
                {clause.statedBy === "model" ? "the assistant's reading of " : "read from "}
                <To
                  id={address.source(clause.source.kind, clause.source.id)}
                  title="The source, with everything read from it"
                  className={clause.source.kind === "file" ? "text-foreground" : undefined}
                >
                  {clause.source.kind === "file"
                    ? clause.source.name
                    : clause.source.broughtBy === "browser"
                      ? "what your agent said"
                      : "what you said"}
                </To>
                {clause.statedBy === "model" ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={busy}
                    className="ml-1 h-5"
                    title="Make this requirement yours, as the assistant read it"
                    onClick={() => void gesture({ act: "keep", clause: clause.clause })}
                  >
                    Keep
                  </Button>
                ) : null}
              </p>
            ) : null}
            {clause ? (
              <div
                contentEditable={false}
                className="flex flex-wrap items-center gap-1 select-none"
              >
                {/* Frame the canvas on this clause: its answers, what they
                    forced, what could still answer it — and while it is
                    framed, a pick answers it. Pressed again, the frame comes
                    off. The line's one way to answer it. */}
                <Button
                  size="xs"
                  variant={active ? "default" : "outline"}
                  disabled={busy}
                  title={
                    active
                      ? "Show everything again"
                      : "Narrow the canvas to this requirement; a value picked while it is narrowed answers it"
                  }
                  onClick={() => setAnswering(active ? null : clause)}
                >
                  {active ? "Answering…" : open ? "Look" : clause.answers.length ? "Change answer" : "Answer"}
                  <span className="sr-only"> “{plain(clause.text)}”</span>
                </Button>
                {clause.negotiability === "negotiable" && !relaxing ? (
                  <Button
                    ref={relaxButton}
                    size="xs"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setRelaxing(true)}
                  >
                    Relax
                  </Button>
                ) : null}
                <div className="ml-auto flex gap-0.5">
                  {/* How firmly the clause is meant: fixed until settled
                      otherwise. Out of the way, since it is asked only when
                      it matters. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={busy}
                        title={`${NEGOTIABILITY[clause.negotiability]} — how firmly this is meant`}
                        aria-label={`How firmly this is meant: ${NEGOTIABILITY[clause.negotiability]}`}
                      >
                        <EllipsisIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>How firmly this is meant</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={clause.negotiability}
                        onValueChange={(negotiability) => {
                          if (negotiability !== clause.negotiability)
                            void gesture({ act: "settle", clause: clause.clause, negotiability });
                        }}
                      >
                        {(Object.keys(NEGOTIABILITY) as Negotiability[]).map((key) => (
                          <DropdownMenuRadioItem key={key} value={key}>
                            {NEGOTIABILITY[key]}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={busy || at <= 0}
                    data-control="move-up"
                    title="Move up"
                    aria-label={`Move up: ${plain(clause.text)}`}
                    onClick={() => move("up")}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={busy || at < 0 || at >= order.length - 1}
                    data-control="move-down"
                    title="Move down"
                    aria-label={`Move down: ${plain(clause.text)}`}
                    onClick={() => move("down")}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={busy}
                    title="Strike this clause"
                    aria-label={`Strike: ${plain(clause.text)}`}
                    onClick={() => {
                      // The clause goes, and the keyboard goes on to the next.
                      const next = order[at + 1] ?? order[at - 1];
                      void gesture({ act: "strike", clause: clause.clause }).then(() => {
                        if (next) refocus(next);
                      });
                    }}
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {clause && lines ? (
          <div contentEditable={false} className="min-w-0">
            <Answers clause={clause} drawn={lines.lines.get(clause.clause) ?? []} />
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

// -- the editor, and the mapping from transactions to gestures ---------------

/**
 * Whether the person is typing: the editor has focus, and it is in the words
 * rather than on a control set into a line, which is not text.
 */
function typing(editor: Editor): boolean {
  if (!editor.isFocused || !editor.isEditable) return false;
  const active = document.activeElement;
  return !(active instanceof HTMLElement && active.closest('[contenteditable="false"]'));
}

const SETTLE_AFTER = 700;

export function Specification() {
  const { view, gesture } = useConfigurator();
  const viewRef = useRef(view);
  viewRef.current = view;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);
  // The clauses the document was last given. A clause the state holds and
  // the document does not is struck only if the document once had it: one
  // the assistant stated while the person was typing never reached the
  // document, and its absence is not an edit.
  const given = useRef(new Set((view?.clauses ?? []).map((c) => c.clause)));
  // Made once: it reads the view through the ref when the popup opens.
  const [Referencing] = useState(() => referencing(viewRef));

  const editor = useEditor({
    extensions: [ClauseDocument, Text, ClauseNode, ClausePlaceholder, Referencing],
    content: documentOf(view),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Your requirements",
        "aria-describedby": "required-keys",
      },
    },
    onUpdate: () => schedule(),
    onBlur: () => void flush(),
  });

  const writeBack = useCallback(
    (next: View | null) => {
      if (!editor || typing(editor)) return;
      const wanted = documentOf(next);
      given.current = new Set((next?.clauses ?? []).map((c) => c.clause));
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(wanted))
        editor.commands.setContent(wanted, { emitUpdate: false });
    },
    [editor],
  );

  /**
   * Send what the document says that the state does not: a strike for every
   * identity that has gone, a reword for every changed text, a require for
   * every node with words and no identity — in document order — and then a
   * move for every clause the document holds somewhere else, one gesture
   * each, awaited, so the log reads as the person's edits did.
   */
  const flush = useCallback(async () => {
    if (!editor || flushing.current) return;
    flushing.current = true;
    try {
      const current = viewRef.current;
      if (!current) return;
      let latest = current;
      const held = new Map(current.clauses.map((c) => [c.clause, c]));
      const inDoc = clausesOf(editor);
      const present = new Set(inDoc.map((n) => n.clause).filter(Boolean));
      for (const c of current.clauses) {
        if (present.has(c.clause) || !given.current.has(c.clause)) continue;
        given.current.delete(c.clause);
        await gesture({ act: "strike", clause: c.clause });
      }
      for (const n of inDoc) {
        if (n.clause) {
          const was = held.get(n.clause);
          if (was && n.text && n.text !== was.text)
            await gesture({ act: "reword", clause: n.clause, text: n.text });
          continue;
        }
        if (!n.text) continue;
        const before = new Set((viewRef.current?.clauses ?? []).map((c) => c.clause));
        const next = await gesture({ act: "require", text: n.text });
        if (next) latest = next;
        const added = next?.clauses.find((c) => !before.has(c.clause));
        if (!added) continue;
        given.current.add(added.clause);
        // The node is now that clause. Found again by position, since the
        // document may have moved under us while the gesture was in flight.
        const node = editor.state.doc.nodeAt(n.pos);
        if (node?.type.name === "clause" && !node.attrs.clause)
          editor.view.dispatch(
            editor.state.tr
              .setNodeMarkup(n.pos, undefined, { ...node.attrs, clause: added.clause })
              .setMeta("addToHistory", false),
          );
      }
      // The order last. A clause just required was appended, so one typed
      // between two others is moved too. Taken from the right, each moved
      // clause goes before the one that follows it in the document, which
      // is by then where the document has it.
      const order = latest.clauses.map((c) => c.clause);
      const placed = clausesOf(editor)
        .map((n) => n.clause)
        .filter((c): c is string => !!c && order.includes(c));
      const stay = keeping(placed, order);
      for (let i = placed.length - 1; i >= 0; i--) {
        if (stay.has(placed[i])) continue;
        await gesture({ act: "move", clause: placed[i], before: placed[i + 1] ?? null });
      }
    } finally {
      flushing.current = false;
      // The views that arrived while the gestures were in flight were not
      // written back; the one standing now is.
      writeBack(viewRef.current);
    }
  }, [editor, gesture, writeBack]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SETTLE_AFTER);
  }, [flush]);

  // The view writes back into the document only while nobody is typing in it.
  useEffect(() => {
    if (flushing.current) return;
    writeBack(view);
  }, [writeBack, view]);

  // A frame is a way of reading the ledger, and answering from it: the lines
  // outside it are hidden, so nothing is typed while one is on.
  const framed = !!view?.frame;
  useEffect(() => {
    if (!editor) return;
    if (framed && editor.isEditable) void flush().then(() => editor.setEditable(false, false));
    else if (!framed && !editor.isEditable) editor.setEditable(true, false);
  }, [editor, framed, flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <>
      {editor ? (
        // Placed against the clause's left edge; the padding takes it out
        // of the card and level with the first line of words.
        <DragHandle editor={editor}>
          {/* For the pointer; the keyboard has each clause's Move buttons. */}
          <span
            aria-hidden
            className="flex cursor-grab pt-3 pr-4 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVerticalIcon className="size-4" />
          </span>
        </DragHandle>
      ) : null}
      <EditorContent editor={editor} />
    </>
  );
}

/**
 * The section: what is asked for — the ledger as a document, a requirement
 * and what answers it on each line, then the values answering none, then the
 * sources the assistant read requirements from. Its id is `asserted`, and
 * the document's is `required`, the two places the chat links to.
 */
export function AskedFor() {
  const { view } = useConfigurator();
  if (!view) return null;
  const asserted = framedAsserted(view);
  const { unbound, unanswered, shown } = ledger(view, asserted);
  const read = view.counts.read;
  return (
    <section id="asserted" className="mt-6 scroll-mt-28">
      <header className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-sm font-semibold">Asked for</h2>
        <span className="text-xs text-muted-foreground">
          {[
            `${shown.size} required, in your words`,
            `${asserted.length} asserted`,
            read ? `${read} read by the assistant` : "",
            unanswered ? `${unanswered} not yet answered` : "",
            unbound.length ? `${unbound.length} answering nothing` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {/* What the keys do, which the editor points at: while a frame is
            on, that nothing can be typed. */}
        <span id="required-keys" className="basis-full text-xs text-muted-foreground">
          {view.frame
            ? "Narrowed: show everything to write or reword a requirement"
            : "Enter for another, Backspace on an empty line to strike, @ to name the catalogue"}
        </span>
      </header>
      {/* The ledger is a text field, so its edge is a field's: 3:1. Framed,
          it is read, and a frame that leaves no line says so. */}
      <Card id="required" className="scroll-mt-28 gap-0 py-0 ring-(--field)">
        <CardContent className="px-3 py-1">
          <Specification />
          {view.frame && !shown.size ? (
            <p className="py-3 text-xs text-muted-foreground">
              No requirement bears on this.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Unbound unbound={unbound} />
      <Sources />
    </section>
  );
}

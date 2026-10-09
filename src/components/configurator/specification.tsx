"use client";

/**
 * The ledger, edited as a document: the requirements of the specification's
 * one list.
 *
 * A Tiptap editor whose schema is a sequence of clause nodes and nothing
 * else. Each node carries the clause's identity from `Specifying` as an
 * attribute and is one line of the requirement ledger, read as a question
 * and its answer: the text is editable in place, and beneath it the values
 * answering it with what each forced (`ledger.tsx`). Everything else about
 * the clause — its source, its negotiability, how each answer came to be —
 * is drawn while the line is open, which it is while the caret is in it.
 * None of it is text. Nothing is asked of a line as it is typed: it is a clause the moment it has words. The words may name the
 * catalogue — `@` offers it — and a reference so placed is part of the text,
 * written as a token (`references.tsx`).
 *
 * The document is never the state. A transaction here is a stimulus: a node
 * that appears is `require`, one that vanishes is `strike`, changed text is
 * `reword`, a changed order is `move`, and the node view's controls are
 * `settle`, `relax`, `strike` and, on a reading still the assistant's,
 * `keep`. A clause is dragged by the grip that appears beside it on hover.
 * The mapping lives in `flush` below. Across renders it holds only what has
 * not yet been sent and which clauses the document was last given. See
 * docs/syncs/gestures.md, "A clause is stated in the person's words".
 *
 * While the person is typing it owns the text; the view from the server is
 * written back into it only when they are not, so that a refresh while the
 * model is working cannot overwrite what a person is in the middle of typing.
 * Focus on a control inside a line — an answer's value, *Take back* — is not
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
import { CheckIcon, EllipsisIcon, Maximize2Icon, Minimize2Icon, GripVerticalIcon, Trash2Icon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { address, addressable, targeted, To, useTargeted } from "./address";
import {
  ClauseText,
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
  type Gap,
  type Negotiability,
  type Quantity,
  type Stimulus,
  type View,
} from "./provider";
import { useNavigate } from "./link";
import { StepTabs } from "./steps";
import { TONE } from "./tone";
import { ShowingMenu } from "./showing";
import {
  Answers,
  AnswersDetails,
  Details,
  framedAsserted,
  ledger,
  lineAddresses,
  Loose,
  Open,
  Unbound,
  useOpened,
} from "./ledger";
import { Sources } from "./sources";

// -- the schema ---------------------------------------------------------------

/** A document-level selection counts as reaching beyond one clause. */
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
 * The extension decides which empty clauses carry a hint and what it says;
 * it lands as a decoration on the clause node,
 * and the node view reads it there and puts it where the words go, since the
 * extension's own `::before` would sit on the wrapper and not on the line.
 */
const ClausePlaceholder = Placeholder.configure({
  showOnlyCurrent: false,
  placeholder: "Requirement"
});

function hintOf(decorations: NodeViewProps["decorations"]): string | null {
  for (const decoration of decorations) {
    const hint = decoration.type.attrs?.["data-placeholder"];
    if (typeof hint === "string") return hint;
  }
  return null;
}

function inlineOf(text: string) {
  return segments(text).map((segment) =>
    "text" in segment
      ? { type: "text", text: segment.text }
      : { type: "reference", attrs: segment.reference },
  );
}

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
  const { gesture } = useConfigurator();
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
      <Button type="submit" size="sm">
        Relax
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

/**
 * A gesture on a clause comes back as a new document, and the node views are
 * made afresh, so the control the person pressed is gone; this finds its
 * successor, or the clause itself, so the keyboard keeps its place.
 */
function refocus(clause: string, control?: string, tries = 0) {
  const again = () => setTimeout(() => refocus(clause, control, tries + 1), 50);
  const at = document.getElementById(address.clause(clause));
  // Called once the gesture has settled; the node views may still be
  // replaced by the write-back, which the check below catches.
  const wanted = control && at?.querySelector<HTMLElement>(`[data-control="${control}"]`);
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

/**
 * The line the caret is in, which is the line being read: it opens, so
 * walking the document with the caret reviews it a line at a time. Set from
 * the editor's selection while the editor has focus, and kept when focus
 * moves to a control set into that line.
 */
const Current = createContext<{
  current: string | null;
  setCurrent: (c: string | null) => void;
  /** The lines opened from their value or an address. Held here rather than
   * in the node view, which a write-back makes afresh. */
  opened: Set<string>;
  setOpened: (clause: string, open: boolean) => void;
}>({
  current: null,
  setCurrent: () => {},
  opened: new Set(),
  setOpened: () => {},
});

function clauseAt(editor: Editor): string | null {
  const { $from } = editor.state.selection;
  return $from.depth >= 1 ? ($from.node(1).attrs.clause ?? null) : null;
}

/**
 * The text is `NodeViewContent`, editable; the rest is read from the view by
 * the clause's identity and is not part of the document.
 */
function ClauseView({ node, decorations }: NodeViewProps) {
  const { view, gesture } = useConfigurator();
  const { answering, setAnswering } = useAnswering();
  const { current, setCurrent, opened, setOpened } = useContext(Current);
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
  const isTarget = useTargeted(clause ? address.clause(clause.clause) : "");
  const lines = view ? ledger(view, framedAsserted(view)) : null;
  const outside = !!view?.frame && (!clause || !lines?.shown.has(clause.clause));
  const order = view?.clauses.map((c) => c.clause) ?? [];
  const at = clause ? order.indexOf(clause.clause) : -1;
  const drawn = (clause && lines?.lines.get(clause.clause)) || [];
  // Open while the caret is in it, or once opened from its value or an
  // address, until closed.
  const [pinned, setPinned] = useOpened(
    clause ? [address.clause(clause.clause), ...lineAddresses(drawn)] : [],
    [!!id && opened.has(id), (open) => id && setOpened(id, open)],
  );
  const reading = !!clause && current === clause.clause;
  const expanded = !!clause && (pinned || reading || relaxing);
  const toggle = () => {
    if (expanded) {
      setPinned(false);
      if (reading) setCurrent(null);
    } else setPinned(true);
  };

  return (
    <NodeViewWrapper
      id={clause ? address.clause(clause.clause) : undefined}
      className={cn(
        "group/clause relative border-b py-3 last:border-b-0",
        clause && addressable,
        "scroll-mt-28",
        (active || isTarget) && targeted,
        outside && "hidden",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
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
        </div>
        {clause ? (
          <div contentEditable={false} className="flex shrink-0 items-center gap-0.5 select-none">
            {/* The line's controls show on hover, on focus and while the
                line is open; they stay in the tab order throughout. */}
            <div
              className={cn(
                "flex gap-0.5 opacity-0 transition-opacity group-hover/clause:opacity-100 focus-within:opacity-100",
                (expanded || active) && "opacity-100",
              )}
            >
              {/* Frame the canvas on this clause: its answers, what they
                  forced, what could still answer it — and while it is
                  framed, a pick answers it. The line's one way to answer
                  it. */}
              <Button
                variant={active ? "default" : "ghost"}
                size="icon-xs"
                aria-pressed={active}
                title={
                  active
                    ? "Show everything again"
                    : "Narrow the canvas to this requirement; a value picked while it is narrowed answers it"
                }
                aria-label={`${active ? "Show everything again" : open ? "Look" : clause.answers.length ? "Change answer" : "Answer"}: ${plain(clause.text)}`}
                onClick={() => setAnswering(active ? null : clause)}
              >
                {active ? <Minimize2Icon /> : <Maximize2Icon />}
              </Button>
              {/* How firmly the clause is meant: fixed until settled
                  otherwise. Out of the way, since it is asked only when it
                  matters. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
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
                <Trash2Icon />
              </Button>
            </div>
            {/* A reading still the assistant's is a decision waiting on the
                person, so its keep button is always there. */}
            {clause.statedBy === "model" ? (
              <Button
                size="icon-xs"
                variant="ghost"
                title="The assistant read this; make it your requirement as it stands"
                aria-label={`Keep: ${plain(clause.text)}`}
                onClick={() => void gesture({ act: "keep", clause: clause.clause })}
              >
                <CheckIcon />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {clause && lines ? (
        <div contentEditable={false} className="mt-1 min-w-0 pl-4">
          <Answers clause={clause} drawn={drawn} open={expanded} onToggle={toggle} />
          {expanded ? (
            <Details>
              <div className="space-y-1 text-xs text-muted-foreground">
                {/* Where the words came from, when the model read them. */}
                {clause.source ? (
                  <p title={clause.source.words}>
                    {clause.statedBy === "model" ? "The assistant's reading of " : "Read from "}
                    <To
                      id={address.source(clause.source.kind, clause.source.id)}
                      title="The source, with everything read from it"
                    >
                      {clause.source.kind === "file"
                        ? clause.source.name
                        : clause.source.broughtBy === "browser"
                          ? "what your agent said"
                          : "what you said"}
                    </To>
                  </p>
                ) : null}
                {/* A count or a measure in the words was not answered by
                    the assistant but worked out by the catalogue's method,
                    so what it rests on, and what it assumed, is said here. */}
                {clause.source?.workedOut.map((w) => (
                  <p key={w.derivation} title={`${w.method}: ${w.formula}`}>
                    {sentence(w.meaning)} {amount(w)}, from{" "}
                    {w.stated.map((q, i) => (
                      <span key={q.quantity}>
                        {i ? ", " : null}
                        {given(q)}
                        <Measured quantity={q} />
                      </span>
                    ))}
                    {w.assumed.length ? (
                      <>
                        ; assumed{" "}
                        {w.assumed.map((q, i) => (
                          <span key={q.quantity}>
                            {i ? ", " : null}
                            {given(q)}
                            <Measured quantity={q} />
                          </span>
                        ))}
                      </>
                    ) : null}
                    {w.label ? null : "; no option is offered for that"}
                  </p>
                ))}
                {clause.formerly.length ? (
                  <p title={clause.formerly.join(" → ")}>
                    Relaxed from <s>{clause.formerly[clause.formerly.length - 1]}</s>
                    {clause.formerly.length > 1 ? (
                      <span className="sr-only">; in full, {clause.formerly.join(", then ")}</span>
                    ) : null}
                  </p>
                ) : null}
                {clause.negotiability === "negotiable" && !relaxing ? (
                  <Button
                    ref={relaxButton}
                    size="xs"
                    variant="ghost"
                    className="-ml-2 text-muted-foreground"
                    onClick={() => setRelaxing(true)}
                  >
                    Relax
                    <span className="sr-only">: {plain(clause.text)}</span>
                  </Button>
                ) : null}
              </div>
              <AnswersDetails clause={clause.clause} drawn={drawn} sourced={!!clause.source} />
            </Details>
          ) : null}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * A quantity a derivation rested on or assumed is a fact of the situation,
 * and the person is the one who can measure it: a presumed storey height
 * becomes a measured one here, and what rested on it is worked out again
 * and marked (`docs/syncs/situating.md`). The given shown is the situation's
 * now, which may differ from the value the derivation used.
 */
function Measured({ quantity }: { quantity: Quantity }) {
  const { gesture, busy } = useConfigurator();
  const [measuring, setMeasuring] = useState(false);
  const [value, setValue] = useState("");
  const given = quantity.given ?? null;
  if (given?.certainty === "measured") {
    const since = given.value !== quantity.value ? `, since measured at ${given.value}` : "";
    return <span className="text-muted-foreground"> (measured{since})</span>;
  }
  if (!measuring) {
    return (
      <Button
        variant="link"
        size="xs"
        className="h-auto px-1 text-xs"
        disabled={busy}
        title={given ? "As stated; say what you measured on site" : "Presumed; say what you measured on site"}
        onClick={() => {
          setValue(String(given?.value ?? quantity.value));
          setMeasuring(true);
        }}
      >
        measure
      </Button>
    );
  }
  return (
    <form
      className="inline-flex items-baseline gap-1"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        setMeasuring(false);
        void gesture({ act: "survey", fact: quantity.quantity, value: n });
      }}
    >
      <Input
        autoFocus
        inputMode="decimal"
        aria-label={`${quantity.meaning}, as measured`}
        className="h-6 w-20 px-1 text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setMeasuring(false);
        }}
      />
      {quantity.unit ? <span>{quantity.unit}</span> : null}
      <Button type="submit" variant="ghost" size="xs" className="h-6 px-1 text-xs" disabled={busy}>
        <CheckIcon aria-hidden className="size-3" />
        <span className="sr-only">Record the measurement</span>
      </Button>
    </form>
  );
}

/** A quantity with its unit, as it reads in a sentence. */
function amount(q: Quantity): string {
  return q.unit ? `${q.value} ${q.unit}` : String(q.value);
}

function given(q: Quantity): string {
  return q.unit ? `${q.meaning} ${amount(q)}` : `${amount(q)} ${q.meaning}`;
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  // The line being read. Only a selection the person moved counts: a
  // write-back from the server moves the selection too, and while it does
  // the editor does not have focus.
  const [current, setCurrent] = useState<string | null>(null);
  const [opened, setOpenedSet] = useState<Set<string>>(() => new Set());
  const setOpened = useCallback(
    (clause: string, open: boolean) =>
      setOpenedSet((was) => {
        if (was.has(clause) === open) return was;
        const next = new Set(was);
        if (open) next.add(clause);
        else next.delete(clause);
        return next;
      }),
    [],
  );

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
    onFocus: ({ editor }) => setCurrent(clauseAt(editor)),
    onSelectionUpdate: ({ editor }) => {
      if (editor.isFocused) setCurrent(clauseAt(editor));
    },
  });

  const writeBack = useCallback(
    (next: View | null) => {
      if (!editor || typing(editor)) return;
      const wanted = documentOf(next);
      given.current = new Set((next?.clauses ?? []).map((c) => c.clause));
      // After the effect that called this, not inside it: each clause is a
      // React node view, and Tiptap renders a new one with `flushSync`,
      // which React refuses mid-commit and logs once per clause.
      queueMicrotask(() => {
        if (editor.isDestroyed || typing(editor)) return;
        if (JSON.stringify(editor.getJSON()) !== JSON.stringify(wanted))
          editor.commands.setContent(wanted, { emitUpdate: false });
      });
    },
    [editor],
  );

  /** One gesture each, awaited, so the log reads as the person's edits did. */
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
    <Current.Provider value={{ current, setCurrent, opened, setOpened }}>
      {editor ? (
        // Placed against the clause's left edge; the padding takes it out
        // of the card and level with the first line of words.
        <DragHandle editor={editor}>
          {/* For the pointer only: the keyboard has no way to reorder a clause. */}
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
    </Current.Provider>
  );
}

/** The mismatches a person can narrow the list to, offered only while
 * there are any. */
const MISMATCHES: { gap: Gap; title: string }[] = [
  { gap: "unanswered", title: "unanswered" },
  { gap: "unbound", title: "answering nothing" },
];

const PRESSED = "data-[state=on]:bg-foreground data-[state=on]:text-background";

/**
 * What the list is narrowed to, said once, in one line above it: the gap it
 * is filtered to, or the assertion or clause that frames it; and beside
 * that, which facts are shown next to each item. Four questions used to be
 * answered in four places — the gaps here, the steps beside, the
 * assertion and clause frames in a banner of their own, the facets up in
 * the panel's header — and a person asking *what am I looking at* had to
 * read them all. The steps stay beside the list: they are what the list is
 * about, a different axis, and the rail reads as a sequence.
 *
 * The gaps are of two kinds, so they are two controls. *Open* is how far
 * the work has come, so *All* and *Open* are a pair to switch between.
 * *Unanswered* and *Answering nothing* are mismatches between what was
 * asked and what was set: usually there are none, and a row of tabs
 * counting zeros reads as a menu of empty places. They appear only while
 * there is something in them, tinted as something in the way, and the one
 * chosen stays while it is chosen, so a person who has just emptied it
 * sees that it is empty and the way back. The pair follows the same rule:
 * before anything is asked for or set, everything is open and *Open*
 * would narrow nothing, so the pair waits until the list holds something
 * else.
 *
 * Choosing a gap is `frame` by gap and choosing everything is `unframe`,
 * so the filter is a fact of `Framing`, the same whichever party set it.
 * While a step frames the list the gaps work within it: each is the same
 * step frame with the gap beside it, and the counts are the step's. An
 * assertion or a clause
 * frame is not a gap, so the gaps give way to the sentence that says what
 * the frame is, with the way out beside it; a frame on a clause is also
 * the answering mode, and the sentence says so.
 */
function Narrowing() {
  const { view, gesture, label } = useConfigurator();
  // A filter is a place the person goes, and the back button returns from.
  const navigate = useNavigate();
  if (!view) return null;
  const frame = view.frame;
  const sentence = frame?.by === "assertion" || frame?.by === "clause";
  const step = frame?.by === "step" ? frame : null;
  const value = !frame ? "all" : frame.by === "gap" ? frame.gap : step ? step.gap ?? "all" : "";
  const counts = step ? step.counts : view.counts;
  const mismatches = MISMATCHES.filter(({ gap }) => counts[gap] || value === gap);
  const inside = view.variables.filter((v) => v.framed);
  // Under *All* every item in scope is framed, so this is whether *Open*
  // would leave anything out; chosen, it stays, as the way back.
  const narrows =
    value === "open" || view.clauses.length > 0 || inside.some((v) => v.standing !== "open");
  const to = (next: string): Stimulus =>
    step
      ? { act: "frame", frame: { by: "step", step: step.step, ...(next === "all" ? {} : { gap: next }) } }
      : next === "all"
        ? { act: "unframe" }
        : { act: "frame", frame: { by: "gap", gap: next } };
  const count = (standing: string) => inside.filter((v) => v.standing === standing).length;
  // Only the counts that say something: a frame with nothing forced, open
  // or given way does not list them as zeros.
  const tally = (parts: [number, string][]) =>
    parts.filter(([n]) => n).map(([n, word]) => `${n} ${word}`).join(" · ");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {sentence ? (
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-xs">
          {frame.by === "assertion" ? (
            <>
              <span>
                <span className="text-muted-foreground">From </span>
                <To id={address.variable(frame.variable)} className="font-medium">
                  {frame.heading}
                </To>
                {frame.asked ? (
                  <>
                    <span className="text-muted-foreground">: </span>
                    <span className="font-medium">{label(frame.asked)}</span>
                  </>
                ) : null}
              </span>
              <span className="text-muted-foreground">
                {tally([
                  [count("follows"), "forced"],
                  [count("open"), "open"],
                  [count("yielded"), "gave way"],
                  [count("unmet"), "unmet"],
                ]) || "nothing forced"}
              </span>
            </>
          ) : (
            <>
              <span className="min-w-0">
                <span className="text-muted-foreground">About </span>
                <To id={address.clause(frame.clause)} className="font-medium">
                  “<ClauseText text={frame.text} />”
                </To>
              </span>
              <span className="text-muted-foreground">
                {tally([
                  [count("asked") + count("yielded") + count("unmet"), "answering"],
                  [count("follows"), "followed"],
                  [count("open"), "open could answer it"],
                ]) || "nothing answers it"}
                {" · a value picked now does"}
              </span>
            </>
          )}
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          {narrows ? (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={value}
              aria-label="Show"
              onValueChange={(next) => {
                if (!next || next === value) return;
                void navigate(to(next));
              }}
            >
              {/* Pressed is solid: the primitive's muted fill all but vanishes on
                  the panel's ground, and which filter is on is the list's meaning. */}
              <ToggleGroupItem value="all" className={PRESSED}>
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="open" className={cn("gap-1.5", PRESSED)}>
                Open
                <span className="tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-background/70">
                  {counts.open}
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          {mismatches.length ? (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={1}
              value={value}
              aria-label="Mismatches"
              onValueChange={(next) => {
                // Pressing the chosen one again lets go of it.
                const gap = next || "all";
                if (gap !== value) void navigate(to(gap));
              }}
            >
              {mismatches.map(({ gap, title }) => (
                <ToggleGroupItem
                  key={gap}
                  value={gap}
                  className={cn("gap-1.5", TONE.caution, PRESSED)}
                >
                  <span className="tabular-nums">{counts[gap]}</span>
                  {title}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : null}
        </span>
      )}
      {/* The way out and the facets stay together at the end of the line,
          whatever the sentence's length. */}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {sentence ? (
          <Button variant="ghost" size="xs" onClick={() => void gesture({ act: "unframe" })}>
            Show everything
          </Button>
        ) : null}
        <ShowingMenu />
      </span>
    </div>
  );
}

/**
 * The specification as one list: a line per requirement with what answers
 * it and, beneath each answer, what it forced; then a line per value
 * answering none, with an empty requirement; then what is still open. Then
 * the sources the assistant read requirements from. Its id is `asserted`,
 * and the document's is `required`, the two places the chat links to.
 */
export function AskedFor() {
  const { view } = useConfigurator();
  if (!view) return null;
  const asserted = framedAsserted(view);
  const { unbound, loose, open, shown } = ledger(view, asserted);
  const empty = !shown.size && !unbound.length && !loose.length && !open.length;
  return (
    <section id="asserted" className="mt-6 scroll-mt-28" aria-labelledby="asserted-title">
      <h2 id="asserted-title" className="sr-only">
        The specification
      </h2>
      {/* The steps of the job beside the list, and the list's own header
          under them: the gaps, within the step it is narrowed to
          (`steps.tsx`). */}
      <StepTabs>
        {/* Sticky, so what the list is narrowed to, and the way out of it,
            stay in view down a long list. */}
        <header className="sticky top-0 z-10 -mt-2 space-y-2 bg-ground/95 pt-2 pb-2 backdrop-blur">
          <Narrowing />
        </header>
        {/* The ledger is a text field, so its edge is a field's: 3:1. Framed,
            it is read, and a frame that leaves nothing says so. */}
        {/* The ring is drawn inside the edge: outside it, the sticky header
            above paints over the card's top. */}
        <Card id="required" className="scroll-mt-28 gap-0 py-0 ring-(--field) ring-inset">
          {/* With the clauses hidden, the first line has nothing above it to
              be ruled off from. */}
          <CardContent
            className={cn(
              "px-3 py-1",
              view.frame &&
                !shown.size &&
                "[&_.tiptap]:hidden [&>[data-line]:not([data-line]~[data-line])]:border-t-0",
            )}
          >
            <Specification />
            <Unbound unbound={unbound} />
            <Loose loose={loose} />
            <Open open={open} />
            {view.frame && empty ? (
              <p className="py-3 text-xs text-muted-foreground">Nothing here.</p>
            ) : null}
          </CardContent>
        </Card>
        <Sources />
      </StepTabs>
    </section>
  );
}

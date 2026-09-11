"use client";

/**
 * The specification, edited as a document.
 *
 * A Tiptap editor whose schema is a sequence of clause nodes and nothing
 * else. Each node carries the clause's identity from `Specifying` as an
 * attribute; the text is editable in place, and everything else about the
 * clause — its discipline, its negotiability, what answers it — is rendered
 * beside the text by the node view and is not text.
 *
 * The document is never the state. A transaction here is a stimulus: a node
 * that appears is `require`, one that vanishes is `strike`, changed text is
 * `reword`, and the node view's controls are `classify`, `settle`, `move` and
 * `relax`. The mapping lives in `flush` below and holds nothing across
 * renders except what has not yet been sent. See
 * docs/concepts/specifying.md, "The specification is edited as a document".
 *
 * While the editor has focus it owns the text; the view from the server is
 * written back into it only when it does not, so that a refresh while the
 * model is working cannot overwrite what a person is in the middle of typing.
 */

import { mergeAttributes, Node } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { DISCIPLINES, NEGOTIABILITY, useAnswering } from "./clauses";
import {
  useConfigurator,
  type Answer,
  type Clause,
  type Negotiability,
  type View,
} from "./provider";

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
  content: "text*",
  defining: true,
  addAttributes() {
    return {
      clause: { default: null },
      // What a new clause will be classified as when it is required.
      discipline: { default: "performance" },
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
      // A new clause after this one, of the same discipline. Not `splitBlock`,
      // which would carry half the text into a new clause and reword this one.
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        const node = $from.parent;
        if (node.type.name !== "clause") return false;
        const after = $from.after();
        return editor
          .chain()
          .insertContentAt(after, {
            type: "clause",
            attrs: { clause: null, discipline: node.attrs.discipline },
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

/** The document a view describes, for writing into the editor. */
function documentOf(view: View | null) {
  const clauses = view?.clauses ?? [];
  return {
    type: "doc",
    content: clauses.length
      ? clauses.map((c) => ({
          type: "clause",
          attrs: { clause: c.clause, discipline: c.discipline },
          content: c.text ? [{ type: "text", text: c.text }] : [],
        }))
      : [{ type: "clause", attrs: { clause: null, discipline: "performance" } }],
  };
}

/** The clauses a document holds, in order, for diffing against the view. */
function clausesOf(editor: Editor) {
  const out: { pos: number; clause: string | null; discipline: string; text: string }[] =
    [];
  editor.state.doc.forEach((node, offset) => {
    out.push({
      pos: offset,
      clause: node.attrs.clause ?? null,
      discipline: node.attrs.discipline,
      text: node.textContent.trim(),
    });
  });
  return out;
}

// -- one clause, rendered -----------------------------------------------------

function OneAnswer({ answer }: { answer: Answer }) {
  const unmet = answer.standing === "unmet";
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 text-xs">
      <span className="uppercase tracking-wide text-muted-foreground">
        {answer.heading ?? "no variable offers this"}
      </span>
      <span className={cn("text-sm", unmet && "text-destructive")}>{answer.label}</span>
      {unmet ? (
        <span className="text-destructive">not buildable alongside the rest</span>
      ) : null}
      {answer.replaced ? (
        <span className="text-muted-foreground">
          in place of {answer.replaced}
          {answer.reason ? `: ${answer.reason}` : ""}
        </span>
      ) : null}
    </li>
  );
}

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
function ClauseView({ node, editor, getPos }: NodeViewProps) {
  const { view, gesture, busy } = useConfigurator();
  const { answering, setAnswering } = useAnswering();
  const [relaxing, setRelaxing] = useState(false);
  const id: string | null = node.attrs.clause;
  const clause = id ? (view?.clauses.find((c) => c.clause === id) ?? null) : null;
  const active = !!clause && answering?.clause === clause.clause;
  const empty = node.content.size === 0;
  const open = clause?.negotiability === "open";

  // Where this clause sits, for `move`.
  const order = view?.clauses.map((c) => c.clause) ?? [];
  const at = clause ? order.indexOf(clause.clause) : -1;
  const move = (direction: -1 | 1) => {
    if (!clause || at < 0) return;
    const before =
      direction < 0 ? order[at - 1] : (order[at + 2] ?? null);
    void gesture({ act: "move", clause: clause.clause, before });
  };

  const discipline = clause?.discipline ?? node.attrs.discipline;
  const setDiscipline = (value: string) => {
    if (!value) return;
    if (clause) void gesture({ act: "classify", clause: clause.clause, discipline: value });
    else {
      const pos = getPos();
      if (pos !== undefined)
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, discipline: value }),
        );
    }
  };

  return (
    <NodeViewWrapper
      className={cn(
        "group/clause relative border-b py-2 last:border-b-0",
        active && "ring-1 ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {relaxing && clause ? (
            <div contentEditable={false}>
              <Relax clause={clause} onDone={() => setRelaxing(false)} />
            </div>
          ) : (
            <div className="relative">
              {empty ? (
                <span
                  contentEditable={false}
                  className="pointer-events-none absolute inset-0 text-sm text-muted-foreground"
                >
                  What the lift must do, in your words
                </span>
              ) : null}
              <NodeViewContent
                className={cn("text-sm outline-none", clause?.formerly.length && "")}
              />
            </div>
          )}
          <div
            contentEditable={false}
            className="flex flex-wrap items-center gap-1.5 select-none"
          >
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              spacing={0}
              value={discipline}
              onValueChange={setDiscipline}
              aria-label="Discipline"
              className="flex-wrap"
            >
              {DISCIPLINES.map(([key, label]) => (
                <ToggleGroupItem key={key} value={key} disabled={busy} className="h-6 px-2 text-xs">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {clause ? (
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                spacing={0}
                value={clause.negotiability}
                onValueChange={(negotiability) => {
                  if (negotiability && negotiability !== clause.negotiability)
                    void gesture({ act: "settle", clause: clause.clause, negotiability });
                }}
                aria-label="How firmly this is meant"
              >
                {(Object.keys(NEGOTIABILITY) as Negotiability[]).map((key) => (
                  <ToggleGroupItem key={key} value={key} disabled={busy} className="h-6 px-2 text-xs">
                    {NEGOTIABILITY[key]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                not yet required
              </Badge>
            )}
            {clause?.formerly.length ? (
              <span
                className="text-xs text-muted-foreground"
                title={clause.formerly.join(" → ")}
              >
                relaxed from{" "}
                <s>{clause.formerly[clause.formerly.length - 1]}</s>
              </span>
            ) : null}
          </div>
          {clause ? (
            <div contentEditable={false} className="select-none">
              {clause.answers.length ? (
                <ul className="space-y-0.5">
                  {clause.answers.map((answer) => (
                    <OneAnswer key={answer.choice} answer={answer} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {open
                    ? "Left open on purpose: nothing needs to answer this."
                    : "Not yet answered."}
                </p>
              )}
            </div>
          ) : null}
        </div>
        {clause ? (
          <div
            contentEditable={false}
            className="flex shrink-0 flex-col items-end gap-1 select-none"
          >
            {!open ? (
              <Button
                size="xs"
                variant={active ? "default" : "outline"}
                disabled={busy}
                onClick={() => setAnswering(active ? null : clause)}
              >
                {active ? "Answering…" : clause.answers.length ? "Change answer" : "Answer"}
              </Button>
            ) : null}
            {clause.negotiability === "negotiable" && !relaxing ? (
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => setRelaxing(true)}>
                Relax
              </Button>
            ) : null}
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={busy || at <= 0}
                title="Move up"
                aria-label="Move up"
                onClick={() => move(-1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={busy || at < 0 || at >= order.length - 1}
                title="Move down"
                aria-label="Move down"
                onClick={() => move(1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={busy}
                title="Strike this clause"
                aria-label="Strike this clause"
                onClick={() => void gesture({ act: "strike", clause: clause.clause })}
              >
                <XIcon />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

// -- the editor, and the mapping from transactions to gestures ---------------

const SETTLE_AFTER = 700;

export function Specification() {
  const { view, gesture } = useConfigurator();
  const viewRef = useRef(view);
  viewRef.current = view;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);

  const editor = useEditor({
    extensions: [ClauseDocument, Text, ClauseNode],
    content: documentOf(view),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "outline-none", "aria-label": "Your requirements" },
    },
    onUpdate: () => schedule(),
    onBlur: () => void flush(),
  });

  /**
   * Send what the document says that the state does not: a strike for every
   * identity that has gone, a reword for every changed text, a require for
   * every node with words and no identity — in document order, one gesture
   * each, awaited, so the log reads as the person's edits did.
   */
  const flush = useCallback(async () => {
    if (!editor || flushing.current) return;
    flushing.current = true;
    try {
      const current = viewRef.current;
      if (!current) return;
      const held = new Map(current.clauses.map((c) => [c.clause, c]));
      const inDoc = clausesOf(editor);
      const present = new Set(inDoc.map((n) => n.clause).filter(Boolean));
      for (const c of current.clauses)
        if (!present.has(c.clause)) await gesture({ act: "strike", clause: c.clause });
      for (const n of inDoc) {
        if (n.clause) {
          const was = held.get(n.clause);
          if (was && n.text && n.text !== was.text)
            await gesture({ act: "reword", clause: n.clause, text: n.text });
          continue;
        }
        if (!n.text) continue;
        const before = new Set((viewRef.current?.clauses ?? []).map((c) => c.clause));
        const next = await gesture({
          act: "require",
          text: n.text,
          discipline: n.discipline,
          negotiability: "fixed",
        });
        const added = next?.clauses.find((c) => !before.has(c.clause));
        if (!added) continue;
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
    } finally {
      flushing.current = false;
    }
  }, [editor, gesture]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SETTLE_AFTER);
  }, [flush]);

  // The view writes back into the document only while nobody is typing in it.
  useEffect(() => {
    if (!editor || editor.isFocused || flushing.current) return;
    const wanted = documentOf(view);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(wanted))
      editor.commands.setContent(wanted, { emitUpdate: false });
  }, [editor, view]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return <EditorContent editor={editor} />;
}

/** The section: the ledger as a document, with its counts. */
export function Required() {
  const { view } = useConfigurator();
  if (!view) return null;
  const unanswered = view.counts.unanswered;
  return (
    <section className="mt-6">
      <header className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">Required</h2>
        <span className="text-xs text-muted-foreground">
          {view.clauses.length} · in your words
          {unanswered ? ` · ${unanswered} not yet answered` : ""}
          {" · "}Enter for another, Backspace on an empty line to strike
        </span>
      </header>
      <Card className="gap-0 py-0">
        <CardContent className="px-3 py-1">
          <Specification />
        </CardContent>
      </Card>
    </section>
  );
}

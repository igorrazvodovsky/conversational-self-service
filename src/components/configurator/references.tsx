"use client";

/**
 * The catalogue, offered inside a clause as it is typed.
 *
 * A `@` in the requirement document opens the catalogue's vocabulary — its
 * variables and their values — and picking one puts a reference into the
 * clause: an inline atom the person cannot edit inside, only place or
 * remove. The reference is text as far as `Specifying` is concerned; the
 * token it becomes is `token` in `clauses.tsx`, and the editor is the one
 * reader that turns the token back into a chip.
 *
 * A reference names; it does not answer. What answers a clause is
 * `Binding`'s business, reached by a gesture, and a person who names a value
 * in their words has said what they mean without yet saying that the lift
 * must have it. The value's chip offers that gesture in place.
 */

import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  ReactRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ReferenceChip, token, type Reference } from "./clauses";
import { useConfigurator, type View } from "./provider";

/** One thing the popup offers: a reference, with where it sits in the catalogue. */
interface Offer extends Reference {
  key: string;
  /** The variable's heading, for a value; the family, for an individual. */
  under: string;
  /** Whether the rules still allow the value. Always true for an individual. */
  possible: boolean;
}

const AT_MOST = 12;

/** What the catalogue offers for a query: individuals whose heading matches, then values whose label or heading does. */
function offers(view: View | null, query: string): Offer[] {
  if (!view) return [];
  const q = query.trim().toLowerCase();
  const hit = (s: string) => !q || s.toLowerCase().includes(q);
  const individuals: Offer[] = [];
  const values: Offer[] = [];
  for (const variable of view.variables) {
    if (hit(variable.heading))
      individuals.push({
        key: variable.name,
        variable: variable.name,
        option: null,
        label: variable.heading,
        under: variable.family,
        possible: true,
      });
    for (const option of variable.options)
      if (hit(option.label) || (q && variable.heading.toLowerCase().includes(q)))
        values.push({
          key: option.id,
          variable: variable.name,
          option: option.id,
          label: option.label,
          under: variable.heading,
          possible: option.possible,
        });
  }
  return [...individuals, ...values].slice(0, AT_MOST);
}

// -- the popup ----------------------------------------------------------------

interface ListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const OfferList = forwardRef<ListHandle, SuggestionProps<Offer, Reference>>(
  function OfferList({ items, command, clientRect }, ref) {
    const [selected, setSelected] = useState(0);
    useEffect(() => setSelected(0), [items]);

    const pick = (offer: Offer | undefined) => {
      if (!offer) return;
      command({ variable: offer.variable, option: offer.option, label: offer.label });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) return false;
        if (event.key === "ArrowUp") {
          setSelected((i) => (i + items.length - 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((i) => (i + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          pick(items[selected]);
          return true;
        }
        return false;
      },
    }));

    const rect = clientRect?.();
    // Nothing offered, nothing shown: the keys fall through to the editor.
    if (typeof document === "undefined" || !items.length) return null;
    const individuals = items.filter((o) => !o.option);
    const values = items.filter((o) => o.option);
    const group = (title: string, offered: Offer[]) =>
      offered.length ? (
        <CommandGroup heading={title}>
          {offered.map((offer) => (
            <CommandItem
              key={offer.key}
              value={offer.key}
              onSelect={() => pick(offer)}
              onMouseMove={() => setSelected(items.indexOf(offer))}
              className={!offer.possible ? "text-muted-foreground line-through" : undefined}
            >
              <ReferenceChip reference={offer} />
              <span className="truncate text-muted-foreground">{offer.under}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null;

    return createPortal(
      <div
        role="presentation"
        className="fixed z-50 w-80 border bg-popover text-popover-foreground shadow-md"
        style={{ top: (rect?.bottom ?? 0) + 4, left: rect?.left ?? 0 }}
      >
        <Command shouldFilter={false} value={items[selected]?.key ?? ""}>
          <CommandList>
            {group("Individuals", individuals)}
            {group("Values", values)}
          </CommandList>
        </Command>
      </div>,
      document.body,
    );
  },
);

// -- the node -----------------------------------------------------------------

/**
 * The chip in the document. A value's chip is a button: pressed, it performs
 * `answer` for the clause it sits in — the same gesture as a pick on the
 * canvas while answering, made where the value was named — and once the
 * value answers the clause the chip says so. An individual's chip only names.
 */
function ReferenceView({ node, editor, getPos }: NodeViewProps) {
  const { view, gesture, busy } = useConfigurator();
  const reference = node.attrs as Reference;
  const pos = getPos();
  const clauseId: string | null =
    pos === undefined ? null : (editor.state.doc.resolve(pos).parent.attrs.clause ?? null);
  const clause = clauseId ? (view?.clauses.find((c) => c.clause === clauseId) ?? null) : null;
  const bound =
    !!reference.option && !!clause?.answers.some((a) => a.value === reference.option);
  const answerable = !!reference.option && !!clause && !bound;
  return (
    <NodeViewWrapper as="span" className="mx-0.5 inline-flex">
      {reference.option ? (
        <ReferenceChip reference={reference} bound={bound}>
          <button
            type="button"
            contentEditable={false}
            disabled={busy || !answerable}
            title={
              bound
                ? "Answers this clause"
                : clause
                  ? "Answer this clause with it"
                  : undefined
            }
            onClick={() =>
              clause &&
              void gesture({ act: "answer", clause: clause.clause, option: reference.option })
            }
          >
            {bound ? <CheckIcon /> : null}
            {reference.label}
          </button>
        </ReferenceChip>
      ) : (
        <ReferenceChip reference={reference} />
      )}
    </NodeViewWrapper>
  );
}

/**
 * The extension. `viewRef` is read when the popup opens, so the list is the
 * catalogue as the canvas has it now, without recreating the editor.
 */
export function referencing(viewRef: RefObject<View | null>) {
  return Mention.extend({
    name: "reference",
    addAttributes() {
      return {
        variable: { default: null },
        option: { default: null },
        label: { default: null },
      };
    },
    parseHTML() {
      return [{ tag: "span[data-reference-of]" }];
    },
    addNodeView() {
      return ReactNodeViewRenderer(ReferenceView);
    },
  }).configure({
    renderText: ({ node }) => token(node.attrs as Reference),
    renderHTML: ({ node, options }) => [
      "span",
      mergeAttributes(options.HTMLAttributes, { "data-reference-of": node.attrs.variable }),
      node.attrs.label,
    ],
    suggestion: {
      char: "@",
      allowSpaces: true,
      items: ({ query }) => offers(viewRef.current, query),
      render: () => {
        let renderer: ReactRenderer<ListHandle> | null = null;
        return {
          onStart: (props) => {
            renderer = new ReactRenderer(OfferList, { props, editor: props.editor });
          },
          onUpdate: (props) => renderer?.updateProps(props),
          onKeyDown: (props) => renderer?.ref?.onKeyDown(props) ?? false,
          onExit: () => {
            renderer?.destroy();
            renderer = null;
          },
        };
      },
    },
  });
}

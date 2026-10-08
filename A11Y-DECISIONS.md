# A11Y Decisions Log (Pattern Memory)

> **Purpose:** cross-turn memory of choices between **equally conformant alternatives**. Two implementations can both pass `A11Y.md` and axe and still diverge (different `role`, focus pattern, announcement wording) — twenty compliant modals, zero coherence. This file prevents that.

## Rules for the AI

1. **Record only what is not derivable** from `A11Y.md` rules or from the code itself. Landmarks, headings, and alt presence are machine-verifiable — they do **NOT** belong here.
2. **Index by pattern, never by screen.** ✅ *"Destructive confirmation modal → `alertdialog`"* · ❌ *"The dispute modal does X"*.
3. **One line per decision:** pattern → choice → short why.
4. **Read before building:** before generating any interactive component, check this log and reuse the recorded pattern (see *Component Reuse* in the AI Behavior Contract).
5. **Never fork silently:** if a new requirement contradicts a recorded decision, ask the user — do not create a parallel variant.
6. **Stay lean:** tens of lines, not hundreds. This file shares the context budget with Lazy Loading; if it grows past ~40 entries, consolidate.
7. **Versioned, never gitignored:** this is *shared* memory — across turns, agents and developers. A local-only copy per developer forks the patterns and defeats the file's entire purpose.

## Decisions

<!-- Append entries below. Format: - **Pattern** → choice — why. (date) -->

- **Compliance profile** → Standard (AA), taken as the A11Y.md default without asking — the review was requested with no profile named. (2026-10-05)
- **Surface change (Moding)** → focus moves to the new surface's `h1` only when the person asked for it from the nav; a surface a rule brings forward takes no focus — focus follows the person, never the model. (2026-10-05)
- **Following an item's address** → scroll and focus the item (`tabIndex=-1` when it is not a control) — the keyboard arrives where the eye does. (2026-10-05)
- **Skip links on a page whose fragments are addresses** → move focus by script, `preventDefault` the fragment — setting `#main` would be read as an address and could change the surface. (2026-10-05)
- **Change announcements** → one polite `role="status"` per source (canvas changes, the assistant's run), text swapped in a region mounted at load; `role="alert"` only for a refused gesture — announce transitions, never content. (2026-10-05)
- **Streaming chat transcript** → `role="log"` with `aria-busy` while a reply is written; speaker in visually hidden text per turn — no token-by-token reading. (2026-10-05)
- **One question shown in two places (canvas and chat)** → both are labelled regions, not alerts; arrival announced once by the status region — avoids a double assertive announcement. (2026-10-05)
- **State drawn by strikethrough, dimming, badge variant or a mark** → visually hidden words after the visible label (`, ruled out`, `, the current value`) rather than an `aria-label` — keeps the visible text first in the name (SC 2.5.3). (2026-10-05)
- **Repeated per-item control (Change, Take back, Compare, Move)** → visible verb plus a visually hidden item name after it. (2026-10-05)
- **Action unavailable for a reason** → `aria-disabled` with a guarded handler, the reason as visible text tied by `aria-describedby` — a `disabled` button's tooltip reaches neither pointer nor keyboard. (2026-10-05)
- **Form not yet complete** → the submit button stays live; pressed, it marks the field `aria-invalid`, describes it with the missing piece, and moves focus there — validation on press rather than a greyed-out button. (2026-10-08)
- **Gesture in flight** → nothing disabled; the canvas `main` is `aria-busy`, and the same gesture, or a second answer to the same question, pressed before the first settles is performed once — focus never drops off a control that was disabled under it. (2026-10-08)
- **Control already in the state it would set (current option)** → `aria-pressed`, pressing does nothing — it stays in reach and keeps its tooltip. (2026-10-08)
- **Selectable table row** → the row keeps a pointer click; a native `button` in the first cell, `aria-pressed`, is the keyboard and screen-reader control; the row is not a tab stop. (2026-10-05)
- **Drag to reorder** → Move up / Move down buttons performing the same gesture; the drag grip is `aria-hidden`. (2026-10-05)
- **Gantt-like lane chart** → drawing `aria-hidden`, its content stated in a prose sentence and the milestone table — the table is the chart's data equivalent. (2026-10-05)
- **Text field boundary** → `--field` (80% of `--muted-foreground`, ≥3:1 on every level); cards and buttons keep the `--input` hairline — words identify those, the edge identifies a field. (2026-10-05)
- **Reduced motion** → one global `prefers-reduced-motion: reduce` override in `globals.css` — the shadcn primitives carry their own animations and are not edited. (2026-10-05)
- **Pointer-only convenience in a primitive (`InputGroupAddon` click focuses its field)** → kept; the field itself is a native control in the tab order, so nothing depends on the click. Flagged by `verify-a11y.py` as a clickable `div`. (2026-10-05)
- **Clause link inside a one-line clamped row** → stays inline text; axe's `target-size` reports the clipped part of its box overlapping a neighbour, which the clip makes unreachable to the pointer — the inline exception of SC 2.5.8 applies. (2026-10-05)

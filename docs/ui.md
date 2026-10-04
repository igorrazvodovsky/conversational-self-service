# The UI vocabulary

Every surface this prototype draws is built from [shadcn/ui](https://ui.shadcn.com)
components in `src/components/ui/`, installed with the shadcn CLI rather than
written by hand: shadcn's zinc palette in oklch, and the Lyra style, which is
square, dense and sharp.

This is presentation only. No concept, action or rule changed, and nothing here
belongs in `docs/concepts/` or `docs/syncs/`.

## Adding a component

```bash
npx shadcn@latest add <component>
```

`components.json` sets the style (`radix-lyra`), the base colour and the aliases,
so `add` needs nothing else. Reach for a primitive before writing a `className`
string, and take the installed file as it comes: the next `add --overwrite` will
replace any edit made to it.

Do not run `shadcn init`. It writes `src/app/globals.css` wholesale and would
drop things it knows nothing about. Some of them fail silently:

- The `@theme inline` block. It is what makes `bg-background` or
  `text-muted-foreground` a utility at all. Without it those classes compile to
  nothing and the component renders unstyled, with no error.
- `@import "shadcn/tailwind.css"`. The Lyra components use custom variants
  (`data-open`, `data-checked`) and utilities that live there.
- The zero radius ramp. Every `--radius-*` step is pinned to `0rem`, so a stray
  `rounded-md` can't bring a corner back. Literal classes such as `rounded-full`
  bypass the ramp and have to be left out at the call site.

The stylesheet also carries the CopilotKit font override, the inspector's
position, a `dark` variant broad enough to match the
`<html>` element `ThemeProvider` stamps, and one app-wide `:focus-visible`
outline that replaces the primitives' own focus rings.

`--ring` is one zinc step darker than stock in both themes. Stock zinc's ring is
2.63:1 against white, and a focus indicator needs 3:1.

### `cn`

Since shadcn 4.19 the registry's components import `cn` from shadcn's own `cn`
package instead of from `@/lib/utils`. The installed files keep that import, so
they stay identical to what `add` writes, and `src/lib/utils.ts` re-exports the
same function, so app code and primitives merge classes with one engine.
`clsx` and `tailwind-merge` are not dependencies.

## What each surface is made of

| Surface | Primitives |
|---|---|
| Canvas sections, empty and loading states | `Empty`, `Spinner` |
| The artifact panel | One of `Moding`'s three surfaces at a time — the requirements, the configuration, the quote — switched from the `ToggleGroup` in the panel's header, or by following a link to an item on another surface |
| The requirements surface | The ledger with the sources beneath it, at reading width; a sticky strip with the product's name, a link to the configuration with its counts, and the clause frame if one is on, linking to the clause and to the configuration |
| The way around the configuration | A sticky strip at the top: a `nav` of plain anchors to each section with its count (the ledger's link brings the requirements forward), the `Showing` menu, and under them the frame strip, so a frame begun anywhere is visible and its way out reachable from anywhere |
| An address | Every variable, clause, source and section carries an `id` (`variable:<name>`, `clause:<id>`, `source:<kind>:<id>`, `required`, `asserted`, …) and `scroll-margin` for the sticky strip; the target of the page's fragment gets a ring; an open row addressed from elsewhere opens. An address is on one surface, and following one to the other surface performs `focus` on it first. A link between two items is a plain anchor with a dotted underline (`address.tsx`). The chat's replies may link to them too |
| What the last turn moved | A small square before the heading of each variable and clause the assistant's or a browser agent's last flow reached, and the assertions a settled value rests on; the strip at the top counts them. Read off the log (`touched` in `agent/views.py`), gone once the person next changes the specification |
| Asserted value | `Card` with a ghost `Button` to withdraw; unmet is a destructive ring; the *for* line is one line, linking to the clause |
| A value that follows | `Item` (muted) in an `ItemGroup`; *from* names the assertions it rests on, each a link |
| An open variable | `Collapsible` whose trigger is a ghost `Button`, under a heading row per catalogue family; options are `Button size="xs"`, a ruled-out one `secondary` and struck through; a shown price or carbon figure sits inside the button, notes and exclusions are lists beneath |
| Which facts are shown (`Showing`) | `DropdownMenu` of checkbox items, from a ghost `Button` |
| The requirement document (`Specifying`) | A Tiptap editor in a `Card`; each clause a node view with `Button`s to frame the canvas on it (answer), relax, move and strike and a `DropdownMenu` of radio items for how firmly it is meant; the empty-clause hint from Tiptap's `Placeholder`, placed by the node view |
| A reference in a clause | `Badge` (`outline` for an individual, `secondary` for a value, `default` once the value answers the clause); the `@` list is `Command` with grouped `CommandItem`s |
| The offers issued | `Table`, one row per quote, the selected row `data-state=selected`; a ghost `Button` per row to compare |
| Two quotes compared | `Table` of the rows that differ, with the sums |
| The frame (`Framing`) | A bordered strip in the sticky nav with the counts of the slice and a ghost `Button` to show everything; the way in is a ghost `Button` on an asserted card, or the `Button` on a clause |
| The answering mode | The frame on a clause: the strip names the clause and says that a value picked now answers it; the clause's `Button` reads *Answering…* and takes the frame off |
| The sources (`Filing`, `Conversing`) | A `Collapsible` under the ledger, closed by default, opened by a link from a clause's source line; inside, a `Card` per source with the items read from it |
| Price and carbon totals | `Card`; the grid choice is a `ToggleGroup` |
| An open question | `Alert` (destructive for a conflict) with `Button`s |
| A value held for a reason | A line on the asserted card naming the requirement it answers, and that the assistant cannot change it |
| A reading still the assistant's | *Keep* beside its source line in the ledger |
| The action log | `Collapsible`, `Card`, `Badge` for the actor and for a refusal |
| Requirements / Configuration / Quote switch | `ToggleGroup` |
| Artifact panel and chat split | `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` |
| Conversation list and new-conversation control | `DropdownMenu` of radio items grouped under `DropdownMenuLabel` days, `Button` |
| Chat layout menu and hide control | `DropdownMenu` of radio items, `Button` |
| Restore-the-chat control | `Button` with a mark for unseen replies |
| Chat composer | `InputGroup`, `InputGroupTextarea`, `Button` |
| Suggestions | `Button variant="outline" size="xs"` |
| A person's turn | `Bubble` |
| Welcome screen | `Empty` |
| Copy and scroll-to-latest | `Button` |
| Tool-call row | `Collapsible` |
| Charts, controlled and A2UI | `chart` (`ChartContainer`) over Recharts, coloured by `--chart-1` to `--chart-5` |
| Meeting picker | `Card`, `Item`, `Badge`, `Empty` |
| A2UI catalog | `Card`, `Badge`, `Button`, `Table`, `Separator`, and the two charts |

The chat keeps CopilotKit's layout and swaps pieces in through `CopilotChat`'s
slots (`src/components/chat/index.tsx`). CopilotKit still owns the
stick-to-bottom scroller, the overlay the composer sits in, the attachment queue,
and the markdown body of an assistant turn, which is set at 14px to match.

## The chat against the artifact panel

The layout is in `src/components/example-layout/`: an artifact panel
that is always mounted, and a chat whose geometry is sidebar, floating, full screen or hidden,
switched from one menu in its header. The chat is
mounted once and the modes change its container's classes only, because the
transcript's scroll offset belongs to a DOM node and re-parenting it loses the
place. Hidden is `inert` and transparent rather than `display:none` for the
same reason. Floating is a positioned panel, not a `Dialog`: nothing dims and
no focus is trapped, so the canvas under it stays live.

The geometry is React state, reset on every load; the split's division is a
cookie the server reads (`src/lib/split-layout.ts`), because the panel group
writes it inline and a value the server did not know would hydrate as a
mismatch. Both menus mount a tick after hydration, since a Radix menu present
during the hydration pass shifts the `useId` values of the whole page.

The conversation list is a menu at the left of the chat's header (`conversation-menu.tsx`), rows labelled by start
time and grouped by day, with no navigation column beside the split. It is
used instead of `CopilotThreadsDrawer`, which does not fetch until the runtime
reports a license status. Only CopilotKit Intelligence reports one, so without
`CPK_INTELLIGENCE_API_KEY` the drawer shows *Loading threads…* forever. The
menu reads the same `GET /threads` through `useThreads`, which needs no
license. Without Intelligence that list is the in-memory runner's: it ends
with the Next.js process, and nothing pushes changes to the client, so the page
refetches it when a run ends and when the menu opens. A conversation joins it
on its first run. Switching conversations changes the transcript only; the
configurator is one engine, not one per thread.

## Decisions a reader might trip over

- `InputGroup` fades itself whole with `has-disabled:opacity-50`, which is
  meant for a disabled field. In the composer the disabled element is the send
  button on an empty field, or the attach button while dictating, and the
  whole composer would grey out. The composer takes the fade back on the group
  (`has-disabled:opacity-100`), and both buttons keep the library's plain
  `disabled`.
- The A2UI schema still accepts colours from the agent (`PieChart`'s and
  `BarChart`'s `color`, `FlightCard`'s `statusColor`), and the renderers ignore
  them. The chart tokens and badge variants stand in, so an agent-drawn
  dashboard doesn't bring its own palette.
- Status has no colour of its own — no amber for a question, red for an unmet
  assertion, violet for the model in the log or green for a trend going up —
  because zinc has no equivalent. It maps onto shadcn's variants:
  `destructive` for what can't be built, and `Badge` variants for actor, trend
  and status.
- Nothing is smaller than 12px: the canvas's labels are `text-xs`.

## What is not shadcn, and why

- The attachment queue above the composer, and a sent attachment's thumbnail,
  are CopilotKit's own components with no slot, so they keep their rounded
  corners. Replacing them means taking over `CopilotChatView`'s whole layout.
- The "View in Inspector" button under an assistant turn is drawn by
  CopilotKit's dev inspector, on a local run only.
- `src/lib/a2ui-theme.css` is imported by nothing.

# The UI vocabulary

Every surface this prototype draws is built from [shadcn/ui](https://ui.shadcn.com)
components in `src/components/ui/`, installed with the shadcn CLI rather than
written by hand. The setup follows the sibling prototype,
`conv-pro-conf` (`docs/specs/ui-component-library/design.md` there), so the two
read as one product: shadcn's zinc palette in oklch, and the Lyra style, which is
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
drop things it knows nothing about. Three of them fail silently:

- The `@theme inline` block. It is what makes `bg-background` or
  `text-muted-foreground` a utility at all. Without it those classes compile to
  nothing and the component renders unstyled, with no error.
- `@import "shadcn/tailwind.css"`. The Lyra components use custom variants
  (`data-open`, `data-checked`) and utilities that live there.
- The zero radius ramp. Every `--radius-*` step is pinned to `0rem`, so a stray
  `rounded-md` can't bring a corner back. Literal classes such as `rounded-full`
  bypass the ramp and have to be left out at the call site.

The stylesheet also carries the CopilotKit font override, the showcase pill
highlights, the inspector's position, a `dark` variant broad enough to match the
`<html>` element `ThemeProvider` stamps, and one app-wide `:focus-visible`
outline that replaces the primitives' own focus rings.

`--ring` is one zinc step darker than stock in both themes. Stock zinc's ring is
2.63:1 against white, and a focus indicator needs 3:1.

### `cn`

Since shadcn 4.19 the registry's components import `cn` from shadcn's own `cn`
package instead of from `@/lib/utils`. The installed files keep that import, so
they stay identical to what `add` writes, and `src/lib/utils.ts` re-exports the
same function, so app code and primitives merge classes with one engine.
`clsx` and `tailwind-merge` are no longer dependencies.

## What each surface is made of

| Surface | Primitives |
|---|---|
| Canvas sections, empty and loading states | `Empty`, `Spinner` |
| Asserted value | `Card` with a ghost `Button` to withdraw; unmet is a destructive ring |
| A value that follows | `Item` (muted) in an `ItemGroup` |
| An open variable | `Collapsible` whose trigger is a ghost `Button`; options are `Button size="xs"`, a ruled-out one `secondary` and struck through |
| Price and carbon totals | `Card`; the grid choice is a `ToggleGroup` |
| An open question | `Alert` (destructive for a conflict) with `Button`s |
| The action log | `Collapsible`, `Card`, `Badge` for the actor and for a refusal |
| Chat / Configurator switch | `ToggleGroup` |
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

## Decisions a reader might trip over

- `InputGroup` fades itself whole with `has-disabled:opacity-50`, which is
  meant for a disabled field. In the composer the disabled element is the send
  button on an empty field, or the attach button while dictating, and the
  whole composer greyed out. The composer takes the fade back on the group
  (`has-disabled:opacity-100`), and both buttons keep the library's plain
  `disabled`.
- The A2UI schema still accepts colours from the agent (`PieChart`'s and
  `BarChart`'s `color`, `FlightCard`'s `statusColor`), and the renderers ignore
  them. The chart tokens and badge variants stand in, so an agent-drawn
  dashboard doesn't bring its own palette.
- The old status colours (amber for a question, red for an unmet assertion,
  violet for the model in the log, green for a trend going up) have no zinc
  equivalent. They map onto shadcn's variants: `destructive` for what can't be
  built, and `Badge` variants for actor, trend and status.
- Nothing is smaller than 12px. The canvas used 10px and 11px labels; they are
  `text-xs` now.

## What is not shadcn, and why

- `CopilotThreadsDrawer` is a CopilotKit web component with its own shadow DOM,
  and it needs CopilotKit Intelligence (`CPK_INTELLIGENCE_API_KEY`) to list
  anything. Rebuilding it on `useThreads` would depend on the same platform, so
  it stays as it is.
- `src/app/page.module.css` is the grid that reserves the drawer's column so the
  layout doesn't shift when the client-only drawer mounts. It is layout, not a
  component.
- The attachment queue above the composer, and a sent attachment's thumbnail,
  are CopilotKit's own components with no slot, so they keep their rounded
  corners. Replacing them means taking over `CopilotChatView`'s whole layout, as
  `conv-pro-conf`'s chat pane does, and porting that pane means porting the
  gesture conventions it depends on.
- The "View in Inspector" button under an assistant turn is drawn by
  CopilotKit's dev inspector, on a local run only.
- `src/lib/a2ui-theme.css` is imported by nothing.

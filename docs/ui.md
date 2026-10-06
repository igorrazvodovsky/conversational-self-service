# The UI vocabulary

Every surface this prototype draws is built from [shadcn/ui](https://ui.shadcn.com)
components in `src/components/ui/`, installed with the shadcn CLI rather than
written by hand: shadcn's zinc palette in oklch, and the Lyra style, which is
square, dense and sharp.

This is presentation only. No concept, action or rule changed, and nothing here
belongs in `docs/concepts/` or `docs/syncs/`.

## What a view is

The facts are small and addressed, and a view is a question asked of them. The
question decides the arrangement; the catalogue's families, a document's
customary sections or the order things were recorded in do not. The canvas is
the model: *asserted*, *follows* and *open* are computed from the state, so the
same variable is under one heading today and another after a withdrawal, and
its address follows it.

This is Dorian Taylor's distinction between a category's extension, the
members it lists, and its intension, the rule that admits them. Paper made the
document the smallest unit that could be stored and exchanged, so information
was arranged by fixed lists of document-sized chunks. On a screen the unit can
be a clause, and small units that are cheap to reach give many paths through
the same facts (Taylor, *Intentionally Intensional Information Architecture*,
IA Summit 2017, <https://doriantaylor.com/ia-summit-2017>).

Three questions test a view:

1. *What does it answer?* It should be statable as a rule over the state —
   *what followed from this assertion*, *what is waiting for you*, *what the
   model read from this document*. A view whose groups are a list kept in the
   component is arranged by extension.
2. *What are its units?* A variable, a clause, a source, a quote line: the
   smallest thing a person would point at.
3. *Can they be reached?* Every unit has an address (`address.tsx`), so a link
   between items, a reply in the chat and the person's agent can each name it.
   Naming a unit needs knowing what it holds, so the readers off the page get
   the same units: `review` reads the specification and `open_quote` an
   issued offer, and every unit either returns carries its address under
   `at`; a requirement read from a source also carries the item it was read
   as, under `read_at`.

The same facts may be arranged more than once, one arrangement per question.
The requirements are the example: the ledger holds the clauses in the order the
person wrote them, and the sources beneath it hold the same clauses grouped by
where they were read from. A second arrangement is a second question, not a
duplicate.

The log is read by turn. Every record carries the flow it ran in, and a flow
is one occasion: the person's words and the calls the model made in reply,
or one gesture and what the rules did with it. So the trace answers *what
did this turn do, and on whose authority*, and its unit is the turn, at
`#turn:<flow>`, opened by what started it. A single record is smaller than
anything a person would point at, and the order records were written in is
the arrangement the principle rules out. A turn that only brought a surface
forward is still a turn, and true, but it answers nothing about the
specification, so the trace folds a run of them into one line and does not
count them among the latest turns it shows. The words that opened a turn are in
the chat too, at `#said:<utterance>`, and the trace and the sources link to
them. Words said in another conversation are reached by opening that
conversation first, which is a viewer's convenience like the chat's
geometry. The chat is no `Moding` surface, so following an address there
records nothing.

The quote document is the arrangement for leaving the app: the package that is
sent, printed and signed, shaped like what a lift manufacturer sends. It
answers the questions a recipient brings to paper and no others, and its
sections are a fixed list (`SCOPE` and `SENTENCED` in `document.tsx`) for that
reason, and it renders the frozen values as one scope, without the asserted
and the entailed told apart. The quote surface
therefore reads a quote in more ways than the document does. *Against what was
asked* is the canvas's question put to the specification as it stood when the
offer was made: the requirements, then the values asserted and those that
followed, each with its reason and what it added to the sum, every line
addressed as the offer holds it (`grounds.tsx`). *As the proposal* is the
document. Above the readings, the offer as a decision: what it costs over its
term, what the person provides, and how long it stays open.

Two things the principle leaves open:

- *Which moment a view shows.* Looking at the specification as it stood at a
  quote, rather than now, changes what a view is about. That is neither
  `Moding`, which chooses a surface, nor `Framing`, which narrows one. Which
  quote is being looked at, and which pair is being compared, is a viewer's
  convenience held on the surface, like the chat's geometry. A comparison has
  an address, so the assistant can put one in front of the person by linking
  it without setting anything; if a party other than the viewer is to set
  either, it is a candidate concept.
- *Where `Showing` and `Framing` reach.* Both serve the configuration only
  (`showing.tsx`, `panel-nav.tsx`). A surface gets a frame or a facet when it
  has a question that needs one, and each such extension is a change to the
  concept's note first.

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
2.63:1 against white, and a focus indicator needs 3:1. `--muted-foreground` is
darker than stock in the light theme, so the 12px labels keep 4.5:1 on the
darkest level they sit on.

A text field's edge is `--field`, 80% of `--muted-foreground`, which keeps 3:1
against every level in both themes; `--input` stays the hairline for
everything else, where the words say what the thing is. Under
`prefers-reduced-motion: reduce` every animation and transition settles at
once, in one rule rather than a `motion-safe:` per utility, because the
primitives carry their own animations.

### Levels

Contrast between surfaces comes from neutral levels, not colour, so a thing's
place in the scale reads before its words do. The stylesheet adds three tokens
to shadcn's, outermost first:

| Level | Token | What sits on it |
|---|---|---|
| Frame | `--frame` | Both panels' header rows, one band across the split |
| Ground | `--ground` | The artifact panel and its sticky strips |
| Raised | `--card` | A thing on the ground: an asserted value, the standing, the ledger, the open variables, the proposal |
| Sunken | `--sunken` | A thing set into the ground: a value that follows |
| Band | `--muted` | A band inside a card: a family heading, the frame strip, a source's text, a quote's figures |

The chat stays on `--background`, so the two panels alternate. The dark theme
keeps the order: the frame darkest, the ground a step above the chat, a card a
step above the ground, and a sunken thing back down at the chat's level.

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
| The artifact panel | One of `Moding`'s three surfaces at a time — the requirements, the configuration, the quote — switched from the panel's header, or by following a link to an item on another surface |
| The requirements surface | The ledger with the sources beneath it, across the panel's full width; a sticky strip with the product's name, what the last turn moved, and the clause frame if one is on, linking to the clause and to the configuration |
| The way around the panel | One `nav` row in the panel's header, wrapping onto further lines when the panel is narrow or the text large, a plain anchor per place with its count: the requirements, then the configuration's sections — *asked of you* while a question waits, *asserted*, *follows*, *open* — then the quotes, the three groups divided by a rule. A surface's place performs `focus`; a section is an address on the configuration. There is no level between surface and section. At the row's end, while the configuration is showing, the `Showing` menu (`panel-nav.tsx`) |
| The configuration's strip | Sticky at the top of its scroll while there is something in it: what the last turn moved, and the frame strip, so a frame begun anywhere is visible and its way out reachable from anywhere |
| An address | Every variable, clause, source, quote line and section carries an `id` (`variable:<name>`, `clause:<id>`, `source:<kind>:<id>`, `quote:<id>:variable:<name>`, `quote:<id>:event:<key>`, `compare:<id>:<other>:variable:<name>`, `required`, `asserted`, …) and `scroll-margin` for the sticky strip; the target of the page's fragment gets a ring; an open row addressed from elsewhere opens. An address is on one surface, and following one to the other surface performs `focus` on it first. A link between two items is a plain anchor with a dotted underline (`address.tsx`). The chat's replies may link to them too |
| What the last turn moved | A small square before the heading of each variable and clause the assistant's or the person's own agent's last flow reached, and the assertions a settled value rests on; the strip at the top counts them. Read off the log (`touched` in `agent/views.py`), gone once the person next changes the specification |
| Asserted value | `Card` with a ghost `Button` to withdraw; unmet says so in words, and the question links to it; the *for* line is one line, linking to the clause |
| A value that follows | `Item` in an `ItemGroup`, on `--sunken` rather than the variant's half-strength muted, which all but vanishes on the ground; *from* names the assertions it rests on, each a link |
| An open variable | `Collapsible` whose trigger is a ghost `Button`, under a heading row per catalogue family; options are `Button size="xs"`, a ruled-out one `secondary` and struck through; a shown price or carbon figure sits inside the button, notes and exclusions are lists beneath |
| Which facts are shown (`Showing`) | `DropdownMenu` of checkbox items, from a ghost `Button` |
| The requirement document (`Specifying`) | A Tiptap editor in a `Card`; each clause a node view with `Button`s to frame the canvas on it (answer), relax, move and strike and a `DropdownMenu` of radio items for how firmly it is meant; the empty-clause hint from Tiptap's `Placeholder`, placed by the node view |
| A reference in a clause | `Badge` (`outline` for an individual, `secondary` for a value, `default` once the value answers the clause); the `@` list is `Command` with grouped `CommandItem`s |
| The offers issued | `Table`, one row per quote, the selected row `data-state=selected`; a ghost `Button` per row to compare it with the one selected, and on the selected row one to compare it with the specification now |
| The quote shown | A `Card` on the ground: the decision — standing, days left, the sum, the maintenance charge and both over the term, each a `--muted` band, what the person provides, and the controls to accept, revoke and print — over `Tabs`, one per reading |
| A quote against what was asked | `Table`s under *Required*, *Asserted* and *Follows from that*; each row addressed (`quote:<id>:variable:<name>`, `quote:<id>:clause:<id>`) and ringed when targeted, with its reason, its line price at issue, and an `outline` `Badge` where the canvas has since moved |
| A quote along time | A chart of labelled lanes for the works and one for the aftercare, because the works run in weeks and the aftercare in years and one axis cannot carry both: the seller's work, the person's and the payment marks over weeks from order, then warranty and maintenance over years from acceptance. Spans are `bg-muted` or `bg-foreground/80`, marks a rule with a direct label, so no lane depends on colour. Below them a `Table` of the milestones in order, which is the charts' table view; each row addressed (`quote:<id>:event:<key>`) with what falls due and what the person must have done by then. Positions come from the programme frozen at issue, never from the catalogue |
| A proposal | The quote document under its tab; the printable page draws it alone |
| A quote compared | With another quote, or with the specification now (`now`, read as a quote requested now would freeze it). One `Table` of the values that differ, a `tbody` per group headed by the requirements its values answer on either side (a requirement gained, lost, reworded or left unanswered on one side says so), then the values answering none. Each side says whether its value was asserted, gave way or follows, with who asserted it; a value that follows on both sides is dimmed and called a consequence, linked to the assertions it rests on. Each line carries its change in the sum and the monthly charge, and a sentence says whether the lines account for the whole difference; a value held on both sides but priced differently has a group of its own. The comparison and each line are addressed (`compare:<id>:<other>`, `…:variable:<name>`, `…:clause:<id>`); the sums, the term and the programme are reached through the comparison's own address. Against a quote issued before quotes kept their grounds, only the values that differ, with the reason (`comparison.tsx`) |
| The frame (`Framing`) | A bordered strip in the sticky nav with the counts of the slice and a ghost `Button` to show everything; the way in is a ghost `Button` on an asserted card, or the `Button` on a clause |
| The answering mode | The frame on a clause: the strip names the clause and says that a value picked now answers it; the clause's `Button` reads *Answering…* and takes the frame off |
| The sources (`Filing`, `Conversing`) | A `Collapsible` under the ledger, closed by default, opened by a link from a clause's source line; inside, a `Card` per source with the items read from it |
| Where the specification stands | A `Card` first on the configuration: a `Badge` naming the state (`default` when ready to quote, `outline` otherwise), the reason a quote cannot be requested yet, *Request a quote* and the quotes issued as `Button`s, the counts asked, followed and open, and one line with the equipment price (*so far* until it is ready) and the modelled carbon; the monthly, lifetime and carbon breakdown and the grid's `ToggleGroup` in a `Collapsible` |
| An open question | A section, *asked of you*, first on the configuration while one waits; in it an `Alert` naming the assertions it is between, each linked to its card, with `Button`s |
| A value held for a reason | A line on the asserted card naming the requirement it answers, and that the assistant cannot change it |
| A reading still the assistant's | *Keep* beside its source line in the ledger |
| The action log | `Collapsible`, `Card`, `Badge` for the actor and for a refusal |
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
  because zinc has no equivalent. Nothing on the canvas is an error: a conflict
  is a question put to the person, and an unmet assertion is on record waiting
  for that answer. Neither is styled: the words say it, and the question links
  to the assertions it is between, so finding one is following a link rather
  than scanning for a mark. A refusal in the trace is an `outline` `Badge`, a
  permission working rather than a fault. A yielded value is muted and struck
  through, because it no longer holds. `destructive` is kept for an action that
  destroys and for a request that failed; `Badge` variants carry actor, trend
  and status.
- Nothing is smaller than 12px: the canvas's labels are `text-xs`.

## Accessibility

The target is WCAG 2.2 AA, held to the rules in
[A11Y.md](https://github.com/fecarrico/A11Y.md). The evidence — what was
checked, how, and what still needs a person — is in `REPORT.md` at the
repository's root, with the choices between equally conformant patterns in
`A11Y-DECISIONS.md` beside it.

- *Landmarks.* The panel's header row is a `header`, the surface a `main`, the
  chat a `section` named *Chat*. Skip links come first in the tab order, to
  the panel and to the composer; they move focus by script, because a
  fragment on this page is an item's address.
- *Headings.* The panel's `main` holds one visually hidden `h1` naming the
  surface, rendered by the layout so it is there while a surface loads or is
  empty, and naming the `main`; the eye has the nav. The surfaces' own
  headings start at `h2`. The proposal's headings start at
  the level `QuoteDocument` is given: `h1` on the printable page, `h3` under a
  quote's `h2` on the surface. The window's title names the surface.
- *Focus follows the person, never the model.* Changing surface from the nav,
  or skipping to the panel, takes focus to the panel's `main`, named by the
  surface's `h1` and ringed inside its edge; following an address takes it to
  the item. A link in a one-line row unclips the row while it has keyboard
  focus, so its ring and the clause show whole. A surface a rule brings forward takes nothing. When a gesture removes
  the control that made it — a struck clause, an answered question, a moved
  clause redrawn — focus goes to the nearest thing that is still there.
- *What changed is said once.* `example-layout/announcer.tsx` holds the polite
  status regions: what the last turn moved and a question arriving, and the
  assistant's run starting and ending. The transcript is a `log`, `aria-busy`
  while a reply is written, so a reply is never read token by token. A refused
  gesture is shown and announced as an alert. The question cards are labelled
  regions, not alerts, because the canvas and the chat show the same question.
- *State in words.* Strikethrough, dimming, a badge's variant and the moved
  square are for the eye; each carries visually hidden words beside it —
  *ruled out*, *the current value*, *answers this clause*, *moved by*. A
  tooltip holds nothing that is not also on the page.
- *Every drag has a button.* A clause is moved by its *Move up* and *Move down*
  buttons, the same `move` gesture a drag ends in; the grip is hidden from
  assistive technology.
- *Repeated controls say which.* Each card's *Change*, *Take back* and *What
  followed from this* carry the variable's name, hidden, after the visible
  words, so the name still begins with what is read on screen.

## What is not shadcn, and why

- The attachment queue above the composer, and a sent attachment's thumbnail,
  are CopilotKit's own components with no slot, so they keep their rounded
  corners. Replacing them means taking over `CopilotChatView`'s whole layout.
- The "View in Inspector" button under an assistant turn is drawn by
  CopilotKit's dev inspector, on a local run only.
- `src/lib/a2ui-theme.css` is imported by nothing.

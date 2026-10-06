# The UI vocabulary

Every surface this prototype draws is built from [shadcn/ui](https://ui.shadcn.com)
components in `src/components/ui/`, installed with the shadcn CLI rather than
written by hand: shadcn's zinc palette in oklch, and the Lyra style, which is
square, dense and sharp.

For the UI the code is the source: what each surface is made of, its labels
and its classes are read there, with the reasons beside them in comments. This
note holds what no one component can say — why the views are arranged as they
are, and the decisions that run across them.

## What a view is

The facts are small and addressed, and a view is a question asked of them. The
question decides the arrangement; the catalogue's families, a document's
customary sections or the order things were recorded in do not. The canvas is
the model: *asserted*, *follows* and *open* are computed from the state, so the
same variable is an answer on a requirement's line today and an open row at the
list's tail after a withdrawal, and its address follows it. They are kinds of
fact, each item marked as one where it stands, and filters over one list, not
sections of it.

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
3. *Can they be reached?* Every unit has an address, so a link between
   items, a reply in the chat and the person's agent can each name it. Naming
   a unit needs knowing what it holds, so the readers off the page get the
   same units, each with its address.

The same facts may be arranged more than once, one arrangement per question.
The requirements are the example: the ledger holds the clauses in the order
the person wrote them, and the sources beneath it hold the same clauses
grouped by where they were read from. A second arrangement is a second
question, not a duplicate.

The ledger is the requirement document and the
[Binding](syncs/binding.md#the-ledger-is-a-read) read at once, and its unit
is the choice: a value bound to the clause it answers, with what the value
forced. The question it answers is *what is asked for, what answers each,
and what did that cost*, so a line is a requirement in the person's words,
editable where it stands, beside the values answering it and their
consequences; a requirement nothing answers is a line with a gap where its
answer goes, and the values answering nothing share a last line. The clause
and its answer are one line on one surface rather than two items linked
across surfaces: nearly everything a person does crosses between them, and
that relation is what the case's design is about. So the panel has two
surfaces, the specification and the quotes, and the question that separates
them is the moment — the specification as it stands, an offer as it was
made — not which concept holds the facts.

The log is read by turn. Every record carries the flow it ran in, and a flow
is one occasion: the person's words and the calls the model made in reply,
or one gesture and what the rules did with it. So the log answers *what did
each turn change, and on whose authority*, and its unit is the turn, at
`#turn:<flow>`. A single record is smaller than anything a person would point
at, and the order records were written in is the arrangement the principle
rules out. A turn says first what it changed, in the specification's words,
and beneath that each record it wrote, with the rule that authorised it. What
a turn did is computed from its records, and a turn is usually several
things at once: it may read a requirement, answer it and put a question. So
what it did, like who took part in it, is a filter over one list, and the
notification center is that list with everyone else's changes chosen. A
turn that only brought a surface forward is still a turn, and true, but it
answers nothing about the specification, so a run of them folds into one
line. So does a run of gestures by the same party with no words behind them:
a person working down the open variables answers them a turn at a time, and
the run is one occasion to whoever reads it later, so its line says what the
run did and opens onto each turn. The words that opened a
turn are in the chat too, at `#said:<utterance>`, and the log and the sources
link to them. Words said in another conversation are reached by opening that
conversation first, which is a viewer's convenience like the chat's geometry.
The chat is no `Moding` surface, so following an address there records
nothing.

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
addressed as the offer holds it. *As the proposal* is the document. Above
the readings, the offer as a decision.

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

## Decisions a reader might trip over

- Contrast between surfaces comes from neutral levels, not colour, so a
  thing's place in the scale reads before its words do.
- Status has no colour of its own — no amber for a question, red for an unmet
  assertion, violet for the model in the log or green for a trend going up —
  because zinc has no equivalent. Nothing on the canvas is an error: a conflict
  is a question put to the person, and an unmet assertion is on record waiting
  for that answer. Neither is styled: the words say it, and the question links
  to the assertions it is between, so finding one is following a link rather
  than scanning for a mark. A refusal in the log is an `outline` `Badge`, a
  permission working rather than a fault. `destructive` is kept for an action
  that destroys and for a request that failed.
- Nothing is smaller than 12px.

## Accessibility

The target is WCAG 2.2 AA, held to the rules in
[A11Y.md](https://github.com/fecarrico/A11Y.md). What was checked, how, and
what still needs a person is in `REPORT.md` at the repository's root; the
choices between equally conformant patterns are in `A11Y-DECISIONS.md` beside
it.

## What is not shadcn, and why

- The attachment queue above the composer, and a sent attachment's thumbnail,
  are CopilotKit's own components with no slot, so they keep their rounded
  corners. Replacing them means taking over `CopilotChatView`'s whole layout.
- The "View in Inspector" button under an assistant turn is drawn by
  CopilotKit's dev inspector, on a local run only.
- `src/lib/a2ui-theme.css` is imported by nothing.

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
[Binding](syncs/binding.md#the-ledger-is-a-read) read at once, and it has
two units: the clause and the variable. The question it answers is *what
is asked for, what answers each, and what did that cost*. The variables are
the spine — one row each, in the catalogue's order, whatever the row's
standing, so a value picked stays where it was clicked and the row says
what changed: asked for, by whom and for which requirement; following, from
which assertion by which rule; or open, with its options. The requirements
are the person's words above the rows, in the order they were written,
editable where they stand, each naming the rows that answer it and a gap
where nothing does; a requirement is a reason the person gives for a value,
and a value with none is not short of anything. The two are linked across
rather than merged into one line: the clause links to its rows and the row
to its clauses, so a person reading either way finds the other one step
away, and neither list reorders under their hands.

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
turn that only narrowed the document, or changed what is shown beside its
items, is still a turn, and true, but it
answers nothing about the specification, so a run of them folds into one
line. So does a run of gestures by the same party with no words behind them:
a person working down the open variables answers them a turn at a time, and
the run is one occasion to whoever reads it later, so its line says what the
run did and opens onto each turn. The words that opened a
turn are in the chat too, at `#said:<utterance>`, and the log and the sources
link to them. Words said in another conversation are reached by opening that
conversation first, which is a viewer's convenience like the chat's geometry.
The chat is not a view of the document, so following an address there
records nothing.

## One document, read several ways

The panel is one document: the deal between the person and the seller, as
it stands or as it stood when an offer was issued. The requirement list, the
proposal, the programme and the drawing are not sections of it, and not
surfaces beside it. They are views of it — the same facts projected for
different tasks — and a person opens whichever their task needs:

- *Against what was asked.* By requirement: each clause in the person's
  words, what answers it and what that forced, a blank where nothing answers
  yet, the values answering nothing on a last line. The task is checking,
  and this is the ledger.
- *As the proposal.* The seller's format, shaped like what a lift
  manufacturer sends: the scope as one list, the price, the programme, the
  terms, the payment stages, the work by others, the acceptance block. The
  task is reading what one would get and sending it on, so it answers the
  questions a recipient brings to paper and no others, and its sections are
  a fixed list (`SCOPE` and `SENTENCED` in `document.tsx`) for that reason.
  It does not tell the asserted from the entailed; the first view does, one
  link away at the same item.
- *Along time.* The milestones, and the payment stages on them. The task is
  knowing what happens when.
- *To scale.* The car and the shaft, a plan and a section. The task is
  seeing whether it fits.
- *Compared.* Two moments, only the values that differ and whose choice
  each was. The task is deciding between offers, which two proposals side by
  side cannot answer.

Every view takes a moment. The default is the draft, the deal as it stands,
which moves as the person decides; the others are the issued offers, each
the document held still at the moment the seller committed to it
([Quoting](concepts/quoting.md)). A view over the draft is as available
halfway through as at the end, and its blanks are the point: the proposal
over a half-finished deal has gaps where the car size and the addressee go,
a presumed term and a running sum; the timeline has an order and nothing
after it; the drawing has a shaft and no car. Those are the gaps in the
seller's format, and the reason the views are worth opening early.

What is not a view sits above them all, the same in every view: where the
document stands. A draft, and why it cannot yet be issued; an offer, open
until a date; accepted; out of date since a value the person asked for moved
([Staling](syncs/staling.md)). The state is a fact of the deal, not a
projection of it, and the words for it are exact: *draft* and *as it stands*
name the moving moment, *quote* and *offer* name an issued one, and
accepting is a move on an issued one and nowhere else. The seller's figures
are read-only in every view; a person who wants a term changed hands the
document over ([Handover](syncs/handover.md)).

Editing lives in the view whose unit it is. A clause is typed in the first
view, where the clause is the line. A value is a gesture in any view that
shows it. The addressee is filled in the proposal, where a proposal puts it.
Requesting a quote is asking the seller to hold the current moment still, so
it is made from the draft, where the number will appear.

A view fills; it does not rearrange. Blanks take values, lines gain a reason,
a section that was one sentence grows a table. Which filter is on, and which
view and moment are open, are the reader's, and nothing in the state moves
them. A document that reshuffles under the person's hands is the arrangement
by extension the principle rules out.

So which view, which moment and which pair are compared are a viewer's
convenience held in the page's URL ([Links](#links)), not in the log, and
nothing on the page chooses a surface, because there is one. A comparison
has an address, so the assistant can put one in front of the person by
linking it without setting anything; if a party other than the viewer is to
set the view or the moment, that is a candidate concept. `Showing` and
`Framing` reach every view where their question applies: a facet is shown
beside an item wherever the item is, and the gap filter narrows the document
to what is still blank, which the proposal shows as blanks and the ledger as
lines with a gap.

## Links

Work on a configuration is shared by link: a person sends a colleague what
they are looking at, the assistant points at an item in a reply, and the
person's own agent, working over MCP, reports what it did in its own
chat with links back to the page. So the page's URL is its state. A link
names the place, and opening it shows the same place to whoever opens it.

The URL has two parts, and they name different things:

- *The fragment names an item*: `#variable:<name>`, `#clause:<id>`,
  `#choice:<id>`, `#quote:<id>:variable:<name>` and the rest in `address.tsx`.
  An item's address is what a link to the item carries, and nothing else, so
  following one never changes how the document is presented beyond opening
  a view that holds the item, when the one open does not, and, when a frame
  leaves the item out, taking the frame off.
- *The query names the view*, in words the page itself uses — which view,
  which moment, the frame, the facets shown, the grid, the comparison, the
  conversation (`link.tsx`).

Opening a link performs the gestures that bring the recorded view to what
the query says: `frame` or `unframe`, `show` and `hide`, each only
where the recorded view differs, so a reload records nothing. The same
happens when a link to this page is followed from the chat. A parameter that
is absent leaves its part of the view as it is: the view is a fact every
party shares, and a link that says nothing about it does not change it.
Going back through the browser's history follows the query too, but an
entry in the history was written by the page, which leaves out only
defaults, so there an absent parameter is its default. The rest are
viewer conveniences and are not recorded; an absent one is its default — the
draft, read against what was asked, compared with nothing, on
today's grid.

The page writes the view back into the address bar as it changes, whoever
changed it, so the address bar is always a link to what is on screen.
Defaults are left out of it. A change the person makes by navigating —
another view, another moment, a filter, a comparison — is
a new entry in the history, so the back button returns to where they were;
one another party makes replaces the entry. A link copied to send on spells
out every recorded part, defaults included, so whoever opens it sees exactly
this whatever their view was.

Links outlive their items. An item can be struck, withdrawn or never
issued, and a link to it still arrives somewhere: the page says, visibly and
to a screen reader, that nothing is at that address now, and stays where it
landed. Arriving by a link assumes nothing about how the person got there
(Nielsen 2002): the item is ringed and takes focus in its view, inside the
panel's header and its way around.

The addresses are kept. Each one is made of the page's own words — a
variable's name, a clause's id, a quote's id, a view's name — and never of
how the page is built, so none has to change when the implementation does
(Berners-Lee 1998). An address once given out goes on working; a scheme that
changes keeps the old form as an alias. A moment has a page of its own,
`/quotes/<id>`, the proposal as it prints, which is the link to send someone
who should read the offer and nothing else; the draft prints the same way,
marked as a draft where the number and the validity would be.

Readers off the page need links that work off the page. `review` and
`open_quote` give every unit its address under `at`, which the in-app chat
follows in place. The person's agent works in a chat of its own, where a
fragment means nothing, so the page's tools also give every unit its URL under
`link`, a quote's printable page under `page`, and every result the URL of
the view the call left under `here`. An agent that reports what it did links
the work it did.

Following Alfy (2025), the view is in the URL only as far as it is state:
nothing secret, nothing typed and unsent, nothing that changes by the
moment.

- Berners-Lee, T. (1998). *Cool URIs don't change*. W3C.
  <https://www.w3.org/Provider/Style/URI>
- Nielsen, J. (2002). *Deep linking is good linking*. Nielsen Norman Group.
  <https://www.nngroup.com/articles/deep-linking-is-good-linking/>
- Alfy, A. (2025). *Your URL is your state*.
  <https://alfy.blog/2025/10/31/your-url-is-your-state.html>

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

- Contrast between parts of the page comes from neutral levels, not colour,
  so a thing's place in the scale reads before its words do.
- Colour marks status, and only on a status badge (`tone.ts`): where the
  document stands. A badge in zinc alone is a dark block
  beside a dark button, so a status reads as a control. It is a tint
  instead: green where the person can go on, amber where something is in the
  way, blue where an offer waits for them. Everything else stays in zinc.
  Nothing on the canvas is an error: a conflict is a question put to the
  person, and an unmet assertion is on record waiting for that answer, so
  amber rather than red. On the item itself the words say it, and the
  question is put in the chat ([Moves](moves.md#the-conflict-as-the-worked-case)). A refusal in the log is an
  `outline` `Badge`, a permission working rather than a fault. `destructive`
  is kept for an action that destroys and for a request that failed.
- Nothing is smaller than 12px.
- No control is disabled. A disabled button takes neither pointer nor focus,
  so it cannot say why it will not act, and the person is left to guess
  (*Disabled Buttons UX*, Smart Interface Design Patterns, 2022,
  <https://smart-interface-design-patterns.com/articles/disabled-buttons/>).
  A control that cannot act yet stays in reach, says why, and does nothing
  when pressed; a form says what is missing when its button is pressed. The
  patterns are in `A11Y-DECISIONS.md`.

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

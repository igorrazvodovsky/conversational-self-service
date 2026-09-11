# Framing

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Framing [Lens, Frame]

purpose
  to let a viewer narrow what is shown to the items that bear on one
  question, and keep the choice

state
  framed: Lens -> Frame

actions
  frame [ lens: Lens ; frame: Frame ]
    => [ lens: Lens ; frame: Frame ]
    make the frame the lens's, replacing any it had

  unframe [ lens: Lens ]
    => [ lens: Lens ]
    remove the lens's frame, if it has one

operational principle
  after frame [ lens: w ; frame: [ by: "assertion" ; variable: building_type ] ]
    => [ lens: w ; frame: f ]
  then framed of w is f
  and after unframe [ lens: w ] => [ lens: w ]
  then w has no frame
```

A frame is a value the canvas interprets, as a facet is for
[Showing](showing.md). The concept holds it and decides nothing about what
it selects; that is the read side's, in `agent/views.py`. A lens with no
frame shows everything, which is the canvas as it was before this concept
existed.

## The one frame built, and why it is that one

`[ by: "assertion" ; variable: ?v ]` narrows the canvas to what followed
from one assertion: the assertion itself, every value that follows from it
by a rule, every open variable whose options it ruled out, and every
assertion it made unmet. The question it answers is *what did asking for a
hospital cost me*, and it is the question the design's one idea exists to
make answerable — a configurator that keeps the asserted and the entailed in
one field cannot ask it, and one that keeps them apart has been able to ask
it all along without a place to show the answer.

The read behind it is [Constraining](constraining.md)'s `following`, which
names the assertions a settled value rests on, and its `narrowing`, which
names the assertions that ruled an option out. Neither needed a new solver
call for the settled half: the core that settles a value already contained
the assumptions as well as the rules, and only the rules were being kept.

## What else a frame could be

A frame by *discipline* would be the buyer's cut — the six disciplines a
clause can belong to, with a variable joining one through the clause its
value answers. A frame by *clause* is the assertion frame one step up, read
through [Binding](binding.md). A frame by *audience* — the shaft for the
architect, the agreement for the facilities manager — is what the
proposal's sections already are, and naming audiences the case has not
observed is the kind of thing this repository declines. Each would be
another value of `Frame`, and none is built. The difference between two
quotes is not a frame either: it is a rendering of `differs` across a pair,
on the quote surface, and it is the person's alone to look at.

## Why this is a concept and not a filter control

For the reason [Showing's note](showing.md#why-this-is-shared-state-and-not-view-state)
gives: a rule lets the model do it. *Show me what followed from the
hospital* is a request the assistant should act on by narrowing the canvas,
not by listing eleven values in a chat bubble, and a thing the second root
actor may change belongs in the log with an actor and a provenance edge.
Two more rules keep the frame honest — a withdrawn assertion takes its frame
with it, and so does a discarded specification — which is the kind of
consequence a component's own state could not carry.

The sections survive a frame. Narrowed to the hospital, the canvas still
reads *asserted one, follows nine, still open two*, because what a frame
selects is items and what the sections say is what kind of fact each item
is. A frame that flattened the standing into a list would be the form again.

## Why it is not Showing, and not Moding

Three thin concepts on one workspace, and each answers a different
question. [Moding](moding.md): which artifact has the viewer's attention.
[Showing](showing.md): which facts about each item are shown. This one:
which items. Folding this into `Showing` would give its purpose an "and";
folding all three into an `Attending` would lose `Moding`'s guarantee that
exactly one surface is active. Recorded as the third candidate for the
unification [Theming](theming.md) notes, and declined for the same reason.

## See also

- [Showing](showing.md) — the sibling, and the argument for shared state this one borrows
- [Constraining](constraining.md#why-an-option-is-ruled-out-is-a-read) — `following` and `narrowing`, the reads behind the frame
- [Gestures](../syncs/gestures.md), [Conduct](../syncs/conduct.md), [Propagation](../syncs/propagation.md) — the six rules that reach it

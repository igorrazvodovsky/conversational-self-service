# Stepping

Where the person is in the job, what the step still needs, and who owns it.
See [the index](README.md).

## The rules

```
sync AStartedSpecificationGetsItsSteps
when  { Specifying/open: [ spec: ?s ] => [ spec: ?s ] }
then  { Stepping/instantiate: [ spec: ?s ] }

sync ADiscardedSpecificationLosesItsSteps
when  { Specifying/close: [ spec: ?s ] => [ spec: ?s ] }
then  { Stepping/abandon: [ spec: ?s ] }

sync APersonTakesAStep
when  { Copiloting/gesture: [ act: "take" ; spec: ?s ; step: ?st ] => [] }
then  { Stepping/take: [ party: person ; spec: ?s ; step: ?st ] }

sync ATakenStepFramesTheCanvas
when  { Stepping/take: [] => [ spec: ?s ; step: ?st ] }
then  { Framing/frame: [ lens: workspace ; frame: [ by: "step" ; step: ?st ] ] }

sync APersonFinishesAStep
when  { Copiloting/gesture: [ act: "finish" ; step: ?st ] => [] }
then  { Stepping/finish: [ party: person ; step: ?st ] }

sync APersonSkipsAStep
when  { Copiloting/gesture: [ act: "skip" ; step: ?st ; reason: ?r ] => [] }
then  { Stepping/skip: [ party: person ; step: ?st ; reason: ?r ] }

sync APersonReopensAStep
when  { Copiloting/gesture: [ act: "reopen" ; step: ?st ] => [] }
then  { Stepping/reopen: [ party: person ; step: ?st ] }

sync APersonReassignsAStep
when  { Copiloting/gesture: [ act: "reassign" ; step: ?st ; owner: ?o ] => [] }
then  { Stepping/reassign: [ party: person ; step: ?st ; owner: ?o ] }

sync APersonRenamesAStep
when  { Copiloting/gesture: [ act: "rename" ; step: ?st ; name: ?n ] => [] }
then  { Stepping/rename: [ party: person ; step: ?st ; name: ?n ] }

sync APersonAddsAStep
when  { Copiloting/gesture: [ act: "add" ; spec: ?s ; name: ?n ] => [] }
where { bind a fresh identity as ?st }
then  { Stepping/add: [ party: person ; spec: ?s ; name: ?n ; step: ?st ] }
```

The template the steps are made from arrives with the catalogue, by
[`TheCatalogueSetsTheSteps`](seeding.md), and the specification gets its
steps when it is opened, as it gets its selection. A step is one of a
template or one the person added; nothing else makes one.

## The map is not a script

Every rule above records what the person did and guards nothing. `take`
on a skipped step, `finish` on a step whose needs are open, `skip` of the
step the specification is at: each is recorded as asked, and no rule in
this application has a step's `status` in its `where`. That is the
constraint the catalogue puts on the composition, and it is what makes the
steps a map rather than the wizard's script. A rule that let a step gate
another concept's action would be a tightening, written by the seller and
visible in the trace as theirs; none is written.

What a step *needs* is a set of variable names, authored with the template
in the seller's job vocabulary. Whether a need is met is not a fact
`Stepping` holds: a need is *wanting* when its variable stands open, with
nothing asserted and nothing following, and that is a read over
`Asserting` and `Constraining`, named once in `readings.py` for the canvas
and the model alike. A value the rules force, or that
[Deriving](reading.md#a-quantity-is-worked-out) works out from a quantity
the words state, is never wanting, because it stands as a value before
anyone could ask for it; principle 5's *ask only what cannot be derived* is
met by the order the rules run in, not by a check.

## A step is a frame

Taking a step is one gesture with the whole canvas as its consequence:
the claim is recorded, and the canvas narrows to the variables the step
is about, the ones it still wants marked, with the requirements those
variables answer. A step is a kind of fact over the one list, as a gap
is, and it is read the same way: the frame is a value, interpreted by the
read side, and `Framing` holds one frame per lens as before. The gap
filters go on working inside the step, as the same value with a gap
beside the step, so *open within the shaft* is one frame and not two
concepts. Showing everything again is `unframe`, and it leaves the claim
standing: the step is still the one the person is at, pressed, with the
list no longer narrowed to it.

A frame on a step is not a take. The person's own agent, a link, or a
gesture on the filter row can frame a step, and the rule that brings the
canvas forward fires for each; only `take` records where the person is.
The model's `frame` tool does not yet take a step.

## Asking is a read

The catalogue has the asking policy as a rule that fires on `take` and
puts the question in the conversation. Here the model's reply is not a
rule's to make ([Moves](../moves.md#the-models-moves)), and a gesture
does not run the model, so the question is put when the model next has a
turn: `review` carries the steps, where the specification is at, and what
the step there still wants, and the prompt says to ask about that step and
only that. The facts the question rests on are state; the sentence that
asks it is the model's.

Where the person *is* is `at`, a claim they make by `take` and may revise.
Until they have made one, the specification is at no step, and the read
offers the first open step that still wants something as the place to
start; that is a suggestion in the view, recorded by nobody, and it
changes the moment the person takes a step of their own.

## Who owns a step

`owner` is a label, seeded from the template and changed by `reassign`.
In the catalogue it is a selector of rules: on a step the interpreter owns
a value lands, on one the buyer owns it is proposed and waits. No rule
here reads it yet. The model's permissions in [Conduct](conduct.md) are
the same on every step, and the person's delegation is set in their own
agent. When owner comes to select a rule, it will be a second `where` on
`TheModelMayAssertAValue`, and nothing in this note changes.

## What is not here

_No model permission._ The model has no `take`, `finish` or `skip`. Where
the person is in their own job is theirs to say, and a model that could
mark a step finished would be the one deciding the job is done, which
principle 9 keeps from it.

_No grouping of the ledger by step._ The catalogue records each entry
under the step it was bound at, and lays the specification out along that
skeleton. Here the ledger is one list, and a step is a frame over it: an
entry is read against the steps by its variable, through what each step
is about, not recorded under one. A requirement nothing answers belongs
to no step, so the unanswered gap within a step shows them all. `under`
and `fold` come in with a step-ordered ledger, if one is ever wanted.

_No `done` per step._ The template's advisory conjunct is, in this
catalogue, that every need is met, which is the read above with nothing
wanting. A separate predicate per step has nothing to say yet.

## See also

- [Stepping](../concepts/stepping.md) — the concept
- [Seeding](seeding.md) — the template arrives with the catalogue
- [Gestures](gestures.md) — the person's moves, as root actions
- [Conduct](conduct.md) — what the model may do, which no step changes

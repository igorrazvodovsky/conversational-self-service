# Conversing

A domain [concept](../method/concept.md) of the elevator configurator, taken
from the case's catalogue rather than from this repository's own reading of the
starter. It is the case's bootstrap concept, and the second of the two changes
that turn this build into slice 0 of its
[`Prototype plan`](../conceptual-model.md#9-against-the-cases-catalogue).

```
concept Conversing [Party]

purpose
  to carry what a party says into the system, in the order it was said

state
  utterances: seq Utterance
  by:         Utterance -> Party
  text:       Utterance -> string

actions
  say [ party: Party ; text: string ]
    => [ utterance: Utterance ; party: Party ; text: string ]
    append an utterance to the sequence,
    attributed to the party, carrying the text

operational principle
  after say [ party: p ; text: "hospital, six storeys" ]
    => [ utterance: u ; party: p ; text: "hospital, six storeys" ]
  then u is last in utterances
  and by of u is p
  and text of u is "hospital, six storeys"
  and after say [ party: q ; text: "which region?" ] => [ utterance: v ]
  then u precedes v in utterances
```

One action, and nothing else is promised. What an utterance *does* is decided
by the rules that read it, and at this slice exactly one rule touches it at
all — [`APersonSays`](../syncs/gestures.md), which carries a submitted chat
message here and stops.

## Why it is worth a concept when nothing reads it

A concept whose completions appear in no `when` looks like dead weight. It is
not, and the reason is the whole point of building it now.

The engine records every action with its actor and the rule that authorised
it, so the trace can already answer *what did the assistant do, and under which
permission*. What it could not answer was *what did the person say that the
assistant did it about*. The message lived in the framework's chat thread, and
the log's first entry for a turn was the model's tool call. The trace could
therefore say `Asserting/assert [building_type:hospital] via
TheModelMayAssertAValue` and could not say that the person had said "it's a
hospital, six storeys" a moment earlier — which is the record the case
[booked as the cost](../conceptual-model.md#9-against-the-cases-catalogue) of
having no concept for the model's reading of an utterance.

With this concept the turn reads in order, and the reading is legible as a gap
rather than as an absence:

```
Conversing/say      person   via APersonSays
Copiloting/invoke   model
Asserting/assert    model    via TheModelMayAssertAValue
```

Nothing in that trace says how the second line follows from the first, and
nothing should pretend to: it follows inside a language model, which is exactly
the finding. Slice 1 of the case's plan puts a `Reading.read` between them.

## Why one symmetric action rather than a request and a reply

`say` takes a party, and the party may be the person or the machine. The
precedent is Jackson's `Chat` in the GPT-powered tutor study — `post (party,
text)` over a `seq`, the bot's turns injected as ordinary messages — rather
than a paired `request`/`respond`.

Two of the three reasons the case gives already apply here. A conversation has
order, and the sequence is what a person scrolls. And the machine's own words
belong in the record: phrasing that answers a question and phrasing volunteered
unprompted are the same kind of thing to a person disputing what they were
told. The third reason — that the interpreter speaks unprompted, so a paired
`reply` would have no request to answer — is about rules this build does not
have.

Symmetry is therefore a property of the concept, and which party may speak is a
property of the rules. That is where the bootstrap lives: a person's `say` is
reached by a gesture and has no invocation above it, and this build has no rule
that makes the machine say anything.

## What is not here

_The machine's half of the conversation._ `say` accepts any party and no rule
invokes it with the machine. The assistant's replies are streamed by CopilotKit
and are in the framework's thread, not in this sequence — so the record is
one-sided, and the concept is not what makes it so. Nothing has to change here
to fix it; a rule does.

_An index._ The case instantiates this concept per specification and per
counterparty — `Conversing[?s, ?p]`, after the tutor study's
`UserPartChat` — because its unit of work is a document a buyer and a seller
share. This build has one specification, one workspace and one counterparty,
so it holds one sequence and lifts no index out. That is a scope decision of
the same kind as [having one unnamed specification](README.md#not-concepts),
and it is the point at which this note will need rewriting rather than
extending.

_What an utterance means._ No `discipline`, no `kind`, no candidate clause.
Reading an utterance for what it asks is the case's `Reading`, which is a
concept this build does not have — the reading happens inside the model, and
only its conclusions reach the log as
[assertions](asserting.md). Recording the utterance is what makes the size of
that gap measurable.

_A channel._ Typed prose, a structured form and a click on a rendered component
are all a person's `say` in the case's reading, and changing the channel would
change this concept and nothing else. Here only the chat box reaches it.

That last point is a divergence and not a detail. The case's
`Synchronisations` gives slice 0 a rule that this build does not have — a
person asserting from a rendered component does it *through* `Conversing/say`,
with structured text naming an attribute and a value, and `Asserting/assert`
follows from that. Here a click is a `Copiloting/gesture [act: "assert"]`
carried straight to `Asserting/assert` by
[`APersonAssertsAValue`](../syncs/gestures.md), and `Conversing` never sees it.
So the property this concept was built for — the log's first entry for a turn
is what the person said — holds for a typed turn and not for a click, which is
how most values here actually get set. It is
[written up as a finding](../conceptual-model.md#9-against-the-cases-catalogue)
in §9.3 rather than repaired, because repairing it is the chain §9.4 item 4
builds.

## See also

- [Copiloting](copiloting.md) — the bootstrap the stimulus arrives through
- [Gestures](../syncs/gestures.md) — `APersonSays`, the one rule that reads a chat message
- [Asserting](asserting.md) — what the model does with an utterance, with the reading missing in between
- The case's catalogue: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/Ontology/Concept catalogue/Conversing.md`

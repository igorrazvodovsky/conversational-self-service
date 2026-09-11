# Specifying

A domain [concept](../method/concept.md) of the elevator configurator, taken
from the case's catalogue, where it is a root: it makes sense with nothing else
present. It is the first half of the case's slice 1, with
[Binding](binding.md) as the second. 

```
concept Specifying [Spec, Party]

purpose
  to hold what a party requires, in their own words, as separate
  clauses each of which can be answered, relaxed, or deliberately
  left open

state
  open:          set Spec
  clauses:       Spec -> seq Clause
  text:          Clause -> string
  discipline:    Clause -> string
  statedBy:      Clause -> Party
  negotiability: Clause -> ("fixed" | "negotiable" | "open")
  formerly:      Clause -> seq string

actions
  open [ spec: Spec ]
    => [ spec: Spec ]
    add the spec to those open, with no clauses

  require [ spec: Spec ; party: Party ; text: string ;
            discipline: string ; negotiability: string ]
    => [ clause: Clause ; spec: Spec ]
    append a clause to the spec's sequence, carrying the text
    in the party's words, the discipline it belongs to, who
    stated it, and how firmly it is meant

  require [ spec: Spec ; party: Party ; text: string ;
            discipline: string ; negotiability: string ]
    => [ error: string ]
    if the spec is not open, or the text is empty,
    or the negotiability is not one of the three
    return the error description

  reword [ clause: Clause ; text: string ]
    => [ clause: Clause ; spec: Spec ]
    replace the clause's text with the new wording, as a correction:
    what it formerly said is not kept

  reword [ clause: Clause ; text: string ]
    => [ error: string ]
    if there is no such clause, or the text is empty
    return the error description

  classify [ clause: Clause ; discipline: string ]
    => [ clause: Clause ; spec: Spec ]
    record which discipline the clause belongs to, replacing what was recorded

  classify [ clause: Clause ; discipline: string ]
    => [ error: string ]
    if there is no such clause
    return the error description

  move [ clause: Clause ; before: Clause ]
    => [ clause: Clause ; spec: Spec ]
    place the clause immediately before the other in its spec's sequence,
    or last when no other is given

  move [ clause: Clause ; before: Clause ]
    => [ error: string ]
    if there is no such clause, or the other is not a clause of the same spec
    return the error description

  settle [ clause: Clause ; negotiability: string ]
    => [ clause: Clause ; spec: Spec ]
    record how firmly the clause is meant, replacing what was recorded

  settle [ clause: Clause ; negotiability: string ]
    => [ error: string ]
    if there is no such clause, or the negotiability is not one of the three
    return the error description

  relax [ clause: Clause ; text: string ]
    => [ clause: Clause ; spec: Spec ; formerly: string ]
    replace the clause's text with the new wording, keeping the old
    wording in the record of what it formerly said,
    and return the wording given up

  relax [ clause: Clause ; text: string ]
    => [ error: string ]
    if there is no such clause, or it is not negotiable,
    or the text is empty
    return the error description

  strike [ clause: Clause ]
    => [ clause: Clause ; spec: Spec ]
    remove the clause from its spec's sequence

  strike [ clause: Clause ]
    => [ error: string ]
    if there is no such clause
    return the error description

  close [ spec: Spec ]
    => [ spec: Spec ]
    remove the spec from those open, with every clause of it

operational principle
  after open [ spec: s ] => [ spec: s ]
  and require [ spec: s ; party: p ; text: "a bed must fit, with a porter" ;
                discipline: "building" ; negotiability: "fixed" ]
    => [ clause: c ; spec: s ]
  then c is last in clauses of s
  and text of c is "a bed must fit, with a porter"
  and statedBy of c is p
  and negotiability of c is "fixed"
  and relax [ clause: c ; text: "a bed must fit" ] => [ error: e ]
  and after settle [ clause: c ; negotiability: "negotiable" ] => [ clause: c ]
  and relax [ clause: c ; text: "a bed must fit" ]
    => [ clause: c ; spec: s ; formerly: "a bed must fit, with a porter" ]
  then text of c is "a bed must fit"
  and formerly of c is ["a bed must fit, with a porter"]
  and after reword [ clause: c ; text: "a bed must fit, lengthways" ] => [ clause: c ; spec: s ]
  then text of c is "a bed must fit, lengthways"
  and formerly of c is still ["a bed must fit, with a porter"]
  and after require [ spec: s ; party: p ; text: "1.6 m/s" ;
                      discipline: "performance" ; negotiability: "fixed" ]
    => [ clause: d ; spec: s ]
  and move [ clause: d ; before: c ] => [ clause: d ; spec: s ]
  then clauses of s is [d, c]
  and after strike [ clause: c ] => [ clause: c ; spec: s ]
  then clauses of s is [d]
```

## Why this is separate from Asserting

The two hold opposite things, and the case's catalogue names them apart.
[Asserting](asserting.md) holds a value in the
*model's* vocabulary: `rated_load` is `kg1000`. This concept holds a
requirement in the *buyer's*: *a bed must fit, with a porter*. Nothing here
names a variable, an option or a catalogue; the type parameters are the
specification and the party, and a clause is text.

The distance between those two vocabularies is the case's whole framing — the
contextual statement that the gap between how the buyer talks and how the model
is parameterised predicts friction better than industry does. A configurator
that has only the second vocabulary asks the buyer to translate before it will
listen, and then has no record of what the translation was *of*. That record
is [Binding](binding.md)'s `answers`, and it needs a clause to point at, which
is what this concept supplies.

The consequence worth stating: a clause is on record whether or not anything
answers it. A person can write *a bed must fit* before any car size is
buildable, and the specification then has a requirement nobody has met, which
the canvas shows as such. The catalogue calls this the requirement ledger, and
its purpose statement says why the silences matter as much as the entries — a
clause left open is a decision, not an omission.

## Why a clause has a discipline and a negotiability, and no quantity

The catalogue's `Specifying` gives a clause `text`, `quantity`, `class`,
`discipline`, `statedBy`, `serves`, `negotiability` and `formerly`. Four of
those are here.

`discipline` is which part of the job a clause belongs to — traffic and
performance, the building, safety and code, the car's interior, the commercial
terms. It is a fact of the requirement, stated by the party with the text, and
it is *not* the catalogue's family of a variable, though the two will often
coincide. A clause is grouped by what it is about before anybody knows which
variable will answer it.

`negotiability` is why [Asserting](asserting.md#why-there-is-no-prefer)
has no `prefer`: hard-or-soft belongs to the clause, not to the value. Three settings, from the catalogue: `fixed`, `negotiable`, and `open`
for a requirement the party has deliberately not made — *whatever the standard
finish is*. The third is the one the purpose statement is about.

`quantity` and `class` are not here, and for the same reason. A quantity
(*1.6 m/s*) is what `Reading.read` extracts from an utterance or
`Deriving.derive` computes with a tool; this slice has neither, so a quantity
is words in the text until one of them exists. A class is what `Mapping.map`
produces on the way to attributes; this slice's mapping is
[done by the person](../syncs/binding.md#the-person-maps), who picks an option
rather than naming a class. Both come with their slices, as state added to this
concept and nothing removed from it.

`serves` — the objective a clause serves — is left out with more regret. It is
what `OfferSubstitutes` needs before it may offer an alternative, and without
it the composition asks *what is this for* instead. 

## Why `relax` keeps the old wording and requires `negotiable`, and `reword` does neither

`relax` is the catalogue's action, with `formerly` as its record, and its
precondition is the catalogue's too. The point is that giving something up is
a different act from correcting a typo. A clause that reads *a bed must fit,
with a porter* and then reads *a bed must fit* has been relaxed, and the
proposal that goes out should be able to say so — which it can, because the
former wording is still on the clause.

A fixed clause cannot be relaxed. The way to change it is `settle` it
negotiable first, which is one more gesture and is meant to be: the person
is saying *this can give* before they say what it gives.

`reword` is the typo. It exists for the
[document editor](#the-specification-is-edited-as-a-document),
because free editing of a clause's text is neither of the two acts above, and
routing it through `relax` would have made every correction a concession and
every fixed clause uneditable. It keeps nothing: the log holds the old
wording, as it holds everything, but the clause does not, and the proposal
does not say *relaxed from*. Which of the two a person is doing is therefore
a thing they say — by editing the text, or by pressing *relax* — and not a
thing the concept infers from how much the words changed.

## The specification is edited as a document

<a id="the-specification-is-edited-as-a-document"></a>
The canvas renders this concept as a document: one block per clause, the
text editable in place, the rest of the clause — its discipline, its
negotiability, what answers it — shown beside the text and not editable as
text. The editor is [Tiptap](https://tiptap.dev), and it is a `Rendering`
in the case's sense: a component that shows the facts, and discarding it
loses nothing.

Three things follow, and the first is the one that matters. *The document is
never the state.* Its schema is a sequence of clause nodes and nothing else,
each node carrying the clause's identity as an attribute, and a transaction
in the editor is a stimulus, not a write: a node that appears is `require`,
a node that vanishes is `strike`, changed text is `reword`, a changed
discipline is `classify`, a changed order is `move`, and a changed
negotiability is `settle`. Holding the editor's JSON in a concept instead
would be a whole-list setter one level up — one write that says nothing
about which clause changed — and the argument against the
[model that had one](README.md#what-was-here-before) applies unchanged.

Second, *a clause keeps its identity through edits.* [Binding](binding.md)
points at a clause, so a node's identity is the clause's and not the
editor's, and deleting the text of a clause and typing new text is a
`reword` of the same clause, not a `strike` and a `require`. What the
editor cannot do is undo a strike, because the concept has no inverse for
it: a struck clause's answers are retracted by
[rule](../syncs/binding.md#what-takes-a-choice-away), and a clause typed
again afterwards is a new clause with none. 

Third, *order is a fact of the specification.* The catalogue holds `clauses`
as a set; this note holds a sequence, because a tender's clauses are
numbered and a person reordering them in a document is saying something.
`move` is the action, and of the three the document needs — `reword`,
`classify`, `move` — it is the one the catalogue may decline: a set with no
order is the cheaper concept, and whether a buyer ever reorders is something
slice 1 can observe.

`classify` is the smallest of the three. Without it the discipline is set
once by `require` and never changes, which a form does not notice and a
document does at once.

## Why the action is not called `state`

It is `state` in the catalogue, and the engine will not have it here, for the
reason [Naming](naming.md#why-the-action-is-not-called-name) gives for `name`:
every concept exposes its relations through a method called `state`, the
engine reads it for every view and every `where`, and an action dispatched
under that name would either shadow the read or be shadowed by it. Unlike
`assert`, it cannot be aliased after discovery, because the attribute is in
use. So the action is `require`, which is what a party does when they state
a clause, and this paragraph is the record that the name was the engine's
choice and not the concept's. The gesture is `require` too; the rule that
carries it is still `APersonStatesAClause`, because a rule is named for what
it is for.

## Why there is a `strike`

MSM §5.1.2's asymmetry test. `require` puts a clause on record; without `strike`
nothing takes one off, and a requirement the person no longer has would sit
in the specification forever, answered or not. The catalogue has no such
action, and this is a divergence for the case to classify — offered as
*grounded in the job*, since a tender's clauses are struck all the time.

What striking a clause does *not* do is withdraw the value that answered it.
The value was asserted, and an assertion stays on record until somebody
withdraws it. The [rule](../syncs/binding.md#a-struck-clause-releases-its-choices)
retracts the choice, so the canvas shows the value as asserted and answering
nothing, which is the honest state and the one the person can act on.

## Not in this concept

_What answers a clause._ `answers` is [Binding](binding.md)'s relation, and
this concept never sees a choice or a value. A clause here is complete on its
own.

_Whether a clause can be met._ Nothing here reads a catalogue or a solver. A
person may require a thing no lift can do; the clause is recorded, and whether
anything answers it is a question for the ledger read.

_Reading._ No action turns an utterance into a clause. Every clause here is
stated by a party in a form; the case's `Reading` is slice 2, and
[Conversing](conversing.md) holds the words it would read from.

_A situation._ The catalogue's `Specifying` keys a specification on a
`Situation`, and `Situating` holds the givens — rise, stops, power — apart
from the requirements. Here those are still variables of the specification,
and *six storeys* is a clause only if a person writes it as one.

## See also

- [Binding](binding.md) — the relation that points at a clause
- [Asserting](asserting.md) — the other vocabulary, and why they are two
- [The binding rules](../syncs/binding.md) — how a clause comes to be answered
- The case's catalogue: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/Ontology/Concept catalogue/Specifying.md`

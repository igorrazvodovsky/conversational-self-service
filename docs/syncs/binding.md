# Binding

How a clause comes to be answered, how an answer reaches the solver, and what
takes an answer away. See [the index](README.md).

These are the rules of the case's slice 1, written for a build in which the
person does the mapping. The case catalogue's chain for the same move is
`ProposeFromClause → MapProposed → ApplyMapping → AssertionReachesTheSolver`,
with a language model inside `Mapping.map`; here there is no `Mapping`, the
person's pick names the option, and the chain is shorter.

`Binding/propose` keeps the case catalogue's name. There an interpreter
proposes a choice and a person confirms it; here only a person's pick reaches
it, so every choice it records is already the person's. It is not the model's
`propose` tool, which reaches `Constraining/complete` and commits nothing
([Conduct](conduct.md#proposing-and-not-adopting)).

## A specification is opened and closed in several concepts at once

```
sync AStartedSpecificationIsOpened
when  { Asserting/start: [ spec: ?s ] => [ spec: ?s ] }
then  { Specifying/open: [ spec: ?s ] ;
        Binding/begin: [ spec: ?s ; offering: catalogue ] }

sync ADiscardedSpecificationIsClosed
when  { Asserting/discard: [ spec: ?s ] => [ spec: ?s ] }
where { Binding: { ?sel for: ?s } }
then  { Specifying/close: [ spec: ?s ] ;
        Binding/abandon: [ selection: ?sel ] }
```

## A person answers a clause

<a id="a-person-answers-a-clause"></a>
```
sync APersonAnswersAClause
when  { Copiloting/gesture: [ act: "answer" ; spec: ?s ;
          clause: ?c ; option: ?o ] => [] }
where { Binding: { ?sel for: ?s }
        no choice of ?sel answers ?c }
then  { Binding/propose: [ party: person ; selection: ?sel ;
          requirement: ?c ; value: ?o ] }

sync APersonSubstitutesAnAnswer
when  { Copiloting/gesture: [ act: "answer" ; spec: ?s ;
          clause: ?c ; option: ?o ; reason: ?why ] => [] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                   ?ch answers: ?c ; ?ch value: ?v }
        ?v is not ?o }
then  { Binding/substitute: [ party: person ; choice: ?ch ;
          value: ?o ; reason: ?why ] }
```

One gesture, a rule for each case, and which fires is a fact of the state: a clause
nobody has answered gets a `propose`, a clause already answered gets a
`substitute` with `replaces` and a reason. Answering a clause with the value
it already has fires neither, which is the ordinary meaning of a `where` that
does not bind.

## The person maps

<a id="the-person-maps"></a>
```
sync AChoiceReachesTheAssertions
when  { Binding/propose: [] => [ choice: ?ch ; selection: ?sel ;
          value: ?o ; party: ?p ] }
where { Binding: { ?sel for: ?s }
        Cataloguing: { ?v offers: ?o } }
then  { Asserting/assert: [ party: ?p ; spec: ?s ;
          variable: ?v ; option: ?o ] }

sync ASubstituteReachesTheAssertions
when  { Binding/substitute: [] => [ choice: ?ch ; selection: ?sel ;
          value: ?o ; party: ?p ] }
where { … as above … }
then  { Asserting/assert: [ party: ?p ; spec: ?s ;
          variable: ?v ; option: ?o ] }
```

The case catalogue's `ApplyMapping` fires on a `Mapping/map` completion carrying
attribute–value pairs. Here the value *is* an option, the variable that offers
it is a read of [Cataloguing](../concepts/cataloguing.md), and the mapping is
the identity — which is what *mapping is done by the person* means in code.
That is a finding and not a shortcut: a choice whose value is already in
the model's vocabulary restates the value, and whether `answers` is worth a
relation on its own is what slice 1 measures.

From `Asserting/assert` on, one thing is new: the value reaches
[Constraining](../concepts/constraining.md) hard through
`AssertionsReachTheSolver`, or softly through
`ANegotiableAnswerReachesTheSolverSoftly` when every clause it answers is
negotiable, and which is read from the clause
([Propagation](propagation.md#assertions-reach-the-solver)). A conflict comes
back through `Deciding`, and the canvas reads the provenance edge. The edge
for a value that answers a clause is `AChoiceReachesTheAssertions`, which is
another sentence beside *you asked for this*, *the assistant asked for this*
and *adopted from a proposal*: *answers a requirement*.

## What takes a choice away

<a id="what-takes-a-choice-away"></a>
```
sync AWithdrawnValueRetractsItsChoices
when  { Asserting/withdraw: [ spec: ?s ] => [ spec: ?s ; option: ?o ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch value: ?o } }
then  { Binding/retract: [ choice: ?ch ] }

sync AnOverwrittenValueRetractsItsChoices
when  { Asserting/assert: [] => [ spec: ?s ; variable: ?v ; option: ?o ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch value: ?o' }
        ?o' is not ?o
        Cataloguing: { ?v offers: ?o' } }
then  { Binding/retract: [ choice: ?ch ] }

sync AStruckClauseReleasesItsChoices
when  { Specifying/strike: [ clause: ?c ] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch answers: ?c } }
then  { Binding/retract: [ choice: ?ch ] }
```

Consequences, with no gesture behind them. A choice is the *current* answer
to a clause, and it stops being current in these ways: the value it holds is withdrawn, a
different value is asserted for the same variable — by the person on the
canvas, by the model on their behalf, or by an adopted completion — or the
clause it answers is struck. Each is the §6.5 shape, one binding per choice,
`then` once per binding.

`AnOverwrittenValueRetractsItsChoices` is the one to read twice. The model may still assert a value with
no clause behind it, and when it does so on a variable whose value answered a
clause, the person's answer is retracted and the clause shows as unanswered
again. That is correct: the value the person chose *for that reason* is
gone, and a ledger that went on saying the clause was answered would be
lying. It is also the case's constraint 7 — every interpreter-made selection
visible and reversible — met by a rule rather than by a gate, and the
provenance edge on the `retract` says which assertion did it.

`AStruckClauseReleasesItsChoices` does *not* withdraw the value. Striking a requirement is not the
same act as taking back a value: the value was asserted, and an assertion
stays on record until somebody withdraws it. What the strike does change is
the value's strength, when the struck clause was negotiable: with no clause
behind it the value is an ordinary assertion, and
`ARetractedChoiceHardensItsValue` ([Propagation](propagation.md)) carries it
to the solver hard.

Nothing carries a `Binding/retract` back into `Asserting`. A retraction is a
consequence of an assertion changing, never a cause of one, and that
asymmetry keeps the two concepts from chasing each other round a loop.

## The ledger is a read

<a id="the-ledger-is-a-read"></a>
No action lists the clauses with their answers. It is a calculation over
several concepts' exposed state, in `agent/views.py`, on the read side of WYSIWID §6.4's line:

```
ledger(s)   =  for each clause c in Specifying.clauses(s), in order:
                 text, negotiability, statedBy, formerly,
                 and the choices ch of Binding's selection for s with answers(ch) = c,
                 each with its value, the variable Cataloguing says offers it,
                 who decided it, what it replaced and why,
                 and a standing read against Asserting and Constraining:
                   asked   if the value is asserted and met, and settled on
                   yielded if the value is asserted and met, and not settled on
                   unmet   if the value is asserted and not met
                 (met as Propagation defines it: assumed, or inclined with
                  nothing refused against the variable)

unbound(s)  =  { v | Asserting asserts o for v in s, and no choice holds o }
```

`unbound` is the plan's control number. A variable asserted with no clause
behind it is a value in the model's vocabulary that answers nothing — which
is every value in slice 0. The canvas shows the clause beside the value where
there is one, and shows *answers nothing* where there is not, so the share is
something a person can see rather than something a script has to count.

The same read, frozen, goes into a quote. The item a quote holds gains the
clauses as they stood at issue, each with the option that answered it, and
the proposal's *basis of design* renders from those — the customer's words
first, the catalogue's context values after — so that the document a person
reads shows what was asked beside what is offered. That is the trace from
output to intent the case's traceability note asks for, structural rather
than computed: a line in the proposal, the choice it froze, the clause the
choice answers, and the party who stated it.

## See also

- [Gestures](gestures.md) — the acts that reach `Specifying`, and the one that reaches `Binding`
- [Propagation](propagation.md) — where an assertion goes from here
- [Conduct](conduct.md) — the rule that does not exist: no `Copiloting/invoke` reaches either concept
- [Specifying](../concepts/specifying.md) · [Binding](../concepts/binding.md)

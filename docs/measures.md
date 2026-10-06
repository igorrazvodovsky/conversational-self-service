# The measures

What the case's plan counts to judge slices 1 and 2, as reads over the
log. Each rung of the plan is a test as well as a build, and a rung whose test
cannot be counted cannot be failed. Slice 1 asks whether a person, offered a
place to say what a value is for, uses it; slice 2 asks how often a reading
the model landed unasked is one the person disowns. Both answers are already
in the log, as provenance edges, and this note says how to read them.

This is a read note, like [the ledger](syncs/binding.md#the-ledger-is-a-read).
It changes no concept, action or rule, and it is computed in
`agent/measures.py` and served at `GET /configurator/measures`. The route is
reachable through the frontend's proxy like any other read; nothing on the
page, in the digest or among the tools reads it.

## Nobody being measured sees the measures

The measures are not on the canvas, not in the digest, and not among the
model's tools or the person's own agent's. A model told its own disown rate reads
more cautiously, and a person shown theirs strikes differently; either would
change the thing being counted. The canvas already shows each fact the
measures count — *No stated requirement* above an unbound value, *Keep*
beside a reading still the assistant's — one at a time, where it is a fact to check
and not a score.

## The records, linked by the edge

Every record below is a completion after the boot mark whose output carries
no error, in the specification its input or output names. Records are linked
by `after`, the completion a rule reacted to, and never by flow and words:
the edge is exact, and a match on words is a guess the read side makes only
where it has no edge.

```
read(i)      =  the Reading/read completion that heard item i
clause(i)    =  the Specifying/require with via AReadItemBecomesAClause
                and after read(i)
choices(i)   =  the Binding/propose completions with via AReadAnswerIsProposed
                and after clause(i)
words(c)     =  the text of c's require, then of each reword or relax of c, in order
stater(c)    =  the party on c's require
```

The person's own agent acts as the person
([Conduct](syncs/conduct.md#the-persons-own-agent-acting-as-the-person)), so
what it states, answers, adopts or withdraws counts as the person's here:
the party on the record is the person's, and so is the decision to delegate.
Where the case needs the human apart from their agent, the actor on the
root action says which, and no measure below reads it yet.

## Slice 1 — whether a value answers a requirement

```
origin(a)   =  for each Asserting/assert a in s:
                 answers, stated by stater(c)
                           if a.via is AChoiceReachesTheAssertions
                           or ASubstituteReachesTheAssertions,
                           where c is the requirement of the completion a.after names
                 asked, by a.actor
                           if a.via is APersonAssertsAValue
                           or TheModelMayAssertAValue
                 adopted   if a.via is AnAdoptedValueBecomesAnAssertion

standing(s) =  for each variable v that Asserting asserts o for in s, now,
               with C the clauses answered by choices of Binding's selection
               for s that hold o:
                 answers, stated by the person
                           if some c in C has stater(c) the person
                 answers, stated by the model
                           if C is not empty, and none was stated by the person
                 unbound   if C is empty
```

One value can answer several clauses, since a later choice of the same
option takes nothing away: the person's *a bed must fit* and the model's
reading of a document can both be answered by 1250 kg. Such a value is the
person's if any of its clauses is, whichever came first.

`standing` is the headline and `origin` the history: a withdrawal erases a
value from `standing` and leaves its assertion in `origin`. Both are split by
who stated the clause. Slice 2 is live and ungated, so a reading states a
clause and asserts its answer in one root action; a share that pooled the
model's clauses with the person's would count how much the model read, and
slice 1's question is about the person. The figure that answers it is the
share of current values that answer a clause the person stated. Slice 0, the
control, has no clause to answer, and its share is nothing by construction.

Whether a clause states a requirement or restates its value — *1000 kg* as
the clause for 1000 kg — is a judgment, and nothing here makes it. The read
lists each current value beside the words of every clause the person stated
that it answers, so whoever judges reads the pairs.

## Slice 2 — what became of a reading

```
fates(i)    =  for clause(i) = c, each that applies:
                 struck       a Specifying/strike of c
                 reworded     a Specifying/reword of c
                 relaxed      a Specifying/relax of c
                 re-answered  a Binding/substitute by the person
                              of a choice in choices(i)
                 withdrawn    a Binding/retract of a choice in choices(i)
                              with via AWithdrawnValueRetractsItsChoices,
                              after a withdraw whose actor is the person
                              or the person's own agent
                 displaced    a Binding/retract of a choice in choices(i)
                              with via AnOverwrittenValueRetractsItsChoices
                 withdrawn by the model
                              as withdrawn, after a withdraw by the model
                 conceded     as withdrawn, after a withdraw with via
                              TheConcededAssertionIsWithdrawn, whoever
                              chose the concession
                 found nothing
                              choices(i) is empty
                 missed       choices(i) is empty, and a Binding/propose
                              by the person answers c
```

An item can carry several fates, and each is counted where it falls. The
fates group by what they argue for:

- *Disowned at the clause*: struck, reworded or relaxed. The model read the
  words wrong, or read words that state no requirement. A high share argues
  for a gate on the clause.
- *Disowned at the answer*: re-answered or withdrawn. The words were right
  and the option was not. A high share argues for a gate on the answer only,
  which is a cheaper gate.
- *Not disowned*: displaced, withdrawn by the model, and conceded.
  Displacement is a later requirement winning on the same variable, which the
  person may have meant. A withdrawal by the model runs in a flow the
  person's words opened whether or not they asked for it, so the log cannot
  tell *at the person's word* from *unasked*. A concession is the person
  giving the value up to end a conflict: the reading may have been wrong, or
  right to its source and unbuildable beside the rest, as a bed car at a load
  the catalogue cannot build is. The log cannot tell those apart either. Each
  is reported apart and in neither share.

A conceded value withdrawn under `withdrawn` would count an unbuildable
requirement as a misreading, so the fates are tested in that order: the rule
that withdrew the value first, its actor after.

The disown rate is the share of items stated as clauses that are disowned at
either level, split by whether the source was a file or the person's words.
`missed` is the share of items that found nothing whose clause the person
then answered: the model's claim that the catalogue holds nothing, refuted.

## What the log cannot see

Every fate is something a party did to a clause or its answer. Two outcomes
leave nothing to read. A requirement the source states and the model never
read has no item, so it is in no denominator. A reading that is wrong and
that nobody touched stands with no fate, and counts as not disowned. A
wrong value asserted beside a right one, from the same words, is the second
kind. Both are found only by reading the sources against the ledger, which
the canvas lays side by side for exactly that; the disown rate is a floor on
how often a reading is wrong, not an estimate of it.

## Per specification

Every figure is per specification, and a discarded specification is
reported with the rest, marked as no longer open. Its `standing` is empty,
since nothing is asserted of it, and its history and readings stand.

## See also

- The case's `Prototype plan.md` — the ladder whose tests these are
- [Reading](syncs/reading.md#the-gate-is-a-rule-and-it-is-not-written) — why the reading is ungated, and what the disown rate decides
- [Binding](syncs/binding.md#the-ledger-is-a-read) — `unbound`, which `standing` generalises
- [The moves](moves.md) — what either party can do, which these count after the fact

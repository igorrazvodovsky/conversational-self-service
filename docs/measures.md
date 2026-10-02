# The measures

What the case's plan counts to judge its first two slices, as reads over the
log. Each rung of the plan is a test as well as a build, and a rung whose test
cannot be counted cannot be failed. Slice 1 asks whether a person, offered a
place to say what a value is for, uses it; slice 2 asks how often a reading
the model landed unasked is one the person disowns. Both answers are already
in the log, as provenance edges, and this note says how to read them.

This is a read note, like [the ledger](syncs/binding.md#the-ledger-is-a-read).
It changes no concept, action or rule, and it is computed in
`agent/measures.py` and served at `GET /configurator/measures`.

## Nobody being measured sees the measures

The measures are not on the canvas, not in the digest, and not among the
model's tools or the browser agent's. A model told its own disown rate reads
more cautiously, and a person shown theirs strikes differently; either would
change the thing being counted. The canvas already shows each fact the
measures count — *answers nothing* beside an unbound value, *the assistant
read this* beside a read clause — one at a time, where it is a fact to check
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

standing(s) =  for each variable v that Asserting asserts o for in s, now:
                 answers, stated by stater(c)
                           if a choice of Binding's selection for s holds o
                           and answers c
                 unbound   otherwise
```

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
lists each current value that answers a person's clause beside that clause's
words, so whoever judges reads the pairs.

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
                 displaced    a Binding/retract of a choice in choices(i)
                              with via AnOverwrittenValueRetractsItsChoices
                 withdrawn by the model
                              as withdrawn, after a withdraw by the model
                              or a browser agent
                 found nothing
                              choices(i) is empty
                 missed       choices(i) is empty, and a Binding/propose
                              by the person answers c
```

An item can carry several fates, and each is counted where it falls. Three
groups matter, because they argue for different things:

- *Disowned at the clause*: struck, reworded or relaxed. The model read the
  words wrong, or read words that state no requirement. A high share argues
  for a gate on the clause.
- *Disowned at the answer*: re-answered or withdrawn. The words were right
  and the option was not. A high share argues for a gate on the answer only,
  which is a cheaper gate.
- *Not disowned*: displaced, and withdrawn by the model. Displacement is a
  later requirement winning on the same variable, which the person may have
  meant. A withdrawal by the model runs in a flow the person's words opened
  whether or not they asked for it, so the log cannot tell *at the person's
  word* from *unasked*; it is reported apart and in neither share.

The disown rate is the share of items stated as clauses that are disowned at
either level, split by whether the source was a file or the person's words.
`missed` is the share of items that found nothing whose clause the person
then answered: the model's claim that the catalogue holds nothing, refuted.

## Per specification

Every figure is per specification, and a discarded specification is
reported with the rest, marked as no longer open. Its `standing` is empty,
since nothing is asserted of it, and its history and readings stand.

## See also

- The case's `Prototype plan.md` — the ladder whose tests these are
- [Reading](syncs/reading.md#the-gate-is-a-rule-and-it-is-not-written) — why the reading is ungated, and what the disown rate decides
- [Binding](syncs/binding.md#the-ledger-is-a-read) — `unbound`, which `standing` generalises
- [The moves](moves.md) — what either party can do, which these count after the fact

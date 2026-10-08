# Staling

What is marked out of date, by which change, and who takes the mark off.
See [the index](README.md).

## The rules

```
sync AChangedClauseStalesItsAnswers
when  { Specifying/reword: [] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch answers: ?c } }
then  { Staling/flag: [ item: ?ch ; basis: [ clause: ?c ] ] }

sync AChangedClauseStalesItsAnswers
when  { Specifying/relax: [] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch answers: ?c } }
then  { Staling/flag: [ item: ?ch ; basis: [ clause: ?c ] ] }

sync AMovedAssertionStalesTheOpenOffers
when  { Asserting/assert: [] => [ spec: ?s ; variable: ?v ; option: ?o ] }
where { Quoting: { ?q from: ?item ; ?q issuedTo: person }
        ?item is [ spec: ?s ; holds: ?holds … ]
        ?holds maps ?v to ?was, and ?was is not ?o
        ?q is in neither Quoting.committed nor Quoting.revoked }
then  { Staling/flag: [ item: ?q ; basis: [ variable: ?v ] ] }

sync AMovedAssertionStalesTheOpenOffers
when  { Asserting/withdraw: [] => [ spec: ?s ; variable: ?v ] }
where { Quoting: { ?q from: ?item ; ?q issuedTo: person }
        ?item is [ spec: ?s ; holds: ?holds … ]
        ?holds maps ?v to something
        ?q is in neither Quoting.committed nor Quoting.revoked }
then  { Staling/flag: [ item: ?q ; basis: [ variable: ?v ] ] }

sync APersonClearsAStaleItem
when  { Copiloting/gesture: [ act: "clear" ; item: ?i ] => [] }
then  { Staling/clear: [ party: person ; item: ?i ] }
```

Two rules with two triggers each, as
[`AResolvedConflictWithdrawsItsQuestion`](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)
is, and one gesture.

## What has a basis here

An item is stale when something it was decided against has changed and the
item has not. Two kinds of item meet that description in this application,
and each has one kind of basis.

*An answer, when its requirement is reworded or relaxed.* A choice is the
current answer to a clause, and the clause is what it was chosen for. Strike
the clause and the choice goes
([Binding](binding.md#what-takes-a-choice-away)); reword it and the choice
stays, answering words that are not the ones it answered. *630 kg is enough*
answered with the 630 kg car, then reworded to *800 kg is enough*, still
shows the 630 kg car as its answer, and a ledger that showed it without
comment would be re-deciding the answer on the person's behalf. The first
rule marks the choice, with the clause as the basis, and the mark says on
the line: *the requirement changed since this was chosen*. The same holds
for a reading the person rewords: rewording keeps it as theirs
([Reading](reading.md#the-person-keeps-a-reading)), and the answer the
model proposed for the old words is stale against the new.

*An open offer, when what was asked for moves.* A quote freezes the values as
they stood, and the specification moves on without changing it
([Quoting](../concepts/quoting.md)). What the person asked for since is the
basis the offer was made on, and an assertion that moves or goes marks every
offer still open to them for the job, with the variable as the basis. The
second rule reads the offer's frozen item for whether that variable was in
it, and fires only when the value differs, so re-asserting what the offer
already holds marks nothing.

The basis is the assertion, not the solver's outcome. A value that follows
may move too when an assertion does, and the quote's `differs` says which;
that is the detail beside the mark, read from the frozen item against the
state and maintained by nobody. The mark is the fact that the offer's basis
moved and nobody has looked, and it does not go away when the value moves
back, which is the concept's purpose: an item reads current again only after
`clear`, never because something was recomputed.

## Who clears, and who does not

Only the person. `APersonClearsAStaleItem` is the one way a mark comes off,
and there is no `TheModelMayClear`. The purpose of the concept is that an
item the person committed is not re-decided without them, and a model that
could clear the mark would be the one re-deciding it. The person clears an
answer by keeping it as it stands, or by substituting another, which is a
new choice with no mark; they clear an offer by noting that it moved, or by
requesting a fresh one, which revokes it
([Propagation](propagation.md#a-new-quote-supersedes-the-open-ones)).

A mark changes nothing it is on. A stale answer still answers, still reaches
the solver at the strength its clause gives it, and still counts for a
quote; a stale offer can still be accepted as issued, since the offer is the
seller's and holds whatever the person has done since. The mark is
information beside the item, which is the whole of what the catalogue asks of
it. That is also why the model's reply may say the offer is out of date and
may not take the mark off.

## What is not here

_No rule clears a mark on an item that is gone._ A choice retracted, or an
offer revoked or committed, keeps its mark in `Staling`. The read side shows
a mark only beside an item that still stands, and the record of what was
stale when is the log's. A rule that cleared the mark would have to name a
party who did not act, and `clear` takes one.

_Nothing marks a value that follows._ What the rules force from an assertion
is recomputed on every change by design, and recomputation is the thing a
mark exists to tell apart from a decision. A followed value has no basis of
its own; the assertion it rests on does.

_Nothing marks a reading._ A clause read from a document does not go stale
when the document does, because the document is kept as it was brought
([Filing](../concepts/filing.md)) and a later document is a later source.

## See also

- [Staling](../concepts/staling.md) — the concept
- [Binding](binding.md) — what takes a choice away, as against what marks it
- [Propagation](propagation.md#a-new-quote-supersedes-the-open-ones) — a fresh quote revokes the open ones
- [Gestures](gestures.md) — the person's moves, as root actions

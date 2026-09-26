# Reading

How a source becomes requirements: the model's reading of a document or of
the person's words, recorded as a reading, then stated as clauses and
answered from the catalogue. See [the index](README.md).

These are the rules of the case's slice 2, written for the composition this
repository keeps: the model is a root actor, and its reading is a tool call
that records what it perceived. The case's `Hear` invokes `Reading/read` from
a rule with a language model inside the action; here the model calls `read`
once per requirement it perceives, and the rules take the reading from there.
A document is the case's *foreign document* row: the same rules, with a file
as the source instead of an utterance.

## A document enters

```
sync APersonFilesADocument
when  { Copiloting/gesture: [ act: "file" ; name: ?n ; text: ?t ] => [] }
then  { Filing/file: [ party: person ; name: ?n ; text: ?t ] }
```

A file attached to a chat message is a stimulus of the same kind as the
message, and enters the same way: `agent/hearing.py` performs the `file`
gesture beside the `say`, in the flow the message opened, before the model
is asked what to do about either. The text is extracted there, since
[Filing](../concepts/filing.md) holds words and not bytes, and a file nothing
can be read from is refused by the concept.

The model reads a filed document from the log and not from the transport.
`open_file` in `agent/tools.py` returns `Filing`'s text for a file, as
`review` returns the digest, so what the model was given when it read is on
record and can be checked against what it read.

## The model reads

```
sync TheModelMayReadARequirement
when  { Copiloting/invoke: [ tool: "read" ; file: ?f ;
          words: ?w ; answer: ?a ] => [] }
then  { Reading/read: [ source: [ file: ?f ] ; words: ?w ; answer: ?a ] }

sync TheModelMayReadARequirement
when  { Copiloting/invoke: [ tool: "read" ; utterance: ?u ;
          words: ?w ; answer: ?a ] => [] }
then  { Reading/read: [ source: [ utterance: ?u ] ; words: ?w ; answer: ?a ] }
```

One rule with two triggers, on the shape of the source. The utterance is the
one that opened the turn, handed to the tool by `agent/hearing.py` as the
flow token is, so a reading of the person's words names the words it read.
A call with no file and no utterance, a browser agent's, reads nothing:
there is no source to check it against.

`answer` is the set of catalogue options the model took to answer the words,
and it may be empty. That is the model's claim, recorded as such in
[Reading](../concepts/reading.md), and it is the record the rest of this
note reads.

## A reading becomes a clause, and its answer a choice

```
sync AReadItemBecomesAClause
when  { Reading/read: [] => [ item: ?i ; words: ?w ] }
where { Specifying: { ?s in open } }
then  { Specifying/require: [ spec: ?s ; party: model ; text: ?w ] }

sync AReadAnswerIsProposed
when  { Specifying/require: [ party: model ] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s }
        Reading: { ?i words: ?w ; ?i answer: ?a* }
          for the item most recently heard whose words are the clause's text
        ?o in ?a*
        Cataloguing: { ?v offers: ?o } }
then  { Binding/propose: [ party: model ; selection: ?sel ;
          requirement: ?c ; value: ?o ] }
```

From `Binding/propose` on, nothing is new: `AChoiceReachesTheAssertions`
asserts the value with the model as party, the assertion reaches the solver
through [Propagation](propagation.md), and a value that cannot be met comes
back as a question through `Deciding`. A clause read from a document lands in
the same ledger as one the person typed, answered by the same kind of choice,
with the standing the ledger already computes. What tells them apart is
`statedBy` and the provenance edge, and the canvas reads both: *the assistant
read RFQ 2026-04.pdf, "a bed must fit, with a porter", as 1250 kg*.

The second rule's `where` binds the item by its words rather than by a
conjunction of the two completions, which the engine does not offer. The two
are one occasion all the same: a root action is atomic, the `require` is
invoked by the rule on the `read`, and the item most recently heard with
those words is, at that moment, the one. An option the catalogue does not
offer binds no variable and is not proposed.

## The gate is a rule, and it is not written

A reading lands at once. Nothing waits for the person to adopt it: the
clause is stated, the answer asserted, and the person corrects by striking
the clause, answering it with another option, or withdrawing the value, each
of which is a gesture that already exists. Everything the model read is
attributed to it and cited to its source, and a value the reading asserted
that cannot be met is a question the person answers, so the gate that the
case's `Suggesting` supplies is here supplied by visibility and reversibility.

The gated form is the same two rules with one trigger moved. `AReadItemBecomesAClause`
would fire on `Deciding/choose` of a request naming the item, with a request
per item and one for the whole reading, exactly as a proposed completion is
put to the person in [Conduct](conduct.md#proposing-and-not-adopting). The
case's plan asks for the ungated form first, so that how often a read clause
is disowned can be counted before a gate is paid for, and that count is a
read over the log: readings whose clause was struck.

## What the reading cannot say, and what is read instead

A read item with no answer is the model's claim that nothing in the catalogue
answers those words. Whether the claim is right is not a fact any rule can
establish, and none does. What happens next tells the two cases apart, as
reads over `Reading` and `Binding`:

- The person answers the clause on the canvas. The choice is theirs, the
  item's empty answer stays on record beside it, and the miss is countable.
- Nobody answers it. The clause stays in the ledger with its source, goes into
  a quote's basis of design unanswered, and is the thing a seller reads. A
  choice whose value is not a catalogue option would answer it and reach no
  solver, which the ledger's `unrealisable` standing already names.

The canvas shows the first as answered and the second as *the assistant found
nothing in the catalogue for this*, beside the same answer control the person
uses on any clause.

## A later requirement displaces an earlier one

No rule here. Two clauses answered on the same variable, one read from the
document and one from what the person said after, meet in `Asserting`, which
holds one value per variable; the later assertion replaces the earlier, and
`AnOverwrittenValueRetractsItsChoices` ([Binding](binding.md#what-takes-a-choice-away))
takes the earlier clause's choice away. The earlier clause reads as no longer
answered, and the canvas says what displaced it, from the provenance edge on
the retraction and the reading in that flow: *displaced when the assistant
read "make it faster" as 1.6 m/s*. Striking or relaxing the earlier clause
stays the person's gesture, since no rule carries a tool call to
`Specifying/strike`.

## What the canvas reads

The source of a clause is a read over the log, as the words behind an
assertion are: the `require` that stated it carries the rule's name, and the
`read` in the same flow carries the source and the words. The sources
themselves are `Filing` and `Conversing`, and beside each the canvas lists
what was read from it and what became of each item, so a reading can be
checked against its source whole.

## See also

- [Conduct](conduct.md) — the model's other permissions, and the absences this note narrows
- [Gestures](gestures.md) — the `file` act beside `say`
- [Binding](binding.md) — where a proposed answer goes, and what takes it away
- [Reading](../concepts/reading.md) · [Filing](../concepts/filing.md)

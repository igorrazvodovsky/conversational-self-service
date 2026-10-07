# Reading

How a source becomes requirements: the model's reading of a document or of
the person's words, recorded as a reading, then stated as clauses and
answered from the catalogue. See [the index](README.md).

These rules are written for the composition this repository keeps: the model
is a root actor, and its reading is a tool call that records what it
perceived. The case's `Hear` invokes `Reading/read` from a rule with a
language model inside the action; here the model calls `read` with an item per
requirement it perceives, every item invoked on its own, and the rules take
the reading from there.
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

The attachment itself never reaches the model. Before every model call,
`agent/hearing.py` puts a line naming the document in place of the file in
the message, and the model opens the text from the log. So the words it
quotes are `Filing`'s, which are the words `TheModelMayReadARequirement`
checks them against, and a format the model's provider would refuse cannot
fail the turn once the document is filed.

## The model reads

```
sync TheModelMayReadARequirement
when  { Copiloting/invoke: [ tool: "read" ; file: ?f ;
          words: ?w ; answer: ?a ; states: ?q ] => [] }
where { Filing: { ?f text: ?t }
        ?w occurs in ?t
        ?a names at most one option per variable, read from Cataloguing
        ?q names only quantities some method in Deriving needs
        ?a names no option of a variable ?q is worked out into
        bind a fresh identity as ?i }
then  { Reading/read: [ source: [ file: ?f ] ; words: ?w ; answer: ?a ;
          states: ?q ; item: ?i ] }

sync TheModelMayReadARequirement
when  { Copiloting/invoke: [ tool: "read" ; utterance: ?u ;
          words: ?w ; answer: ?a ; states: ?q ] => [] }
where { Conversing: { ?u text: ?t }
        Conversing: { ?u about: _ } does not bind
        ?w occurs in ?t
        ?a names at most one option per variable, read from Cataloguing
        ?q names only quantities some method in Deriving needs
        ?a names no option of a variable ?q is worked out into
        bind a fresh identity as ?i }
then  { Reading/read: [ source: [ utterance: ?u ] ; words: ?w ; answer: ?a ;
          states: ?q ; item: ?i ] }
```

One rule with two triggers, on the shape of the source. The utterance is the
one that opened the turn, handed to the tool by `agent/hearing.py` as the
flow token is, so a reading of the person's words names the words it read.
A call with no file and no utterance reads nothing: there is no source to
check it against. The person's own agent has no message in the chat, so it
reads only from a file, which it files first as the person
([Conduct](conduct.md#the-persons-own-agent-acting-as-the-person)).

The `where` is that check. A reading cites its source, and a citation the
source does not bear out is not one: words from a document cited to the
person's message, or a paraphrase passed off as the source's own words, read
nothing. `occurs in` is a calculation, not a judgment. The words occur in a
text when, with both normalised, they are one unbroken passage of it. The
normalisation forgives what extraction and typing do to text and nothing
else: compatibility forms are folded (a PDF's ligatures, full-width
characters), curly quotes and dashes are made plain, a hyphen at a line
break is read both ways, as a word broken and as a word hyphenated, every
run of whitespace becomes one space, and case is ignored. The words may be cut short at either end; they may not be cut in
the middle, since a passage with a gap in it says something the source does
not.

Words said *about* something are not a source. A reply to the model's
question is recorded against that question
([Conduct](conduct.md#asking-and-waiting-for-the-answer)), and it answers it:
*drop the no-mirror line* says which assertion gives way, and *EN 81-70 is
non-negotiable for us* says which one holds. Read as requirements, those
words become clauses of their own, beside the clause the document already
states, answered by values the reply was about, and a later concession then
has a second clause to stand against. So a reply reads nothing. What it says
gives way is carried out by the withdraw the model is already permitted, and
a requirement the person means to add is stated in a message of its own,
which the model reads as any other. The utterance a reading cites is the
turn's own, and a reply becomes the turn's words when it resumes the turn
(`agent/hearing.py`'s `follow`), so the check is on the utterance and not on
the tool.

A call the rule declines records only the `invoke`, and the tool says so to
the model, from the absence of a `Reading/read` after it: nothing was read,
because the words are not in the cited source, or they are a reply. The check stays in the rule;
the tool reports what the rules did, as it does for every call.

`answer` is the set of catalogue options the model took to answer the words,
and it may be empty. That is the model's claim, recorded as such in
[Reading](../concepts/reading.md), and it is the record the rest of this
note reads.

An answer may name a value that already holds: one that follows from another
assertion, or one already asked for to answer another clause. A source that
asks for what follows has asked for it, so the value is then asked for, and
answers the clause, and it stays when what it followed from goes. An empty
answer is the claim that nothing in the catalogue answers the words, and a
reading that left out a value because it was already there would make that
claim falsely, to the person and in a quote's basis of design.

An answer names at most one option for each variable, since `Asserting`
holds one value per variable and the second would displace the first for
no reason the source gives. Two options on one variable say the reader could
not tell which answers, so the rule reads nothing, as it does for words the
source does not bear out, and the tool says which variable was named twice.
Which one answers is for the reader to say: *2200 mm minimum* is the 2200
option, and a reading that cannot tell leaves the item to be read again.

## A reading becomes a clause, and its answer a choice

```
sync AReadItemBecomesAClause
when  { Reading/read: [] => [ item: ?i ; words: ?w ] }
where { Specifying: { ?s in open } }
then  { Specifying/require: [ spec: ?s ; party: model ; text: ?w ; clause: ?i ] }

sync AReadAnswerIsProposed
when  { Specifying/require: [ party: model ] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s }
        Reading: { ?c answer: ?a* }
        ?o in ?a*
        Cataloguing: { ?v offers: ?o }
        ?v is not held for a reason in ?s
        bind a fresh identity as ?ch }
then  { Binding/propose: [ party: model ; selection: ?sel ;
          requirement: ?c ; value: ?o ; choice: ?ch ] }
```

From `Binding/propose` on, nothing is new: `AChoiceReachesTheAssertions`
asserts the value with the model as party, the assertion reaches the solver
through [Propagation](propagation.md), and a value that cannot be met comes
back as a question through `Deciding`. A clause read from a document lands in
the same ledger as one the person typed, answered by the same kind of choice,
with the standing the ledger already computes. What tells them apart is
`statedBy` and the provenance edge, and the canvas reads both: *the assistant
read RFQ 2026-04.pdf, "a bed must fit, with a porter", as 1250 kg*.

The clause is the item. A reading stated as a requirement is one
individual in two concepts, as a specification is one identity in
`Asserting`, `Specifying` and `Binding`: `Reading` holds what it was read as
and from where, `Specifying` holds it as a clause in the ledger, and neither
knows the other holds it. So the second rule finds the item's answer under
the clause's own identity, and a rule that asks which clause an item became
asks nothing, since it is the same one. An option the catalogue does not
offer binds no variable and is not proposed. An option whose variable holds a
value held for a reason is not proposed either
([Conduct](conduct.md#the-permissions)): the person chose it for a
requirement they stated, and a reading is not the model's way round that. The
clause is stated and stays unanswered, its answer on record in `Reading`
beside it, and the tool tells the model which option it did not assert, so
it can say so and leave the choice to the person.

## A quantity read is worked out

```
sync AReadQuantityIsWorkedOut
when  { Specifying/require: [ party: model ] => [ clause: ?c ] }
where { Reading: { ?c states: ?q }
        Deriving: { ?m in methods ; ?m yields: ?y }
        ?m is the first method yielding ?y that ?q is enough for
        bind a fresh identity as ?d }
then  { Deriving/derive: [ method: ?m ; for: ?c ; stated: ?q ; derivation: ?d ] }

sync AWorkedOutQuantityIsProposed
when  { Deriving/derive: [] => [ for: ?c ; yields: ?v ; result: ?n ] }
where { Specifying: { ?s clauses: ?c }
        Binding: { ?sel for: ?s }
        Cataloguing: { ?v offers: ?o ; ?o covers: ?r }
        ?n in ?r
        ?v is not held for a reason in ?s
        bind a fresh identity as ?ch }
then  { Binding/propose: [ party: model ; selection: ?sel ;
          requirement: ?c ; value: ?o ; choice: ?ch ] }
```

Principle 3 of the case: the model may say what words mean and may never
compute a quantity. *Ground plus five upper floors* means five upper floors,
and saying so is reading; that it makes six stops and about 17.5 m of travel
is arithmetic, and the model is not asked to do it. It reads the counts and
measures the words state under `states`, in the quantities
[Deriving](../concepts/deriving.md) names, and the rules work out the rest:
the first rule runs every method the stated quantities are enough for, and
the second answers the clause with the option whose range contains the
result. The number and what it rests on are then on record, and the canvas
shows them beside the answer: *5 upper floors × 3.5 m, assumed*.

A method is enough when it needs at least one quantity the reading states and
every other it needs is presumed. Without the first condition a method that
presumes everything would run on every reading. Where several methods yield
the same quantity, the catalogue lists them in the order it prefers, and the
first that is enough runs: a stop count stated outright is worked out from
that, not from floors stated beside it.

`?n in ?r` is a calculation, as `occurs in` is: a range is the seller's own
statement of what an option is offered for, and whether a number falls in it
is not a judgment about anyone's words. That is why this is not
[the case's `Mapping`](../concepts/README.md#not-concepts). Mapping is the
translation of what words mean into the catalogue's terms, and here the model
still does it, choosing options in `answer` and naming quantities in
`states`. What has left the model is only the arithmetic between a stated
quantity and the option whose range contains it.

An answer may not name an option of a variable the stated quantities are
worked out into. The two would answer the clause twice on one variable, and
the second would displace the first for no reason the source gives, so the
first rule reads nothing, as it does for an answer naming two options on one
variable, and the tool says which.

Quantities are worked out together only when one reading states them all.
The words are one unbroken passage, so a document that gives the floors in
one item and the floor-to-floor height in another yields two readings, and
the travel worked out from the first presumes the method's storey height
while the second states another. The second is recorded as a clause like
any other, so the difference is on the canvas for the person to see; no rule
brings the two together.

A result no option's range contains answers nothing: twenty-six stops, for a
product offered for at most twenty-four, leaves the clause stated and
unanswered, with the derivation on record beside it, and the tool says so.
That is the wall, not a gap in the reading. Rewording the clause later works
nothing out again, as rewording re-reads nothing: the clause becomes the
person's, and its answers stand until they change them.

## The person keeps a reading

```
sync APersonKeepsAReading
when  { Copiloting/gesture: [ act: "keep" ; clause: ?c ] => [] }
then  { Specifying/adopt: [ clause: ?c ; party: person ] }

sync ARewordedReadingIsKept
when  { Specifying/reword: [ clause: ?c ] => [ clause: ?c ] }
where { Specifying: { ?c statedBy: model } }
then  { Specifying/adopt: [ clause: ?c ; party: person ] }
```

A clause the model read reads as the assistant's reading until the person
keeps it, rewords it or strikes it. Keeping makes them the party who stated
it, and so does rewording: a clause in the person's own words is theirs,
whoever first read it. Only the person rewords
([`APersonRewordsAClause`](gestures.md)), so the second rule needs no actor
in its `when`, and no rule carries the model's call to `Specifying/adopt`.
Once a reading is the person's, the value answering it is held for a reason,
and the model can no longer change it.

## The gate is a rule, and it is not written

A reading lands at once. Nothing waits for the person to adopt it: the
clause is stated, the answer asserted, and the person corrects by striking
the clause, answering it with another option, or withdrawing the value, each
of which is a gesture that already exists. Everything the model read is
attributed to it and cited to its source, and a value the reading asserted
that cannot be met is a question the person answers, so the gate that the
case's `Suggesting` supplies is here supplied by visibility and reversibility.

The gated form is the same rules with one trigger moved. `AReadItemBecomesAClause`
would fire on `Deciding/choose` of a request naming the item, exactly as a
proposed completion is put to the person in
[Conduct](conduct.md#proposing-and-not-adopting). The ungated form comes
first, so that how often a read clause is disowned can be counted before a
gate is paid for. That count is a read over the log: a clause disowned at its
words or at its answer, which argue for different gates.

## What the reading cannot say, and what is read instead

An item's answer answers the whole of its words. Words that ask for two
things, one the catalogue answers and one it does not, are two items, each
an unbroken passage of the source: *framed glass landing doors* answered,
*with an antimicrobial coating* answered by nothing. Read as one item, the
miss would sit inside a clause the ledger shows as answered, and nobody
would see it.

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
takes the earlier clause's choice away. That holds while the earlier clause
is a reading. Once the person has stated or kept it, the value answering it is
held for a reason, and the later reading's answer on that variable is not
asserted: the later clause is stated unanswered, and the person decides
between them. Where the earlier answer is displaced, the earlier clause reads as no longer
answered, and the canvas says what displaced it, from the provenance edge on
the retraction and the reading in that flow: *displaced when the assistant
read "make it faster" as 1.6 m/s*. Striking or relaxing the earlier clause
stays the person's gesture, since no rule carries a tool call to
`Specifying/strike`.

## What the canvas reads

The source of a clause is a read over `Reading`: a clause the model read is
an item there, with its source and its words. The words behind an assertion
are a read over the log. The sources
themselves are `Filing` and `Conversing`, and beside each the canvas lists
what was read from it and what became of each item, so a reading can be
checked against its source whole.

## See also

- [Conduct](conduct.md) — the model's other permissions, and the absences this note narrows
- [Gestures](gestures.md) — the `file` act beside `say`
- [Binding](binding.md) — where a proposed answer goes, and what takes it away
- [Reading](../concepts/reading.md) · [Filing](../concepts/filing.md) · [Deriving](../concepts/deriving.md)

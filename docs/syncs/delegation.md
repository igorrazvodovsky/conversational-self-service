# Delegation

How far the model may act on the person's behalf, and how the person takes
back what it did. See [the index](README.md).

The model is a root actor, and what it may do is a set of rules
([Conduct](conduct.md)). For the acts that change what the person's
specification says, those rules read a second thing besides the tool call:
how far the person has let the assistant go, held in
[Delegating](../concepts/delegating.md). The person sets that, act by act,
and the model cannot. Whatever the model did in reply to something the person
said can be taken back as one, through [Rewinding](../concepts/rewinding.md).

## The latitude

```
the latitude ?p grants for ?a
  =  ?level where Delegating: { ?p granted: ?a -> ?level },
     or, where that does not bind, Delegating: { ?a usual: ?level }
```

and a value is *held for a reason* when a clause the person stated rests on
it:

```
?v is held for a reason in ?s
  iff  Asserting: { ?s asserted: ?v -> ?x }
  and  Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                  ?ch value: ?x ; ?ch answers: ?c }
  and  Specifying: { ?c statedBy: person }
```

The acts it governs are the ones that change what the specification says:

| Act | What the model does with it | Usual |
|---|---|---|
| `assert` | sets a value | `act` |
| `withdraw` | takes a value back | `act` |
| `read` | records a requirement it read from a document or the person's words, and states it as a clause with its answer | `act` |

At `act` the model's call takes effect, and what it did is noted against the
turn it replied to, except on a value held for a reason: that one the model
may only suggest changing, at any latitude but `withhold`, because a value
the person chose for a reason is not the model's to swap. At `suggest` it becomes a question the person answers, as
a proposed value is ([Conduct](conduct.md#proposing-and-not-adopting)). At
`withhold` no rule fires and nothing happens.

The usual levels keep today's behaviour: values set, and a reading landing
at once where the person can see it, which is the ungated form
[Reading](reading.md#the-gate-is-the-persons-latitude) asks for first. They are a proposal to be tried, and each is a single
row of the boot stimulus to change.

Acts that change no fact of the specification — proposing a completion,
requesting a quote, introducing the person, naming the job, and showing,
hiding or framing the canvas — keep the plain permissions in
[Conduct](conduct.md). Adopting a proposal and accepting a quote are the
person's at every latitude, because no rule carries the model's call to them. Neither is an act `Delegating` offers, so no grant reaches it.

## Setting it

```
sync TheAssistantsLatitudeIsSet
when  { Copiloting/boot: [] => [ latitude: ?l ] }
then  { Delegating/offer: [ act ; level ] for each entry of ?l }

sync APersonDelegates
when  { Copiloting/gesture: [ act: "entrust" ; to: ?a ; level: ?level ] => [] }
then  { Delegating/entrust: [ party: person ; act: ?a ; level: ?level ] }
```

There is no `TheModelMayDelegate`. The model cannot widen its own latitude,
and when the person says *just go ahead and fill it in*, the model can point
them to the control and nothing more. That is the absence doing the work, as
in [Conduct](conduct.md#what-is-not-here-and-why-that-is-the-enforcement).

## The model acts, within the latitude

Every tool call carries `reply`, the turn it answers. The tools adapter reads
the person's latest `Conversing/say` and passes it. A browser agent's call
passes `none`, because nothing the person said here prompted it: what it does
is still permitted by the same rules, `Rewinding/note` refuses a turn of
`none`, and the browser agent's acts are taken back value by value, as now.

```
sync TheModelMayAssertAValue
when  { Copiloting/invoke: [ tool: "assert" ; spec: ?s ; variable: ?v ;
          option: ?o ; reply: ?u ] => [] }
where { the latitude person grants for "assert" is "act"
        ?v is not held for a reason in ?s
        ?was is what Asserting: { ?s asserted: ?v -> _ } holds, and ?wasBy
          who asserted it; nothing for both where it holds none }
then  { Asserting/assert: [ party: model ; spec: ?s ; variable: ?v ; option: ?o ] ;
        Rewinding/note: [ turn: ?u ; act: [ spec: ?s ; variable: ?v ;
          option: ?o ; was: ?was ; wasBy: ?wasBy ] ] }

sync TheModelMayWithdrawAnAssertion
when  { Copiloting/invoke: [ tool: "withdraw" ; spec: ?s ; variable: ?v ;
          reply: ?u ] => [] }
where { the latitude person grants for "withdraw" is "act"
        ?v is not held for a reason in ?s
        Asserting: { ?s asserted: ?v -> ?was ; assertedBy: ?v -> ?wasBy } }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] ;
        Rewinding/note: [ turn: ?u ; act: [ spec: ?s ; variable: ?v ;
          option: nothing ; was: ?was ; wasBy: ?wasBy ] ] }
```

Where the turn is `none`, `Rewinding/note` fails and the act stands without
being noted.

The model's reading is permitted in [Reading](reading.md#the-model-reads), by
`TheModelMayReadARequirement`, with the latitude for `read` in its `where` and
the same notes in its `then`: the item read, and each value its answer will
assert. Its answer is proposed only on a variable whose value is not held for
a reason, so the model reads a requirement over a person's answer without
swapping it.

The reading is what gives a value the model set an answer on the canvas:
*why 1600 kg?* is answered by the clause the model read and the passage it
read it from, whether or not anybody approved anything in advance. A bare
`assert` cites nothing, and no rule can tell a value the model set for a
reason it kept to itself from one it set for none. That is a sentence in
the prompt, and this repository treats that as a finding, as it does the
prompt's instruction never to invent a name
([Conduct](conduct.md#the-permissions)).

## The model suggests, within the latitude

```
sync TheModelMaySuggestAValue
when  { Copiloting/invoke: [ tool: "assert" ; spec: ?s ; variable: ?v ;
          option: ?o ] => [] }
where { the latitude person grants for "assert" is "suggest",
          or it is "act" and ?v is held for a reason in ?s }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "suggestion" ; variable: ?v ] ;
          reason: "the assistant suggests this" ;
          options: { [ variable: ?v ; option: ?o ] } ] }

sync TheModelMaySuggestAWithdrawal
when  { Copiloting/invoke: [ tool: "withdraw" ; spec: ?s ; variable: ?v ] => [] }
where { the latitude person grants for "withdraw" is "suggest",
          or it is "act" and ?v is held for a reason in ?s
        Asserting: { ?s asserted: ?v -> _ } }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "suggestion" ; variable: ?v ] ;
          reason: "the assistant suggests taking this back" ;
          options: { [ variable: ?v ; option: nothing ] } ] }

sync TheModelMaySuggestAReading
when  { Reading/read: [] => [ item: ?i ; words: ?w ] }
where { Specifying: { ?s in open }
        the latitude person grants for "read" is "suggest" }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "reading" ; item: ?i ] ;
          reason: "the assistant read this as a requirement" ;
          options: { ?i } ] }

sync AReadAnswerOnAHeldValueIsSuggested
when  { Specifying/require: [ party: model ] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s }
        Reading: { ?i words: ?w ; ?i answer: ?a* }
          for the item most recently heard whose words are the clause's text
        ?o in ?a*
        Cataloguing: { ?v offers: ?o }
        ?v is held for a reason in ?s }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "answer" ; clause: ?c ] ;
          reason: "the assistant suggests this answers it" ;
          options: { ?o } ] }

sync ASuggestedValueIsTaken
when  { Deciding/choose: [ request: ?r ; option: ?value ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "suggestion" ; variable: ?v ]
        ?value is [ variable: ?v ; option: ?o ], and ?o is not nothing }
then  { Asserting/assert: [ party: person ; spec: ?s ; variable: ?v ; option: ?o ] }

sync ASuggestedWithdrawalIsTaken
when  { Deciding/choose: [ request: ?r ; option: ?value ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "suggestion" ; variable: ?v ]
        ?value is [ variable: ?v ; option: nothing ] }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }

sync ASuggestedReadingIsTaken
when  { Deciding/choose: [ request: ?r ; option: ?i ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "reading" ; item: ?i ]
        Reading: { ?i words: ?w ; ?i answer: ?a* }
        Binding: { ?sel for: ?s }
        bind a fresh identity as ?c, and one as ?ch for each ?o in ?a*
          that Cataloguing: { ?v offers: ?o } binds }
then  { Specifying/require: [ spec: ?s ; party: person ; text: ?w ; clause: ?c ] ;
        Binding/propose: [ party: person ; selection: ?sel ;
          requirement: ?c ; value: ?o ; choice: ?ch ] for each ?o, ?ch }

sync ASuggestedAnswerIsTaken
when  { Deciding/choose: [ request: ?r ; option: ?o ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "answer" ; clause: ?c ]
        Binding: { ?sel for: ?s }
        Cataloguing: { ?v offers: ?o }
        no choice of ?sel answers ?c with a value ?v offers
        bind a fresh identity as ?ch }
then  { Binding/propose: [ party: person ; selection: ?sel ;
          requirement: ?c ; value: ?o ; choice: ?ch ] }
```

A suggestion taken is the person's act, and its party says so: the value
reads *you asked for this* by way of a suggestion, and a reading taken is a
clause the person stated from the start, answered as the model read it, with
the item it came from on record beside it. The reading and its answer are
taken together because the item holds them together; the person re-answers
or strikes the clause afterwards like any other. A suggestion declined is `Deciding/decline`, which no rule
reads, and nothing happens. The request is a value, as every request here is
([Propagation](propagation.md#what-deciding-is-instantiated-with-here)), so a
second suggestion for the same variable replaces the first.

```
sync AnOvertakenSuggestionIsWithdrawn
when  { Constraining/assume: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { *the suggestion is overtaken* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AnOvertakenSuggestionIsWithdrawn
when  { Constraining/incline: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { *the suggestion is overtaken* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AnOvertakenSuggestionIsWithdrawn
when  { Constraining/release: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { *the suggestion is overtaken* }
then  { Deciding/withdraw: [ request: ?r ] }
```

where *the suggestion is overtaken* is the condition they share:

```
the suggestion is overtaken
  iff  ?r is [ spec: ?s ; about: "suggestion" ; variable: ?v ], and ?r is pending
  and  Deciding: { ?r offered: { [ variable: ?v ; option: ?o ] } }
  and  either ?o is not nothing, and ?v is asserted of ?s or ?q maps ?v,
       or ?o is nothing, and nothing is asserted of ?v in ?s
```

A suggestion is about the state it was made in, as a proposal is
([Conduct](conduct.md#a-proposal-lasts-as-long-as-the-state-it-assumed)).
Once somebody has set the variable, or the rules have settled it, taking a
suggested value would overwrite what happened since; once nothing is
asserted, there is nothing to take back. Either way the question goes.

## The person keeps a reading

```
sync APersonKeepsAReading
when  { Copiloting/gesture: [ act: "keep" ; clause: ?c ] => [] }
then  { Specifying/adopt: [ clause: ?c ; party: person ] }
```

A clause stated from a reading at `act` reads as the assistant's reading
until the person keeps it, strikes it or rewords it. Keeping makes them the party
who stated it. Striking and rewording are the gestures a person already has.

## The person rewinds a reply

```
sync APersonRewindsAReply
when  { Copiloting/gesture: [ act: "rewind" ; turn: ?u ] => [] }
then  { Rewinding/rewind: [ turn: ?u ] }

sync ARewoundValueIsRestored
when  { Rewinding/rewind: [] => [ acts: ?acts ] }
where { for each variable, the latest ?act in ?acts naming it is
          [ spec: ?s ; variable: ?v ; option: ?o ],
        the earliest is [ was: ?was ; wasBy: ?by ], ?was is not nothing,
        and ?o is not nothing
        Asserting: { ?s asserted: ?v -> ?o }  — nobody has changed it since }
then  { Asserting/assert: [ party: ?by ; spec: ?s ; variable: ?v ; option: ?was ] }

sync ARewoundValueIsTakenBack
when  { Rewinding/rewind: [] => [ acts: ?acts ] }
where { for each variable, the latest ?act in ?acts naming it is
          [ spec: ?s ; variable: ?v ; option: ?o ],
        the earliest is [ was: nothing ], and ?o is not nothing
        Asserting: { ?s asserted: ?v -> ?o } }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }

sync ARewoundWithdrawalIsUndone
when  { Rewinding/rewind: [] => [ acts: ?acts ] }
where { for each variable, the latest ?act in ?acts naming it is
          [ spec: ?s ; variable: ?v ; option: nothing ],
        the earliest is [ was: ?was ; wasBy: ?by ], and ?was is not nothing
        Asserting: { ?s asserted: ?v -> _ } does not bind }
then  { Asserting/assert: [ party: ?by ; spec: ?s ; variable: ?v ; option: ?was ] }

sync ARewoundReadingIsStruck
when  { Rewinding/rewind: [] => [ acts: ?acts ] }
where { [ item: ?i ] in ?acts
        ?c is the clause stated from ?i — the Specifying/require with via
          AReadItemBecomesAClause and after the Reading/read that heard ?i
        Specifying: { ?c statedBy: model }  — nobody has kept it since }
then  { Specifying/strike: [ clause: ?c ] }

sync ARewoundReadingIsWithdrawn
when  { Rewinding/rewind: [] => [ acts: ?acts ] }
where { [ item: ?i ] in ?acts
        ?r is [ spec: ?s ; about: "reading" ; item: ?i ], and ?r is pending }
then  { Deciding/withdraw: [ request: ?r ] }
```

The clause stated from an item is found by the provenance edge, as
[the measures](../measures.md) find it, since the reading and the clause are
two records and only the trace joins them. A reading put to the person and
not yet answered goes with the reply as well; one the person took is theirs,
and stays.

Rewinding returns the specification to what it said before the reply, for
everything the reply touched and nobody has touched since. A value the person
or a later reply has changed is left as it is, and so is a reading the person
has kept: those are no longer the reply's to take back. The other rules
already in place finish the job. A struck clause releases its choices
(`AStruckClauseReleasesItsChoices`), so the reading's answer leaves the
ledger with it and needs no note of its own; a withdrawn value retracts its choices
and releases the solver, and a restored value reaches the solver like any
assertion. So rewinding needs no rule of its own for what followed.

Rewinding is one act for a whole reply, and it is the undo the
[misalignment note](../method/misalignment.md) finds missing for adopting a
whole completion, in the one place where the model's agency makes it matter
most. The more latitude a person grants, the more they depend on it.

## See also

- [Delegating](../concepts/delegating.md) · [Rewinding](../concepts/rewinding.md)
- [Conduct](conduct.md) — the permissions that change no fact, and what no latitude grants
- [Reading](reading.md) — the model's reading at `act`, and the source it cites
- [Binding](binding.md) — what an answer does once it is given
- [Code of conduct](../method/conduct.md) — a permission whose `where` reads a concept's state

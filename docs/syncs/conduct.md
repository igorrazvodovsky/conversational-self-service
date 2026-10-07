# Conduct

What the model may do, stated positively. See [the index](README.md) and
[Code of conduct](../method/conduct.md) for why it is stated that way.

## The permissions

```
sync TheModelMayAssertAValue
when  { Copiloting/invoke: [ tool: "assert" ;
          spec: ?s ; variable: ?v ; option: ?o ] => [] }
where { ?v is not held for a reason in ?s }
then  { Asserting/assert: [ party: model ;
          spec: ?s ; variable: ?v ; option: ?o ] }

sync TheModelMayWithdrawAnAssertion
when  { Copiloting/invoke: [ tool: "withdraw" ;
          spec: ?s ; variable: ?v ] => [] }
where { ?v is not held for a reason in ?s }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }

sync TheModelMayIntroduceThePerson
when  { Copiloting/invoke: [ tool: "introduce" ; name: ?n ; organisation: ?o ;
          address: ?a ; email: ?e ; phone: ?p ] => [] }
then  { Profiling/introduce: [ party: person ; name: ?n ; organisation: ?o ;
          address: ?a ; email: ?e ; phone: ?p ] }

sync TheModelMayEntitleTheJob
when  { Copiloting/invoke: [ tool: "entitle" ; spec: ?s ; title: ?t ; site: ?where ] => [] }
then  { Naming/entitle: [ item: ?s ; title: ?t ; site: ?where ] }

sync TheModelMayRequestAQuote
when  { Copiloting/invoke: [ tool: "quote" ; spec: ?s ] => [] }
where { as APersonRequestsAQuote — every variable settled, nothing
          asserted unmet, Pricing's total complete, the person named
          and the job sited; the item, amount, terms and validity
          read the same way }
then  { Quoting/quote: [ item: ?item ; to: person ;
          amount: ?amount ; terms: ?terms ; until: ?until ] }

sync TheModelMayShowAFacet
when  { Copiloting/invoke: [ tool: "show" ; facet: ?f ] => [] }
then  { Showing/show: [ lens: workspace ; facet: ?f ] }

sync TheModelMayHideAFacet
when  { Copiloting/invoke: [ tool: "hide" ; facet: ?f ] => [] }
then  { Showing/hide: [ lens: workspace ; facet: ?f ] }

sync TheModelMayFrameTheCanvas
when  { Copiloting/invoke: [ tool: "frame" ; frame: ?f ] => [] }
then  { Framing/frame: [ lens: workspace ; frame: ?f ] }

sync TheModelMayUnframeTheCanvas
when  { Copiloting/invoke: [ tool: "unframe" ] => [] }
then  { Framing/unframe: [ lens: workspace ] }

sync TheCanvasIsShownBeforeItChanges
when  { Copiloting/invoke: [ tool: ?t ] => [] }
where { ?t is one of assert, withdraw, read, propose, quote, show, hide, frame, unframe }
then  { Moding/focus: [ workspace: workspace ; surface: canvas ] }
```

The `party` in the first rule is what distinguishes it from
[`APersonAssertsAValue`](gestures.md) in the state as well as in the trace. Two
rules, two parties, one action — and `Asserting.assertedBy` records which,
independently of the provenance edge the log already carries. The edge is finer:
`APersonAssertsAValue` and `AnAdoptedValueBecomesAnAssertion` are two
different things a person did, and both write `person`.

The model's call is performed in the flow the person's message opened, so an
assertion made in reply to their words shares a flow token with the
utterance, and the canvas reads the words off it: *the assistant asked for
this in reply to "hospital, six storeys"*. That is a fact of the trace and not of any
concept — see [The turn is one flow](gestures.md#the-turn-is-one-flow).

A value is *held for a reason* when a clause the person stated rests on it:

```
?v is held for a reason in ?s
  iff  Asserting: { ?s asserted: ?v -> ?x }
  and  Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                  ?ch value: ?x ; ?ch answers: ?c }
  and  Specifying: { ?c statedBy: person }
```

The first two rules do not fire on such a value. A value the person chose
for a requirement they wrote is not the model's to swap or take back, so the
model asks them in the chat and the person changes it on the canvas, where
changing it retracts the answer it gave
([Binding](binding.md#what-takes-a-choice-away)). A value with no requirement
behind it, or one answering only a reading the person has not kept, the
model may change as before. The canvas marks a held value with the
requirement it answers, and the tool reads the same condition from state to
tell the model why nothing happened, since an absence has no reason on
record. The same condition keeps a reading's answer off a held value
([Reading](reading.md#a-reading-becomes-a-clause-and-its-answer-a-choice)).

There is no `TheModelMayPreferAnOption`. `Asserting` has no `prefer`: how
firmly a value is meant is a clause's negotiability, the person's own tag,
and [Propagation](propagation.md#which-of-the-first-two-fires-is-a-fact-of-the-state)
reads it to route the value to the solver.

`TheModelMayIntroduceThePerson` writes the *person's* profile, as
`TheModelMayAssertAValue` writes the person's assertion: the party is the
person, and the model has no profile of its own. The prompt tells it to record
only what was said and never to invent a name or an address, and that is a
sentence in a prompt, which this repository treats as a finding: the rule
cannot tell a name the person gave from one the model made up. What it can
guarantee is narrower and holds — the seller's profile and the seller's terms
are reached by no tool at all.

`TheModelMayRequestAQuote` has the same `where` as
[`APersonRequestsAQuote`](gestures.md#a-quote-is-requested) and the same
`then`, down to the party: a quote is issued *to the person* whoever asked for
it, because the person is the only party an offer can be made to here. What
distinguishes the two is the provenance edge, which is what the canvas reads.
The model asking for a quote is the model computing a number on the person's
behalf, like proposing a completion; what it cannot do is the next thing.

`TheCanvasIsShownBeforeItChanges` is the rule the CopilotKit starter writes as
the sentence `Todos: enable app mode first, then manage todos` in a system
prompt. It is ordinary application logic — a person who cannot see the canvas
watches nothing happen — and there it is enforced by asking a language model
nicely. Here it fires
because a value was asserted, or the canvas reshaped, whatever the model does
or does not remember about it.

## What the canvas shows

<a id="what-the-canvas-shows"></a>
`TheModelMayShowAFacet` and `TheModelMayHideAFacet` are the first permissions
the model holds on exactly the terms the person does, and the only ones that
change no fact of the specification. *Show me the price next to each option*
is a request the assistant can act on rather than answer with a recital,
and *the canvas is too busy* has an act to go with it. Both reach
[Showing](../concepts/showing.md), whose facets name facts other concepts
already hold, so the grant costs nothing: the model can choose which of the
canvas's facts a person sees and cannot make one up — no rule lets it offer a
facet, as none lets it list an option. What it did is in the log with its
provenance edge, and the person's menu shows the result and can take it
back.

`TheModelMayFrameTheCanvas` and `TheModelMayUnframeTheCanvas` extend the
same grant to which *items* the canvas shows
([Framing](../concepts/framing.md)). *What did asking for a hospital cost
me?* is answered by narrowing the canvas to what followed from that
assertion and saying so in a sentence — rather
than by a list of values in a chat bubble. The tool passes the same frame value
a person's click passes, and the rule carries it without looking inside. The
other frame value, `[ by: "clause" ; clause: ?c ]`, narrows the canvas to one
requirement — what answers it, what those answers forced, and what is still
open to answer it — for when the conversation is about that requirement; the
model may frame a clause and may not answer one, as
[Gestures](gestures.md#the-canvas-is-narrowed-to-one-requirement) says. The
third, `[ by: "gap" ; gap: ?g ]`, narrows it to one
[gap](gestures.md#the-canvas-is-narrowed-to-one-gap) — what is open,
the requirements nothing answers, or the values answering none — for when
the person asks what is left to do.

## Proposing, and not adopting

```
sync TheModelMayProposeACompletion
when  { Copiloting/invoke: [ tool: "propose" ;
          spec: ?s ; measure: ?measure ] => [] }
where { ?cost is what each option adds to ?measure over the life of the lift,
          computed from Pricing or from Footprinting — see below }
then  { Constraining/complete: [ spec: ?s ; cost: ?cost ] }

sync ACompletionIsPutToThePerson
when  { Constraining/complete: [ spec: ?s ] => [ assignment: ?a ; cost: ?c ] }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "completion" ] ;
          reason: "adopt this completion" ; options: { ?a } ] }

sync AProposedValueIsPutToThePerson
when  { Constraining/complete: [ spec: ?s ] => [ assignment: ?a ; cost: ?c ] }
where { ?a maps ?v to ?o
        ?v is neither asserted of ?s nor settled for ?s, read from
          Asserting and Constraining }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "completion" ; variable: ?v ] ;
          reason: "proposed to finish the specification" ;
          options: { [ variable: ?v ; option: ?o ] } ] }

sync AnAdoptedCompletionIsTakenValueByValue
when  { Deciding/choose: [ request: ?r ; option: ?a ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "completion" ]
        ?p is [ spec: ?s ; about: "completion" ; variable: ?v ]
        ?p is pending, and Deciding: { ?p offered: { ?value } } }
then  { Deciding/choose: [ request: ?p ; option: ?value ] }

sync AnAdoptedValueBecomesAnAssertion
when  { Deciding/choose: [ request: ?p ; option: ?value ] => [ request: ?p ] }
where { ?p is [ spec: ?s ; about: "completion" ; variable: ?v ]
        ?value is [ variable: ?v ; option: ?o ]
        ?v is neither asserted of ?s nor settled for ?s }
then  { Asserting/assert: [ party: person ;
          spec: ?s ; variable: ?v ; option: ?o ] }

sync ADeclinedCompletionIsDeclinedValueByValue
when  { Deciding/decline: [ request: ?r ] => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "completion" ]
        ?p is [ spec: ?s ; about: "completion" ; variable: ?v ]
        ?p is pending }
then  { Deciding/decline: [ request: ?p ] }
```

where *pending* is one calculation over `Deciding`'s exposed state, read by
the rules on this page, by
[`AResolvedConflictWithdrawsItsQuestion`](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)
and by the canvas, which lists the pending questions:

```
?r is pending
  iff  Deciding: { ?r offered: _ }
  and  Deciding: { ?r chosen: _ } does not bind
  and  ?r is not in Deciding's declined
```

It is not a method of `Deciding`. The concept exposes what was offered, chosen
and declined, and which requests are still open is a question its readers ask
of that, as a `where` would (WYSIWID §6.4). `agent/syncs/readings.py` holds the
one implementation the rules and the canvas share.

```
sync AnOvertakenProposedValueIsRetired
when  { Constraining/assume: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { *the proposed value is overtaken* }
then  { Deciding/withdraw: [ request: ?p ] }

sync AnOvertakenProposedValueIsRetired
when  { Constraining/incline: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { *the proposed value is overtaken* }
then  { Deciding/withdraw: [ request: ?p ] }

sync AnOvertakenProposedValueIsRetired
when  { Constraining/assume: [ spec: ?s ] => [ error: _ ] }
where { ?q is empty
        *the proposed value is overtaken* }
then  { Deciding/withdraw: [ request: ?p ] }

sync AnEmptiedProposalIsWithdrawn
when  { Deciding/withdraw: [ request: ?p ] => [ request: ?p ] }
where { *the proposal is emptied* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AnEmptiedProposalIsWithdrawn
when  { Deciding/choose: [ request: ?p ] => [ request: ?p ] }
where { *the proposal is emptied* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AnEmptiedProposalIsWithdrawn
when  { Deciding/decline: [ request: ?p ] => [ request: ?p ] }
where { *the proposal is emptied* }
then  { Deciding/withdraw: [ request: ?r ] }
```

where each name stands for the `where` its triggers share:

```
the proposed value is overtaken
  iff  ?p is [ spec: ?s ; about: "completion" ; variable: ?v ]
  and  ?p is pending, and Deciding: { ?p offered: { [ variable: ?v ; option: ?o ] } }
  and  ?v is asserted of ?s, or ?q maps ?v,
       or ?o does not fit: taking the pending proposed values in the order
          the proposal was asked, each fits if Constraining's foreseeing,
          given the specification's assumptions and inclinations and every
          value that fit before it, and ?o itself, is buildable
  and  Deciding: { [ spec: ?s ; about: "completion" ] chosen: _ } does not bind

the proposal is emptied
  iff  ?p is [ spec: ?s ; about: "completion" ; variable: _ ]
  and  ?r is [ spec: ?s ; about: "completion" ], and ?r is pending
  and  no [ spec: ?s ; about: "completion" ; variable: _ ] is pending
```

Each of these is one rule with more than one trigger, written as one block per
trigger under one name, as in
[Propagation](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it):
actions listed together in a `when` must all occur in the same flow
(WYSIWID §5.3).

### The unit of adoption is a value, and the whole is a shortcut

A completion is one answer from the solver: an assignment of every variable
that honours every rule and every assumption at the least cost. What it
contains is two kinds of value. Some are settled by the rules given what has
been asserted, and the canvas already shows those beneath the assertions they rest on;
adopting them would turn an entailment into a demand, and no rule here does
that. The rest are choices the rules leave open, and they are the only thing
the person is being asked about. `AProposedValueIsPutToThePerson` puts each of
those to them separately, as a request naming the variable, with the
proposal's value as its one option: *the assistant proposes 1000 kg for the
rated load; take it or not*. On the canvas that is a line beside each open
variable.

Nothing about the solver's answer requires the open values to be taken
together. Assert any one of them and the rest of the assignment still holds:
every rule was satisfied by the whole, so the whole is still a satisfying
choice once part of it is assumed, and every choice the new assumption
excludes was available before and cost no less. The remaining values are
still the cheapest way to finish the specification that was proposed. That
is why a proposal survives its own adoption one value at a time, and why
the person asserting a value it proposed by hand leaves it in place.

An assertion that differs from the proposal moves the state the completion
was computed against, and the proposal does not survive that whole. It
survives in part. The proposed value for the variable just asserted is
answered by the assertion, and goes. A proposed value the new state rules
out goes too, since adopting it would raise a conflict nobody asked for. The
check is joint and not one value at a time: two values each allowed beside
the new assertion may not be allowed together, and adopting the whole would
then raise the conflict anyway. So the values are taken in the order the
proposal was asked, and each stays only if `Constraining`'s `foreseeing`
finds it buildable beside the specification and the values kept before it.
What stays can be adopted whole without a conflict. Every value that stays
is one the person can still take. What it no longer is, is the
cheapest: the completion was cheapest for the state it was computed
against, and a value the person put in its place can make another way of
finishing cheaper. Ask again and there is a proposal for the state you are
in. A withdrawal rules nothing out, so it retires nothing; the values stay,
as a way of finishing that still holds. When the last proposed value is
gone, by whatever answer, the proposal as a whole is withdrawn, since there
is nothing left for it to adopt.

The alternative is a single act on a single bundle, a whole completion taken
or left at once, and the literature on proposal surfaces is against it. Li, Zhang, Wang and Lu's study of
Contextify (*Mixed-Initiative Context*, 2026,
[arXiv:2604.07121](https://arxiv.org/abs/2604.07121)) reports that "binary
accept/reject proved insufficient": when the proposal was structural, people
wanted to keep part of it, edit it before taking it, or answer it with their
own. A proposal of many parts is many decisions, and one button forces a
lossy reduction that trains people to reject. Ma et al.'s deliberation study
(*Towards Human-AI Deliberation*, CHI 2025,
[arXiv:2403.16812](https://arxiv.org/abs/2403.16812)) moved disagreement
from the verdict to the dimension for the same reason, so that a person
could accept most of the machine's reasoning and dispute one part;
over-reliance fell. The case's catalogue had already drawn the
line in its own terms: `Suggesting [Choice, Party]` proposes, confirms and
rejects one choice at a time, and its constraint is that every selection
the interpreter made is visible and revocable on its own. A request here
naming a variable is that instance of `Deciding`; the concept is unchanged,
and the grain is a fact of the rules.

The whole stays, as a shortcut over the parts. A separate act per value is the
review burden Zhang and Reicherts describe (*Augmenting Human Cognition With
Generative AI*, 2025, [arXiv:2504.03207](https://arxiv.org/abs/2504.03207)),
where a recommendation the person has to check item by item is worse than
none. `ACompletionIsPutToThePerson` still asks about the assignment as one
request, and `AnAdoptedCompletionIsTakenValueByValue` answers every value
still open when the person chooses it. It does not assert them itself. It
chooses each proposed value, and `AnAdoptedValueBecomesAnAssertion` then
asks, for that value, whether its variable is still open at that moment. A
value a sibling has meanwhile settled is chosen and asserts nothing, so the
canvas reads *follows* for it and not *asked*, however many values were
taken in one act. Declining the whole declines each part the same way,
which is what *leave it for now* means; declining one part is *not that
one*, and the whole then adopts the rest. Which of the two a person did is
the `via` on the assertion's record, as `APersonAssertsAValue` and
`AnAdoptedValueBecomesAnAssertion` are two things a person did that both
write `person`.

That is selective deferral with the roles the other way round. In the
usual form the machine commits the parts it is confident of and hands the
rest over; here the rules commit what they entail, confidence does not come
into it, and the free choices are handed over. The split is a calculation
over `Asserting` and `Constraining` in a `where` clause, not the model's
judgement about which values are worth asking about, for the reason Harne,
Modani, Mahapatra and Agarwal give (*Dialogue to Discovery*, 2026,
[arXiv:2606.24194](https://arxiv.org/abs/2606.24194)): given the same
state, a language model deciding for itself did worse than the arithmetic.

### Words that accept a proposal are the person's adoption

*The other proposals are fine* accepts what waits. The model could carry it
out: `TheModelMayAssertAValue` lets it assert any value no clause of the person's
holds, and an assertion made in reply to words is a legal one. It does not.
The log would then say *the assistant asked for this in reply to "the other
proposals are fine"* where the person adopted a proposal, and the `via` that
tells an adopted value from a requested one is the record this section
exists to keep. So the model links the proposal, the person takes it there,
in one act for the whole or one per value, and the values arrive as adopted.

This is conduct and not a rule. Narrowing `TheModelMayAssertAValue` to values that
do not wait as proposals would also refuse a value the person names in
words that happens to be the proposed one, and that is a requirement, which
the model reads. The prompt says it instead.

### What taking a value would do is a read

A person deciding whether to take a proposed value wants the same thing a
person answering a conflict wants: what would then follow, and what it would
cost. `Constraining`'s *foreseeing* read, asked with the value assumed on top
of what already holds, answers both, and the canvas view (`agent/views.py`)
prices the result with the reads the totals use, as it does for
[each answer to a conflict](propagation.md#what-each-answer-would-cost-is-a-read).
Nothing is recorded, and the proposed value itself is untouched, because
`Deciding/choose` has to recognise the one handed back.

It differs from the conflict's read in one respect: cost. A conflict has a
few answers; a proposal has one value per open variable, and each costs a
solver survey. So the figures are a facet of [Showing](../concepts/showing.md),
*consequences*, computed only while it is shown, as the rule behind a
ruled-out option is. The person or the model turns it on when it is wanted,
and an idle canvas asks the solver nothing.

### A proposed value lasts as long as the rules allow it

A completion is computed against the assumptions holding when `propose` ran.
Let the specification move underneath it and some of its values may no longer
be possible: adopting one would raise a conflict nobody asked for, and in the
worst case restate the very assertion the person just gave up to resolve
one. A proposed value the rules now rule out carries the authority of *the
assistant worked this out* and the content of a state nobody is in.

So `AnOvertakenProposedValueIsRetired` withdraws a proposed value when its
variable is asserted, when the rules settle it, or when the rules no longer
allow the value proposed, and leaves every other one standing. An assertion
the rules refuse is still an assertion, and its variable's proposed value
goes with it, which is why a refused `assume` is a trigger too. A person who
puts their own value in one place keeps the rest of the proposal, which is
the grain the proposal was asked at. What the rest gives up is being the
cheapest way to finish, which only holds for the state the completion was
computed against, so ask again for the cheapest now. `AnEmptiedProposalIsWithdrawn` takes the whole
off the record once no proposed value is left in it. A conflict and a
completion can be open together, because a request is `[ spec ; about ]` and
the two questions are distinct requests.

A settled variable is the common case. Assert one value from the proposal
and the rules may settle another the proposal had left open, to the value it
proposed; the request for that variable now asks about a choice nobody has,
and the rule withdraws it, as
[`AResolvedConflictWithdrawsItsQuestion`](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)
withdraws a conflict question once the condition it asked about no longer
holds. Its last condition is the one that reads oddly: it leaves such a
request alone while the completion itself is chosen. A chosen completion is
the record that the person is taking every value, and
`AnAdoptedCompletionIsTakenValueByValue` is at that moment choosing them in
turn; a value settled by an earlier sibling is answered by the adoption
already under way, and withdrawing it would make that answer fail.

The `about` in the request is what keeps `AnAdoptedValueBecomesAnAssertion` and
[`TheConcededAssertionIsWithdrawn`](propagation.md#when-assertions-cannot-hold-together)
apart. Both match `Deciding/choose`, and their options have the same shape:
a proposed value and a conflict candidate are each `[ variable ; option ]`,
one to be taken up and the other to be given up. Without `about` the two
rules would have to be told apart by the shape of an unconstrained value,
and could not be.

Only genuinely open variables are asserted. Adopting a proposal fills the
gaps: it does not restate what you already asserted, and it does not turn what
merely follows from the rules into something you demanded — which is what keeps
*asserted* and *follows from* readable after a proposal is adopted.

The party is the person. Adoption *is* asserting the values in the proposal,
and the rule that performs it is the one the model has no counterpart for —
which is the asymmetry below, showing up in `assertedBy` as well as in the
trace.

`AProposedValueIsPutToThePerson` and `AnAdoptedCompletionIsTakenValueByValue`
are the ordinary WYSIWID §6.5 shape: the `where` binds once per pair in the
assignment, or once per value still open, and `then` fires once per binding,
so a question per open value is asked and answered without a loop appearing
anywhere.

### The approximations in that `where` clause

An objective handed to `Constraining/complete` has to be one number per option,
because the sum being minimised is linear in the selection. Neither measure is
naturally that shape, and pretending otherwise produces answers that are wrong
in ways a reader would notice. Both approximations are stated here rather than
discovered in the code later.

_Cost._ A lifetime cost is `capital × factor + monthly × term`, and the term is
itself one of the variables being chosen, so the true objective is quadratic.
The rule reckons recurring charges over the term the specification has already
settled on, and over [the presumed term](../concepts/pricing.md) when it has
settled on none. Without this the objective weighs only capital, and *make it
cheaper* answers with 24/7 support and near-continuous traffic, because neither
costs anything to buy.

_Carbon._ Every stage but one is already a number per option: making it,
times the basis's uplift; installing it; its upkeep, times the service life;
and taking it out at the end of its life. The use phase is
a lookup on energy class, usage profile and travel height together, and over
a service life it is the larger half. The rule charges it to each of those
three variables, averaged over the possibilities the specification still allows
on the other two. Annual demand rises monotonically along each of the three
axes whatever the other two are, so no such average can reorder the options
within an axis — which is what makes the approximation safe to state rather
than merely convenient. It counts the same energy three times, so the absolute
number means nothing; only the ranking does, and ranking is all an objective is
asked for.

Charging the use phase to the energy class alone was the obvious version and
is wrong: it leaves usage profile and travel unweighted, so *make it greener*
comes back with near-continuous traffic — the single largest thing driving the
footprint up.

That both of these are approximations, and that both live in a rule rather than
in a concept, is the arrangement working. `Constraining` is handed a cost
function and never learns that money exists; `Pricing` is never asked to solve
anything; and the judgement call about how to flatten a non-linear objective
sits in the one place that is allowed to know about both.

_Ties._ Some variables cost nothing whichever option is taken: the shaft, the
pit and the headroom are built by others to the supplier's dimensions, and
the stops and the travel are priced through what they force. Weighed by cost
alone, every option of such a variable is as good as every other, and the
solver returns whichever it meets first, which in practice has been the
largest shaft and the deepest pit. So the cost objective carries a second,
smaller one: each option's carbon weight, scaled so that the whole of it,
over every variable at its heaviest option, comes to less than half a cent.
Two completions that differ in cost differ by at least a cent, since every
cost weight is a whole number of cents, so the carbon term never reorders
them; it only decides between completions that cost the same, and it
decides for the lighter one, which for a dimension is the smaller. If a
weight is ever not a whole number of cents, the bound does not hold and the
rule leaves the tie-break out rather than risk reordering what the person
asked to minimise. The completion's `cost` output then includes the
tie-break's fraction of a cent, and nothing shows that figure.

### Reading across concepts

`TheModelMayProposeACompletion` reads other concepts' state in its `where`
clause, which is exactly what a `where` clause is for and exactly what a
concept action may not do. That the coupling is possible at all without
either concept knowing the other is WYSIWID §7.2's first and third design
rules doing their work together.

## Asking, and waiting for the answer

```
sync TheModelMayAskThePerson
when  { Copiloting/invoke: [ tool: "ask" ; request: ?r ; offered: ?options ;
          text: ?t ] => [] }
where { ?r is pending
        Deciding: { ?r offered: ?options } }
then  { Conversing/say: [ party: model ; text: ?t ; to: person ;
          about: [ request: ?r ; offered: ?options ] ] }

sync TheModelMayAskWhoTheQuoteIsFor
when  { Copiloting/invoke: [ tool: "ask" ; spec: ?s ; missing: ?f ;
          text: ?t ] => [] }
where { ?s lacks only ?f for a quote }
then  { Conversing/say: [ party: model ; text: ?t ; to: person ;
          about: [ spec: ?s ; missing: ?f ] ] }

sync APersonRepliesToAQuestion
when  { Copiloting/gesture: [ act: "reply" ; about: ?q ; text: ?t ] => [] }
then  { Conversing/say: [ party: person ; text: ?t ; to: model ; about: ?q ] }
```

```
?s lacks only ?f for a quote
  iff  every condition of APersonRequestsAQuote holds of ?s
         but the two that address it
  and  ?f is { name  when Profiling: { person name: _ } does not bind ,
               site  when Naming: { ?s site: _ } does not bind }
  and  ?f is not empty
```

A conflict is a fact on the canvas whoever caused it, and stays one
([Propagation](propagation.md#when-assertions-cannot-hold-together)). What
these rules add is the move a salesperson makes after writing the open
point down: they stop, put it to the customer, and do not go on configuring
around it until they have an answer or have been told to wait. The fact is
`Deciding`'s, and the floor is the conversation's. When the model's own turn
ran into the conflict, it asks, and its turn waits on the person.

The model names the options its question offers, and the question is put
only when they are the ones `Deciding` holds. `Deciding` holds one conflict
per specification, the latest the solver refused, while every assertion that
cannot be met stays on the canvas as unmet; words written about one of the
others would sit above a card offering this one's answers, and the person
would be answering a question nobody asked. A call naming other options puts
nothing, and the tool says which conflict is open, so the model asks that
one. The others come back as questions as each is tried again
([Propagation](propagation.md#an-assertion-is-tried-again-when-the-obstacle-goes)).

The question is about *the question as put*: the request with the options it
was offered at the time. A request is a value, so a later conflict on the
same specification is the same request with other options, and a question
keyed to the request alone would be answered by a click on a question nobody
asked. Keyed to the options as well, a re-ask that displaces them leaves the
earlier question overtaken, and the model may ask the new one.

A question *awaits an answer* while nothing has been said or done about it
since it was put. That is a reading over `Conversing`, the state the
question is about, and the log, made by the canvas, the chat and the model's
tool, never by a rule:

```
?u awaits an answer
  iff  Conversing: { ?u by: model ; ?u to: person ; ?u about: ?m }
  and  ?u is the last utterance by the model about ?m
  and  ?m is still open since ?u
  and  no utterance by the person follows ?u

?m is still open since ?u
  iff  ?m is [ request: ?r ; offered: ?options ]
       and  ?r is pending, and Deciding: { ?r offered: ?options }
       and  no Deciding/ask of ?r has completed since ?u
  or   ?m is [ spec: ?s ; missing: ?f ]
       and  ?s lacks only some of ?f for a quote
```

The first kind of matter is a conflict, and most of what follows is about
it. The second is the quote's addressee
([below](#asking-who-the-quote-is-for)).

An answer can leave another conflict behind it. Giving up the glass doors
releases the solver, the assertions still unmet are tried again, and the one
that still fails asks the same request with its own options in the same
flow, which discards the answer in `Deciding`. The choice is still on the
log, after the question, and that is what the question was answered with;
the new question is a new one.

The clause on the log is there because the same conflict can come back.
Settle it, assert the refused value again, and the rules ask the same request
with the same options; nothing in `Deciding`'s state tells that question
from the one already answered, so the earlier question and its reply would
stand for it. The ask is in the log, after the utterance, and the earlier
question is overtaken by it.

The last clause reads any utterance, not only a reply. A person who has the
floor and talks about something else has moved on, and the question no longer
waits on them — it is still on the canvas, unanswered. That is also what
happens when they leave a question waiting and start a new conversation: the
run that asked stays paused where it was, and nothing pretends it is still
being answered.

So the wait ends in one of these ways, each of them something that happened
to the matter or something the person said:

| What happened | Read as |
|---|---|
| an option was chosen — on the canvas, in the chat, or by the person's agent | `Deciding: { ?r chosen: _ }`, or a `Deciding/choose` of `?r` on the log since the question |
| the person left it for now | `?r` is in `declined` |
| the conflict went another way, and its question with it | `?r` is not offered: [`AResolvedConflictWithdrawsItsQuestion`](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it) withdrew it |
| a later conflict displaced the options, or asked the same again | `Deciding: { ?r offered: ?options }` no longer binds, or a `Deciding/ask` of `?r` follows the question |
| the person replied in words | an utterance by the person about the question follows it |
| the person talked about something else | another utterance by the person follows it |
| the name or the site still missing was recorded — on the canvas, by the person's agent, or by the model from the person's words | `?s` no longer lacks any of `?f`, or lacks something else as well |

A reply in words is the answer that leaves the matter open, and it is
the answer the person's own agent needs most. An agent handed a question it
does not hold the decision for says so (*that one is for the client*), the
question stays on the person's canvas with the reply beside it, and the
assistant's turn goes on. The same act carries *keep the hospital*, typed in
the composer while the question waits: the person's words, recorded against
the question, which the model then carries out with the withdraw it is
already permitted ([Propagation](propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)).
Declining is not that act. *Leave it for now* takes the question off the
canvas; *I will ask facilities* leaves it there for the person who will.

The turn a reply resumes is the model's to answer in words. Whatever the
reply asked, the model answers it before anything else. *What else is in
the way?* is answered with the other values that cannot be met, because
only one conflict is a question at a time and the rest wait under `unmet`.
It does not put the question again in that turn. The question is still on
the canvas with the reply beside it, and asking it again would treat the
reply as a failure to answer. So `ask` refuses while the latest question
put was replied to or passed over and the person has not spoken since
about something else. That is the same reading `review` makes when it says
a conflict is waiting to be put, and in the next turn the person opens, the
model may put it.

What a reply gives way is the model's to withdraw only where the value
answers no clause the person stated. A clause's negotiability says how
firmly it is meant, not whose it is: a clause read from a document is fixed
until the person relaxes it, and it is still the model's reading. So the
result `ask` returns names, of the options the question offered, those the
model may withdraw and those that are the person's. It reads the same *held
for a reason* the withdraw rule reads
([the permissions](#the-permissions)),
so the model learns before it tries what its withdraw would do.

Nothing is answered by the model. No rule carries `Copiloting/invoke` to
`Deciding/choose`, `Deciding/decline` or a reply, so the model can put the
question and cannot settle it, any more than it could before it had a way to
ask.

### Asking who the quote is for

A quote is addressed: [`APersonRequestsAQuote`](gestures.md#a-quote-is-requested)
needs the person's name and the job's site, and the model's `quote` reads
the same `where`. When everything else holds and one of those is missing,
the person asked for a quote and the turn cannot give them one, and the
only way on is the name or the site, which the model may not invent. That
is a question the turn cannot go past, as a conflict is, and the model puts
it with `ask` and waits. A specification still open or not buildable lacks
more than an addressee, and the question would be the wrong one: the turn
can go on, with a proposal or the conflict, so the rule asks only when the
addressee is all that stands between the specification and the quote.

What the pause buys is the quote. Asked in the reply instead, the question
leaves the turn finished, and the person who fills in the name on the canvas
has made a gesture, after which nothing is run (*Silence*); they would have
to ask for the quote again. Paused, the gesture ends the wait, and the turn
the person opened resumes and requests the quote it was opened for. Words
end it the same way: the model records the name or the site from the
person's reply with `introduce` or `entitle`, which it is permitted, and
requests the quote.

The chat shows the question and links to the addressee on the quote
surface; it does not hold the fields. A conflict's answers moved into the
chat because they are answers to the question and exist only while it is
open. The name and the site are not answers to anything: they are the
person's profile and the job's, entered on the quote surface whether or not
anybody asked, and two places to type them would be two editors for one
fact.

The question is the same move as a conflict's and is put with the same
tool, `ask`, naming its matter: the options for a conflict, the missing
fields for the addressee. The floor, the wait and the ways the wait ends are
one mechanism, and the model has one move to learn. The view carries this
question beside the reason the specification cannot be quoted
(`quotable`), because it is not a `Deciding` request and has no place
among the questions.

### The floor is carried by an interrupt

The model's `ask` tool records the question, then pauses the run with a
LangGraph interrupt that CopilotKit receives as an AG-UI interrupt. The
interrupt carries the question's words, which kind of matter it is about,
and the question as put: for a conflict, its reason and the options. It has no `responseSchema`, because the
resume is not where an answer goes: every answer is one of the gestures
above and is in the log before the run resumes. An AG-UI client that read a
schema there would resume with a payload nobody acts on. The chat renders the waiting question with its answers, watches the
view, and resumes the run as soon as the question no longer awaits an answer,
however that came about. When the tool resumes it reads what happened from
state, not from the resume, and so does a run resumed by another process
after a restart. Words typed in the composer of the conversation the question waits in are
sent as a reply, because the transport refuses a new run while an interrupt
is open.

LangGraph runs a tool's body again from the top when it resumes, so the tool
records the question only when the log holds no `ask` for its own tool call.
The call's identity rides on the invocation (`call`), so the check reads
the log and survives a restart. The words of a reply open a flow of their
own, and whatever the model does next in that turn runs in it, so the canvas
shows *the assistant asked for this in reply to "keep the hospital"* as it would for a
message ([The turn is one flow](gestures.md#the-turn-is-one-flow)).

A gesture that ends the wait resumes a turn the person opened; it does not
start one ([The moves](../moves.md#the-models-moves)).

## What is not here, and why that is the enforcement

These absences carry more weight than any of the rules above.

_No rule lets the model state a requirement in its own words, or strike,
reword or relax one._ No `when { Copiloting/invoke: … }` has
[Specifying](../concepts/specifying.md) or [Binding](../concepts/binding.md)
in its `then`. What the model may do is *read*: `TheModelMayReadARequirement`
([Reading](reading.md)) records a requirement with the words it was read from
and the options it took to answer them, and only when those words are a
passage of the source it cites. The rules there state the words
as a clause and propose the answer. A clause so stated carries the
model as its stater and its source beside it, and only the person's gestures
change, keep or remove it. No rule carries the model's call to `Specifying/adopt`,
so only the person makes a reading theirs, and none to `Binding/substitute`,
so a value the person chose for a reason is not the model's to swap. The
model may still assert a value with no clause behind it, and the canvas says
so beside the value.

_No rule adopts a completion._ `Constraining/complete` changes nothing — it
returns an assignment. The only path from an assignment into
[Asserting](../concepts/asserting.md) runs through `Deciding/choose`, one
value at a time or the whole at once, and only a person performs it. The
model can compute the cheapest buildable lift that honours every assertion
and it cannot make any of it yours.

_No rule commits to a quote._ The model may ask for one, and the offer comes
back issued to the person. No `when { Copiloting/invoke: … }` has
`Quoting/commit` in its `then`, so accepting it is
[`APersonCommitsToAQuote`](gestures.md#the-two-asymmetries) or nothing. The
model can say what the lift would cost and cannot buy it.

_No rule lets the model price anything._ No `when { Copiloting/invoke: … }` has
`Pricing` or `Footprinting` in its `then`. The model can read a price and
cannot set one. Nothing tells it not to.

_No rule lets the model change the catalogue, or the seller's terms._ Same
shape. `Cataloguing/list` and `Cataloguing/delist` are invoked by the wiring
at boot ([Seeding](seeding.md)) and by nothing else, and so are every action
of `Stipulating` and [Detailing](../concepts/detailing.md) and the seller's
`Profiling/introduce`. The model can put the person's name on a proposal and
cannot change what the proposal stipulates. It answers a question about the
product from that record, and what it says in the chat of what a price
covers reaches no concept: an offer carries only the clauses `Stipulating`
holds for the options chosen, so a promise the record does not make is not
in the offer.

None of that is a prohibition, because the DSL has no way to write one. Each is
the absence of a permission, and an action reaches the
[log](../method/implementation.md#the-action-log) only by way of some
synchronization — so an action no rule invokes does not happen. MSM §5.3's
framing dissolves the problem rather than working around it: you do not forbid
the model from setting a price, you decline to authorise it.

The practical difference from a system prompt is that this list is checkable.
"Can the agent change a price?" is answered by grepping the `then` clauses,
not by reasoning about what a model is likely to infer from a paragraph of
English.

## The person's own agent, acting as the person

Which grant an agent gets depends on whose agent it is, not on where it
runs. The in-app assistant is the seller's: it lives on the seller's page,
answers to the seller's prompt, and is a party to the configuration in its
own right. Everything above is written for it, and the absences hold for it.
An agent the person brings — Chrome's own, or Claude Desktop through the
MCP-B relay — is the person's: it acts because they asked it to, and how much
they hand it is theirs to decide, in their own agent, not the seller's to
decide in these rules. So it gets the person's grant, not the model's.

The person's gestures are one table of tools, held by an MCP server beside
the concept layer ([`agent/delegate.py`](../../agent/delegate.py)), at
`/configurator/mcp`. An agent reaches that table from the server or from the
page:

- *An agent that connects to the server*, such as a desktop or web chat client
  the person has added it to, calls the tools there. It needs no page open.
- *An agent in the person's browser* finds the same tools on the page. The
  page reads the table from the server and registers each tool on its WebMCP
  model context (`document.modelContext`), forwarding every call to the
  server ([`src/components/configurator/webmcp.tsx`](../../src/components/configurator/webmcp.tsx)).
  The person's browser agent discovers the seller's page with no setup,
  which is why the page offers the tools as well as the server.

Each call is `Copiloting/gesture`, carrying the same `act` the canvas would
send, under the actor `browser`. Every rule in [Gestures](gestures.md), [Binding](binding.md) and
[Reading](reading.md) matches on the act and not on the actor, so the grant
is the person's grant and no rule is added for it: the person's agent may
file a document, state, reword, relax, settle, move, strike or keep a
clause, answer one, assert or withdraw a value, adopt a proposed value or
the whole completion, answer, decline or reply to a conflict, introduce the person,
entitle the job, request, accept or revoke a quote, and change what the
canvas shows. What a person cannot do it cannot do either: no act reaches
`Cataloguing`, `Pricing`, `Footprinting` or `Stipulating`
([Gestures](gestures.md#what-a-gesture-is-not-allowed-to-be)).

It also gets the model's verbs that a person has no gesture for,
`propose` and `read`, through `Copiloting/invoke` under the same actor. It
reads as the model does, and a read performs nothing: `review`, the digest
the in-app model reads, is how it sees the specification, and `open_quote`
is how it reads an offer before the person accepts it, the same record the
assistant reads ([An offer, read](../moves.md#an-offer-read)), and
`look_up` is how it reads what the seller publishes about an option.
`propose`
asks the solver for the cheapest completion, which comes back as questions
it can then answer as the person would. `read`
is how a requirement it took from a document stays cited: it files the
document as the person, reads from the filed text, and the rules in
[Reading](reading.md) check the words against it exactly as they do for the
assistant. A clause read that way carries the model as its stater, and the
agent keeps it as the person's with `keep` when the person has told it to.
`assert` is not offered a second time through `invoke`; for the person's
agent it is the gesture, and a value it asserts is the person's.

What tells the person from their agent is the actor on the record, not a
rule. `APersonAssertsAValue` writes `person` as the party in both cases,
because the agent asserts as the person; the log's `actor` says who acted,
and the canvas reads it: *you asked for this* and *your agent asked for
this* are one provenance edge under two actors. A flow with `browser` among
its root actors is one that moved while the person was not looking, and the
canvas marks what it reached until the person next acts themselves.

The person's agent may also talk to the assistant, in the chat the person
watches, and so only through the page: `converse` and `listen` are
registered there and are not in the server's table. `converse` says something to it, as the person would in the
composer: the words are a `say` gesture under the agent's actor, and the
page then runs the assistant on them in the open conversation
([The person's own agent speaks in the chat](gestures.md#the-persons-own-agent-speaks-in-the-chat)).
What comes back is the assistant's reply and, when its turn put a question
and waits, the question as put. The agent answers that question as it
answers any: it chooses, leaves it, or replies, and `listen` returns what
the assistant said once its turn went on. While a question waits, the
conversation's floor is the person's, so `converse` says nothing and points
to the answers; while the assistant is still answering, it says nothing
either, and points to `listen`. A turn it started it waits on for a bounded
time, and when the turn runs longer it returns what was said so far, for
`listen` to take up. No rule is added for any of this. The agent speaking is
the person speaking, and the assistant may do in reply exactly what it may
do for the person.

The assistant is told who spoke. Each message the person's agent said
reaches the model marked as the person's agent's words, read from the
`say`'s actor, so the assistant can put each decision to whoever it belongs
to: a question the person's agent cannot settle for them is still put, and
the agent hands it back with a reply.

Every way in is the same actor. The page also loads the MCP-B relay's
embed script, which forwards the model context's tools over localhost to a
relay that an MCP client talks to over stdio, so a client that speaks only
stdio reaches the tab's tools, `converse` among them. A call from there runs
the same handler in the same tab and lands under `browser` too.

The person's agent reports to the person wherever they talk to it, which is
seldom this page. So what the tools return links back to it: every unit
`review` and `open_quote` carry under `at` also carries its URL under
`link`, an issued quote its printable page under `page`, and every result the
URL of the view the call left under `here`
([Links](../ui.md#links)). The server writes these against the page's
public origin, since it has no tab to read one from. An agent that narrowed the canvas, asserted a value
or requested a quote can hand the person the link to it, and the person, or
whoever they forward it to, lands on it. Linking performs nothing, and needs
no rule.

The page registers the server's tools on the model context directly, not as
CopilotKit frontend tools, so the assistant is never offered the person's
gestures; `converse` and `listen`, which are CopilotKit tools, are
registered under an agent id no in-app agent has. `review` and `open_quote`
carry the `readOnlyHint`; the rest carry none, since each changes a fact or
the canvas.

### In the person's own chat, the facts stay facts

An agent retelling the specification in its own words can turn *follows from
that* into *was chosen*, which is the conflation the canvas exists to
prevent. So when the person's client renders MCP Apps, `review` and
`open_quote` come with views: the host shows the specification, or the
offer, beside the agent's reply, rendered from the same read the tool
returned, each item in its kind. The view is a surface of the canvas's,
holding what is the case ([The moves](../moves.md#the-surfaces)), set inside
the person's conversation with their own agent, and its items link back to
the page.

A view can also carry the person's own gestures: keeping or striking a
reading, answering a question, accepting or revoking an offer. Those are
the person's, made by their hand in their own client, so they land under the
actor `person`, as a click on the canvas does, and not under `browser`. The
log then tells *you accepted it, in your own chat* from *your agent accepted
it*. Each is a separate tool whose MCP Apps `visibility` is the view alone,
so the agent is never offered it and calls the `browser` tool of the same
act instead. Nothing is taken from the agent: how much the person delegates
stays theirs to set.

The boundary that makes `person` honest is the host's, not the engine's.
A host that renders MCP Apps keeps a view-only tool off its agent's tool
list. A client that does not render them lists every tool to its model, and
the server, being stateless, cannot tell the one kind of client from the
other, so a view-only tool's description says that only the view calls it
and names the agent's tool for the same act. The server cannot see who
pressed what: an agent that called a view-only tool anyway would be recorded
as the person. In a deployment the server's authentication is what stands
behind the actor, as the page's session does for the canvas.

## The tool names are ours

`assert`, `withdraw`, `read`, `propose`, `introduce`, `entitle`, `quote`, `show`,
`hide`, `frame`, `unframe`: a verb per thing the model may do, against the
CopilotKit starter's single `manage_todos`, and the difference is the one
[Action](../method/action.md) draws: a log of these says what happened, and a
log of the one says only that something did.

The tool string and the Python function differ, and only in one direction:
Python reserves `assert`, so `agent/tools.py` defines `assert_value` and passes
`tool="assert"`. What the rule matches on, and what the model sees named in its
own tool list, are two different things, and neither is the concept's action
name — [`Asserting/assert`](../concepts/asserting.md) is reached only through
the rule.

That the tools are shaped by CopilotKit's conventions does not make their
names, arguments or granularity the vendor's responsibility —
[the two-tier policy is explicit about this](../method/boundaries.md#what-the-policy-does-not-excuse).

## See also

- [Code of conduct](../method/conduct.md) — the structure this is an instance of
- [Copiloting](../concepts/copiloting.md) — the bootstrap, and the model's root action
- [Propagation](propagation.md) — what happens after a value is asserted

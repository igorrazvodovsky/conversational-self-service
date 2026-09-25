# Conduct

What the model may do, stated positively. See [the index](README.md) and
[Code of conduct](../method/conduct.md) for why it is stated that way.

## The permissions

```
sync TheModelMayAssertAValue
when  { Copiloting/invoke: [ tool: "assert" ;
          spec: ?s ; variable: ?v ; option: ?o ] => [] }
then  { Asserting/assert: [ party: model ;
          spec: ?s ; variable: ?v ; option: ?o ] }

sync TheModelMayWithdrawAnAssertion
when  { Copiloting/invoke: [ tool: "withdraw" ;
          spec: ?s ; variable: ?v ] => [] }
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
where { ?t is one of assert, withdraw, propose, quote, show, hide, frame, unframe }
then  { Moding/focus: [ surface: canvas ] }
```

The `party` in the first rule is what distinguishes it from
[`APersonAssertsAValue`](gestures.md) in the state as well as in the trace. Two
rules, two parties, one action — and `Asserting.assertedBy` records which,
independently of the provenance edge the log already carries. The edge is finer:
`APersonAssertsAValue` and `AnAdoptedValueBecomesAnAssertion` are two
different things a person did, and both write `person`.

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
assertion, with the sections kept, and saying so in a sentence — rather
than by eleven values in a chat bubble. The tool passes the same frame value
a person's click passes, and the rule carries it without looking inside.

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
        Deciding: { ?p offered: { ?value } }, and ?p is neither chosen nor declined }
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
        Deciding: { ?p offered: _ }, and ?p is neither chosen nor declined }
then  { Deciding/decline: [ request: ?p ] }
```

```
sync AChangedSpecificationWithdrawsItsProposal
when  { Asserting/assert: [ spec: ?s ; variable: ?v ; option: ?o ] => [ spec: ?s ]
        Asserting/withdraw: [ spec: ?s ] => [ spec: ?s ] }
where { Deciding: { [ spec: ?s ; about: "completion" ] offered: { ?a } }
        for an assertion, ?a does not map ?v to ?o
        ?r is that request, and every [ spec: ?s ; about: "completion" ; variable: _ ]
          Deciding holds }
then  { Deciding/withdraw: [ request: ?r ] }

sync ASettledVariableRetiresItsProposedValue
when  { Constraining/assume: [ spec: ?s ] => [ spec: ?s ; settled: ?q ]
        Constraining/incline: [ spec: ?s ] => [ spec: ?s ; settled: ?q ] }
where { ?p is [ spec: ?s ; about: "completion" ; variable: ?v ]
        Deciding: { ?p offered: _ }, and ?p is neither chosen nor declined
        ?v is asserted of ?s, or ?q maps ?v
        Deciding: { [ spec: ?s ; about: "completion" ] chosen: _ } does not bind }
then  { Deciding/withdraw: [ request: ?p ] }
```

### The unit of adoption is a value, and the whole is a shortcut

A completion is one answer from the solver: an assignment of every variable
that honours every rule and every assumption at the least cost. What it
contains is two kinds of value. Some are settled by the rules given what has
been asserted, and the canvas already shows those under *follows from that*;
adopting them would turn an entailment into a demand, and no rule here does
that. The rest are choices the rules leave open, and they are the only thing
the person is being asked about. `AProposedValueIsPutToThePerson` puts each of
those to them separately, as a request naming the variable, with the
proposal's value as its one option: *the assistant proposes 1000 kg for the
rated load; take it or not*. On the canvas that is a line beside each variable
in *still open*.

Nothing about the solver's answer requires the open values to be taken
together. Assert any one of them and the rest of the assignment still holds:
every rule was satisfied by the whole, so the whole is still a satisfying
choice once part of it is assumed, and every choice the new assumption
excludes was available before and cost no less. The remaining values are
still the cheapest way to finish the specification that was proposed. That
is why a proposal survives its own adoption one value at a time, and why
`AChangedSpecificationWithdrawsItsProposal` leaves it in place when an
assertion is one the proposal already holds, whoever made it. What the
person cannot do is take a value the proposal did not offer and keep the
proposal: an assertion that differs from it, or a withdrawal, moves the
state the completion was computed against, and then the proposal is about
nothing. Ask again and there is one for the state you are in, which is the
counter-proposal: the person's own assertion, and the model's answer to it.

The alternative was a single act on a single bundle, which is what a
completion of thirty-odd variables used to be here, and the literature on
proposal surfaces is against it. Li, Zhang, Wang and Lu's study of
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

The whole stays, as a shortcut over the parts. Thirty separate acts is the
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

### A proposal lasts as long as the state it assumed

A completion is computed against the assumptions holding when `propose` ran.
Let the specification move underneath it and adopting it restates values chosen
for a state that has gone — including, in the worst case, the very assertion
the person just gave up to resolve a conflict. The proposal is not wrong so
much as no longer about anything, and a stale proposal is worse than none: it
carries the authority of *the assistant worked this out* and the content of a
state nobody is in.

So `AChangedSpecificationWithdrawsItsProposal` takes the completion and every
proposed value off the record on any change the proposal did not already hold.
The case arises because a conflict and a completion can be open together,
because a request is `[ spec ; about ]` and the two questions are distinct
requests.

A proposed value can also stop being a question without the proposal going
stale. Assert one value from it and the rules may settle another the
proposal had left open, to the value it proposed; the request for that
variable now asks about a choice nobody has. `ASettledVariableRetiresItsProposedValue`
withdraws it, as
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
so thirty-odd questions are asked and answered without a loop appearing
anywhere.

### The two approximations in that `where` clause

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

_Carbon._ Embodied carbon is already one number per option. The use phase is
a lookup on energy class, usage profile and travel height together, and over
twenty-five years it is the larger half. The rule charges it to each of those
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

### Reading across concepts

`TheModelMayProposeACompletion` reads two other concepts' state in its `where`
clause, which is exactly what a `where` clause is for and exactly what a
concept action may not do. `Constraining` is handed a cost function and never
learns that money exists; `Pricing` is never asked to solve anything. That the
coupling is possible at all without either concept knowing the other is
WYSIWID §7.2's first and third design rules doing their work together.

## What is not here, and why that is the enforcement

Five absences carry more weight than any of the rules above.

_No rule lets the model state a requirement, or say what a value is for._ No
`when { Copiloting/invoke: … }` has [Specifying](../concepts/specifying.md) or
[Binding](../concepts/binding.md) in its `then`. A clause is in the person's
words and only the person writes one; which value answers it is the person's
mapping, and only the person's pick reaches `Binding/propose`. The model may
assert a value with no clause behind it, and the canvas says so beside the
value. When the case's `Reading` arrives a model's
reading of an utterance will enter `Specifying` through a gate the person
holds; until then the absence is the gate.

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
of `Stipulating` and the seller's `Profiling/introduce`. The model can put
the person's name on a proposal and cannot change what the proposal
stipulates.

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

## A browser agent, on the same terms

The ten verbs and the reading are also registered on the page's WebMCP model
context (`document.modelContext`), through `useFrontendTool` with `webmcp`
set ([`src/components/configurator/webmcp.tsx`](../../src/components/configurator/webmcp.tsx)).
A browser agent that visits the page — Chrome's own, or any other that
speaks WebMCP — finds the same tools the in-app assistant has, under the
same names, with the same descriptions, and nothing else.

Each call is `Copiloting/invoke` with the actor `browser`, reaching the
engine at `POST /configurator/invoke` as the assistant's calls reach it from
`agent/tools.py`. Every rule above matches on the tool and not on the actor,
so the grant is the same grant: a browser agent may assert, withdraw,
propose, introduce, entitle, quote, show, hide, frame and unframe, and the
five absences hold for it exactly as they hold for the assistant. No rule
carries its invocation to `Deciding/choose`, `Quoting/commit`, `Specifying`
or `Binding`. It can fill the specification in, and it cannot adopt a
proposal, accept an offer or state what the person requires — which is what
makes the tools safe to hand to an agent nobody here wrote. The exposure
adds no rule; it adds a second actor to rules that already existed.

What tells the two models apart is the actor on the record, not a rule.
`Asserting.assertedBy` writes `model` for both, because both are a model
asserting on the person's behalf; the log's `actor` says which, and the
canvas reads it: *the assistant asked for this* and *a browser agent asked
for this* are one provenance edge under two actors. "The model" in the rule
names is a role, and two things fill it.

A desktop client is the same actor. The page also loads the MCP-B relay's
embed script, which forwards the model context's tools over localhost to a
relay that any MCP client — Claude Desktop, say — talks to over stdio. A
call from there runs the same handler in the same tab and lands under
`browser` too: the rules do not know, and do not need to know, whether the
model that asked lives in the browser or beside it.

The tools are registered under an agent id no in-app agent has, so the
assistant is never offered a second copy of its own tools as frontend tools.
`review` carries the WebMCP `readOnlyHint`; the rest carry none, since each
changes a fact or the canvas.

## The tool names are ours

`assert`, `withdraw`, `propose`, `introduce`, `entitle`, `quote`, `show`,
`hide`, `frame`, `unframe`. Ten, against the CopilotKit starter's one
`manage_todos`, and the difference is the one [Action](../method/action.md)
draws: a log of the ten says what happened, and a log of the one says only
that something did.

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
- [Copiloting](../concepts/copiloting.md) — the bootstrap, and the second root actor
- [Propagation](propagation.md) — what happens after a value is asserted

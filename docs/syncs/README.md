# The synchronizations

Every way two [concepts](../concepts/README.md) of this application interact.
Concepts never call each other; these rules do the calling, and neither concept
in a rule knows the other exists. The form and its authority are in
[Synchronization](../method/synchronization.md).

```
sync Name
when  { Concept/action: [ input: ?var ] => [ output: ?var ] }
where { Concept: { ?individual relation: ?var } }
then  { Concept/action: [ input: ?var ] }
```

`when` matches action completions, `where` queries concept state and performs
calculations and is the only optional clause, `then` lists invocations.
Variables carry a `?` and are scoped across the whole rule. Every action
matched in one `when` shares a flow token, and everything in `then` inherits
it.

## The rules

| Rule | Where |
|---|---|
| `TheCatalogueSeedsTheSolver` | [Seeding](seeding.md) |
| `ADelistedOptionLeavesTheSolver` | [Seeding](seeding.md) |
| `APersonStartsASpecification` | [Gestures](gestures.md) |
| `APersonSays` | [Gestures](gestures.md) |
| `APersonAssertsAValue` | [Gestures](gestures.md) |
| `APersonWithdrawsAnAssertion` | [Gestures](gestures.md) |
| `APersonDiscardsTheSpecification` | [Gestures](gestures.md) |
| `APersonAnswersAQuestion` | [Gestures](gestures.md) |
| `APersonDeclinesToAnswer` | [Gestures](gestures.md) |
| `APersonFocusesASurface` | [Gestures](gestures.md) |
| `APersonShowsAFacet` | [Gestures](gestures.md) |
| `APersonHidesAFacet` | [Gestures](gestures.md) |
| `APersonFramesTheCanvas` | [Gestures](gestures.md) |
| `APersonUnframesTheCanvas` | [Gestures](gestures.md) |
| `APersonIntroducesThemselves` | [Gestures](gestures.md) |
| `APersonEntitlesTheJob` | [Gestures](gestures.md) |
| `APersonRequestsAQuote` | [Gestures](gestures.md) |
| `APersonCommitsToAQuote` | [Gestures](gestures.md) |
| `APersonRevokesAQuote` | [Gestures](gestures.md) |
| `APersonStatesAClause` | [Gestures](gestures.md) |
| `APersonSettlesAClause` | [Gestures](gestures.md) |
| `APersonRelaxesAClause` | [Gestures](gestures.md) |
| `APersonStrikesAClause` | [Gestures](gestures.md) |
| `APersonRewordsAClause` | [Gestures](gestures.md) |
| `APersonMovesAClause` | [Gestures](gestures.md) |
| `APersonAnswersAClause` | [Binding](binding.md) |
| `APersonSubstitutesAnAnswer` | [Binding](binding.md) |
| `AStartedSpecificationIsOpened` | [Binding](binding.md) |
| `ADiscardedSpecificationIsClosed` | [Binding](binding.md) |
| `AChoiceReachesTheAssertions` | [Binding](binding.md) |
| `ASubstituteReachesTheAssertions` | [Binding](binding.md) |
| `AWithdrawnValueRetractsItsChoices` | [Binding](binding.md) |
| `AnOverwrittenValueRetractsItsChoices` | [Binding](binding.md) |
| `AStruckClauseReleasesItsChoices` | [Binding](binding.md) |
| `ANewSpecificationIsGivenToTheSolver` | [Propagation](propagation.md) |
| `ADiscardedSpecificationLeavesTheSolver` | [Propagation](propagation.md) |
| `ADiscardedSpecificationsQuestionsAreWithdrawn` | [Propagation](propagation.md) |
| `AssertionsReachTheSolver` | [Propagation](propagation.md) |
| `ANegotiableAnswerReachesTheSolverSoftly` | [Propagation](propagation.md) |
| `AWithdrawalReachesTheSolver` | [Propagation](propagation.md) |
| `ASettledClauseSoftensItsAnswer` | [Propagation](propagation.md) |
| `ASettledClauseHardensItsAnswer` | [Propagation](propagation.md) |
| `ARetractedChoiceHardensItsValue` | [Propagation](propagation.md) |
| `AConflictIsPutToThePerson` | [Propagation](propagation.md) |
| `UnmetAssertionsAreTriedAgain` | [Propagation](propagation.md) |
| `TheConcededAssertionIsWithdrawn` | [Propagation](propagation.md) |
| `AResolvedConflictWithdrawsItsQuestion` | [Propagation](propagation.md) |
| `AnIssuedQuoteIsShown` | [Propagation](propagation.md) |
| `AWithdrawnAssertionUnframesTheCanvas` | [Propagation](propagation.md) |
| `ADiscardedSpecificationUnframesTheCanvas` | [Propagation](propagation.md) |
| `TheModelMayAssertAValue` | [Conduct](conduct.md) |
| `TheModelMayWithdrawAnAssertion` | [Conduct](conduct.md) |
| `TheModelMayProposeACompletion` | [Conduct](conduct.md) |
| `TheModelMayIntroduceThePerson` | [Conduct](conduct.md) |
| `TheModelMayEntitleTheJob` | [Conduct](conduct.md) |
| `TheModelMayRequestAQuote` | [Conduct](conduct.md) |
| `TheModelMayShowAFacet` | [Conduct](conduct.md) |
| `TheModelMayHideAFacet` | [Conduct](conduct.md) |
| `TheModelMayFrameTheCanvas` | [Conduct](conduct.md) |
| `TheModelMayUnframeTheCanvas` | [Conduct](conduct.md) |
| `ACompletionIsPutToThePerson` | [Conduct](conduct.md) |
| `AnAdoptedCompletionBecomesAssertions` | [Conduct](conduct.md) |
| `AChangedSpecificationWithdrawsItsProposal` | [Conduct](conduct.md) |
| `TheCanvasIsShownBeforeItChanges` | [Conduct](conduct.md) |

## Seeding

The catalogue arrives as a file and leaves as facts in six concepts — the
seller's profile and terms among them. Which of those are
reached by a rule, and which by the wiring at boot, is a question about what
depends on what — worked through in [Seeding](seeding.md).

## What a person may do

Every click, and every chat message, is one root action carrying an `act`, and
these twenty-five rules decide what follows from it. There is no HTTP route per
concept action, and [Gestures](gestures.md) says why that matters — as does why
the vocabulary of acts is ours and lives there, and why the chat message is
performed before the model node of the graph rather than from the browser.

## A clause is answered

What a person requires, in their own words, lives in
[Specifying](../concepts/specifying.md); which value answers each clause lives
in [Binding](../concepts/binding.md); and the value itself is an assertion
like any other. One gesture answers a clause with an option, two rules decide
whether that is a first answer or a substitution, two more carry the choice
into `Asserting` — the person having done the mapping by picking the option —
and three retract a choice whose value was withdrawn, overwritten or whose
clause was struck. Nothing carries a choice out of `Binding` except by way of
an assertion changing. See [Binding](binding.md).

## An offer is held still

A quote is a third kind of fact beside the asserted and the entailed: a
snapshot with a price and its terms, which the specification can move away
from without changing. One rule issues it, to the person, when every variable
is settled, nothing asserted is unmet, the person is named and the job has a
site; one lets the person accept it; one lets them revoke it; and one gives
the quote surface the viewer's attention when a quote is issued. Two more let
the person say who they are and where the lift is going, which is what makes
the proposal addressed. The model may ask for one and may not accept it, which is the
[second asymmetry](gestures.md#the-two-asymmetries).

## Assertions reach the solver

What a party asserts lives in [Asserting](../concepts/asserting.md); what
follows from it lives in [Constraining](../concepts/constraining.md). Three
rules carry the first into the second, and they are the only path between
them: a value reaches the solver hard, or softly when every clause it answers
is negotiable, and a withdrawal releases it. Which of the first two fires is
read from the person's own tag on the clause, and three more rules move a
value between the two strengths when the tag changes or the clause goes. See
[Propagation](propagation.md#assertions-reach-the-solver).

## A conflict is put to the person

When an assumption cannot hold, nothing is dropped without an account. The
rules that cannot hold together are recorded against the variable and reach the
card; when two or more assertions took part they also become the options of a
question, and the person answers it. A lone refusal has nothing to choose
between and raises no question — the account appears, the banner does not. See
[Propagation](propagation.md#when-assertions-cannot-hold-together).

## What the canvas shows

Which facts the canvas shows beside each item — a price on every option, the
rule that struck one through, the requirement a value answers — lives in
[Showing](../concepts/showing.md), and both actors may change it on the same
terms: two gestures, two tool permissions, and no fact of the specification
touched by any of the four. Which items it shows — narrowed to what followed
from one assertion, or everything — is [Framing](../concepts/framing.md),
reached the same way, plus two rules that take a frame away when the
assertion it framed is withdrawn or the specification discarded. See
[Gestures](gestures.md#what-the-canvas-shows-is-chosen),
[Conduct](conduct.md#what-the-canvas-shows) and
[Propagation](propagation.md#a-frame-goes-with-what-it-framed).

## What the model may do

The model is a second root actor, and every one of its invocations reaches a
concept action by way of a rule that says it may. There is no rule that lets it
adopt a completion, commit to a quote, change a price, or list a catalogue
option, and that is the whole of the enforcement. A browser agent reaching
the page through WebMCP performs the same root action under its own actor,
and the same rules decide what follows. See [Conduct](conduct.md).

## Checking these against the design rules

WYSIWID §7.2's third rule — synchronizations only access concept states and
actions — is the one a rule can break on its own.

Every `then` above names an action of a concept specified in
[`../concepts/`](../concepts/README.md). None targets a setter, a React state
hook, or a field of an agent state object. That is the difference from the
CopilotKit starter, where the single write action is `agent.setState` and a
rule expressing it would have to name it.

## See also

- [Synchronization](../method/synchronization.md) — the form, and why it replaced an earlier one
- [Code of conduct](../method/conduct.md) — why a prohibition is written as a withheld permission
- [The concepts](../concepts/README.md) — what these rules mediate between

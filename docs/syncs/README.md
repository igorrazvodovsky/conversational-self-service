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
| `TheSellerIsIntroduced` | [Seeding](seeding.md) |
| `TheSellersTermsAreStipulated` | [Seeding](seeding.md) |
| `TheCatalogueIsListed` | [Seeding](seeding.md) |
| `TheCatalogueIsPriced` | [Seeding](seeding.md) |
| `TheCatalogueIsFootprinted` | [Seeding](seeding.md) |
| `TheCatalogueSetsTheRules` | [Seeding](seeding.md) |
| `TheCatalogueSaysHowToWorkThingsOut` | [Seeding](seeding.md) |
| `TheCatalogueSetsTheSteps` | [Seeding](seeding.md) |
| `TheWorkspaceIsLaidOut` | [Seeding](seeding.md) |
| `ASpecificationIsStartedAtBoot` | [Seeding](seeding.md) |
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
| `APersonFilesADocument` | [Reading](reading.md) |
| `TheModelMayReadARequirement` | [Reading](reading.md) |
| `AReadItemBecomesAClause` | [Reading](reading.md) |
| `AReadAnswerIsProposed` | [Reading](reading.md) |
| `AReadQuantityIsWorkedOut` | [Reading](reading.md) |
| `AWorkedOutQuantityIsProposed` | [Reading](reading.md) |
| `APersonKeepsAReading` | [Reading](reading.md) |
| `ARewordedReadingIsKept` | [Reading](reading.md) |
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
| `ANewQuoteSupersedesTheOpenOnes` | [Propagation](propagation.md) |
| `AFramedRequirementShowsTheConfiguration` | [Propagation](propagation.md) |
| `AFramedGapShowsTheConfiguration` | [Propagation](propagation.md) |
| `AWithdrawnAssertionUnframesTheCanvas` | [Propagation](propagation.md) |
| `AStruckClauseUnframesTheCanvas` | [Propagation](propagation.md) |
| `ADiscardedSpecificationUnframesTheCanvas` | [Propagation](propagation.md) |
| `TheModelMayAssertAValue` | [Conduct](conduct.md) |
| `TheModelMayWithdrawAnAssertion` | [Conduct](conduct.md) |
| `AProposalAsksWhatToFinishFor` | [Conduct](conduct.md) |
| `TheModelMayProposeACompletion` | [Conduct](conduct.md) |
| `TheModelMayRecordTheGoalThePersonGave` | [Conduct](conduct.md) |
| `AChosenGoalFinishesTheSpecification` | [Conduct](conduct.md) |
| `AGoalIsNotAskedOnceNothingIsOpen` | [Conduct](conduct.md) |
| `TheModelMayIntroduceThePerson` | [Conduct](conduct.md) |
| `TheModelMayEntitleTheJob` | [Conduct](conduct.md) |
| `TheModelMayRequestAQuote` | [Conduct](conduct.md) |
| `TheModelMayShowAFacet` | [Conduct](conduct.md) |
| `TheModelMayHideAFacet` | [Conduct](conduct.md) |
| `TheModelMayFrameTheCanvas` | [Conduct](conduct.md) |
| `TheModelMayUnframeTheCanvas` | [Conduct](conduct.md) |
| `ACompletionIsPutToThePerson` | [Conduct](conduct.md) |
| `AProposedValueIsPutToThePerson` | [Conduct](conduct.md) |
| `AnAdoptedCompletionIsTakenValueByValue` | [Conduct](conduct.md) |
| `AnAdoptedValueBecomesAnAssertion` | [Conduct](conduct.md) |
| `ADeclinedCompletionIsDeclinedValueByValue` | [Conduct](conduct.md) |
| `AnOvertakenProposedValueIsRetired` | [Conduct](conduct.md) |
| `AnEmptiedProposalIsWithdrawn` | [Conduct](conduct.md) |
| `TheCanvasIsShownBeforeItChanges` | [Conduct](conduct.md) |
| `TheModelMayAskThePerson` | [Conduct](conduct.md) |
| `TheModelMayAskWhoTheQuoteIsFor` | [Conduct](conduct.md) |
| `APersonRepliesToAQuestion` | [Conduct](conduct.md) |
| `APersonHandsOver` | [Handover](handover.md) |
| `TheModelMayHandOver` | [Handover](handover.md) |
| `AChangedClauseStalesItsAnswers` | [Staling](staling.md) |
| `AMovedAssertionStalesTheOpenOffers` | [Staling](staling.md) |
| `APersonClearsAStaleItem` | [Staling](staling.md) |
| `AStartedSpecificationGetsItsSteps` | [Stepping](stepping.md) |
| `ADiscardedSpecificationLosesItsSteps` | [Stepping](stepping.md) |
| `APersonTakesAStep` | [Stepping](stepping.md) |
| `ATakenStepFramesTheCanvas` | [Stepping](stepping.md) |
| `AFramedStepShowsTheConfiguration` | [Stepping](stepping.md) |
| `APersonFinishesAStep` | [Stepping](stepping.md) |
| `APersonSkipsAStep` | [Stepping](stepping.md) |
| `APersonReopensAStep` | [Stepping](stepping.md) |
| `APersonReassignsAStep` | [Stepping](stepping.md) |
| `APersonRenamesAStep` | [Stepping](stepping.md) |
| `APersonAddsAStep` | [Stepping](stepping.md) |

## Seeding

The catalogue arrives as a file, and the application's start is a stimulus of
the bootstrap concept that carries it. Rules take it from there into each
concept that holds a fact of it, the seller's profile and terms among them,
so the catalogue's arrival reaches the log the way a click does. Which rule
hangs off the stimulus and which off another concept's action is a question
about what follows from what, worked through in [Seeding](seeding.md).

## What a person may do

Every click, and every chat message, is one root action carrying an `act`, and
these rules decide what follows from it. There is no HTTP route per
concept action, and [Gestures](gestures.md) says why that matters — as does why
the vocabulary of acts is ours and lives there, and why the chat message is
performed before the model node of the graph rather than from the browser.

## A clause is answered

What a person requires, in their own words, lives in
[Specifying](../concepts/specifying.md); which value answers each clause lives
in [Binding](../concepts/binding.md); and the value itself is an assertion
like any other. One gesture answers a clause with an option, rules decide
whether that is a first answer or a substitution, others carry the choice
into `Asserting` — the person having done the mapping by picking the option —
and more retract a choice whose value was withdrawn, overwritten or whose
clause was struck. Nothing carries a choice out of `Binding` except by way of
an assertion changing. See [Binding](binding.md).

## A source is read

A document the person attaches lives in [Filing](../concepts/filing.md), as
their words live in [Conversing](../concepts/conversing.md), and what the
model read from either lives in [Reading](../concepts/reading.md): the words,
their source, and the options it took to answer them. One rule lets the model
record a reading; one states the reading as a clause, with the model as its
stater; one proposes its answer, from where the binding rules assert it. A count or
a measure the words state is read as a quantity, and two more rules work it
out by the catalogue's methods and answer the clause with the option whose
range contains the result, so the model never does the arithmetic. The
reading lands at once and the person corrects it with the gestures they
already have, which is the gate in this composition; the gated form is the
same rules with one trigger moved. A reading is the assistant's until the
person keeps or rewords it, which makes it theirs. Whether a reading was wrong is not a fact
any rule establishes, and the note says what is read instead. See
[Reading](reading.md).

## An offer is held still

A quote is another kind of fact beside the asserted and the entailed: a
snapshot with a price and its terms, which the specification can move away
from without changing. One rule issues it, to the person, when every variable
is settled, nothing asserted is unmet, the person is named and the job has a
site; one lets the person accept it; one lets them revoke it; one revokes the
quotes still open to the same party for the same job when a new one is
issued, so a new quote is a revision rather than an alternative; and one
gives the quote surface the viewer's attention when a quote is issued. Others let
the person say who they are and where the lift is going, which is what makes
the proposal addressed. The model may ask for one and may not accept it, which is one of the things
[only a person may do](gestures.md#the-two-asymmetries).

## A specification is handed over

When what the person wants is something no rule lets the assistant do and no
gesture lets them do either, the specification goes to the seller. One rule
lets the person hand it over, with the reason; one lets the model, at the
person's word, with the same action and the same parties. Nothing travels
but the specification itself: what the seller needs in order to take it up
is already on the log, as provenance and as utterances. No rule receives a
handover, because the seller has no surface here. See
[Handover](handover.md).

## Where the person is in the job

The seller's template of steps arrives with the catalogue, and a
specification gets one step of each when it is opened. The person takes a
step, which narrows the canvas to what the step is about, finishes or
skips one with a reason, reopens, reassigns, renames or adds one, and
every gesture is recorded as made: no rule has a step's status in its
`where`, so the steps are a map and not a script. What a step
still wants is a read over the variables' standing, and the model asks
about the step the person is at, in its turn, from `review`. See
[Stepping](stepping.md).

## What is out of date is marked

An answer whose requirement was reworded or relaxed, and an open offer whose
asked-for values have moved since it was issued, are marked stale with the
change that did it, and the mark stays until the person takes it off; nothing
is recomputed into currency, and no rule lets the model clear a mark. See
[Staling](staling.md).

## Assertions reach the solver

What a party asserts lives in [Asserting](../concepts/asserting.md); what
follows from it lives in [Constraining](../concepts/constraining.md). Rules
carry the first into the second, and they are the only path between
them: a value reaches the solver hard, or softly when every clause it answers
is negotiable, and a withdrawal releases it. Which strength it reaches the solver with is read from the person's own tag on the clause, and more rules move a
value between the strengths when the tag changes or the clause goes. See
[Propagation](propagation.md#assertions-reach-the-solver).

## A conflict is put to the person

When an assumption cannot hold, nothing is dropped without an account. The
rules that cannot hold together are recorded against the variable and reach the
value where it is drawn; when two or more assertions took part they also become the options of a
question, and the person answers it. A lone refusal has nothing to choose
between and raises no question — the account appears, the banner does not. See
[Propagation](propagation.md#when-assertions-cannot-hold-together).

## What the canvas shows

Which facts the canvas shows beside each item — a price on every option, the
rule that struck one through, the requirement a value answers — lives in
[Showing](../concepts/showing.md), and both actors may change it on the same
terms: gestures, tool permissions, and no fact of the specification
touched by any of them. Which items it shows — narrowed to what followed
from one assertion, to one requirement, to one gap, or everything — is
[Framing](../concepts/framing.md), reached the same way, plus rules that
take a frame away when the assertion it framed is withdrawn, the clause it
framed struck, or the specification discarded, and that bring the
specification forward when a requirement or a gap is framed. See
[Gestures](gestures.md#what-the-canvas-shows-is-chosen),
[Conduct](conduct.md#what-the-canvas-shows) and
[Propagation](propagation.md#a-frame-goes-with-what-it-framed).

## What the model may do

The model is a root actor too, and every one of its invocations reaches a
concept action by way of a rule that says it may. There is no rule that lets it
adopt a completion, commit to a quote, change a price, or list a catalogue
option, and that is the whole of the enforcement. It may put a
conflict to the person and wait on it, and only the person settles it. An agent the person
brings, reaching the configurator over MCP, is not the model: it acts as the
person, through their gestures under its own actor, and the person's rules
decide what follows. See [Conduct](conduct.md#the-persons-own-agent-acting-as-the-person).

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

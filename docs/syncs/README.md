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
| `ANewSpecificationIsGivenToTheSolver` | [Propagation](propagation.md) |
| `ADiscardedSpecificationLeavesTheSolver` | [Propagation](propagation.md) |
| `ADiscardedSpecificationsQuestionsAreWithdrawn` | [Propagation](propagation.md) |
| `AssertionsReachTheSolver` | [Propagation](propagation.md) |
| `PreferencesReachTheSolverSoftly` — registered, reached by nothing | [Propagation](propagation.md) |
| `AWithdrawalReachesTheSolver` | [Propagation](propagation.md) |
| `AConflictIsPutToThePerson` | [Propagation](propagation.md) |
| `UnmetAssertionsAreTriedAgain` | [Propagation](propagation.md) |
| `TheConcededAssertionIsWithdrawn` | [Propagation](propagation.md) |
| `TheModelMayAssertAValue` | [Conduct](conduct.md) |
| `TheModelMayWithdrawAnAssertion` | [Conduct](conduct.md) |
| `TheModelMayProposeACompletion` | [Conduct](conduct.md) |
| `ACompletionIsPutToThePerson` | [Conduct](conduct.md) |
| `AnAdoptedCompletionBecomesAssertions` | [Conduct](conduct.md) |
| `AChangedSpecificationWithdrawsItsProposal` | [Conduct](conduct.md) |
| `TheCanvasIsShownBeforeItChanges` | [Conduct](conduct.md) |

## Seeding

The catalogue arrives as a file and leaves as facts in four concepts. Which of
those four are reached by a rule, and which by the wiring at boot, is a
question about what depends on what — worked through in
[Seeding](seeding.md).

## What a person may do

Every click, and every chat message, is one root action carrying an `act`, and
these eight rules decide what follows from it. There is no HTTP route per
concept action, and [Gestures](gestures.md) says why that matters — as does why
the vocabulary of acts is ours and lives there, and why the chat message is
performed before the model node of the graph rather than from the browser.

## Assertions reach the solver

What a party asserts lives in [Asserting](../concepts/asserting.md); what
follows from it lives in [Constraining](../concepts/constraining.md). Two
rules carry the first into the second, and they are the only path between them.
A third is registered and reached by nothing, which
[Propagation](propagation.md#the-rule-that-is-registered-and-reached-by-nothing)
argues for rather than hides.

## A conflict is put to the person

When an assumption cannot hold, nothing is dropped without an account. The
rules that cannot hold together are recorded against the variable and reach the
card; when two or more assertions took part they also become the options of a
question, and the person answers it. A lone refusal has nothing to choose
between and raises no question — the account appears, the banner does not. See
[Propagation](propagation.md#when-assertions-cannot-hold-together).

## What the model may do

The model is a second root actor, and every one of its invocations reaches a
concept action by way of a rule that says it may. There is no rule that lets it
adopt a completion, change a price, or list a catalogue option, and that is the
whole of the enforcement. See [Conduct](conduct.md).

## Checking these against the design rules

WYSIWID §7.2's third rule — synchronizations only access concept states and
actions — is the one a rule can break on its own.

Every `then` above names an action of a concept specified in
[`../concepts/`](../concepts/README.md). None targets a setter, a React state
hook, or a field of an agent state object. That is the difference from the
starter this application replaces, where the single write action was
`agent.setState` and a rule expressing it would have had to name it.

## See also

- [Synchronization](../method/synchronization.md) — the form, and why it replaced an earlier one
- [Code of conduct](../method/conduct.md) — why a prohibition is written as a withheld permission
- [The concepts](../concepts/README.md) — what these rules mediate between

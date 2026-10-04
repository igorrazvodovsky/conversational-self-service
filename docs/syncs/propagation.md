# Propagation

How what a party asserts reaches the solver, and how a conflict comes back.
See [the index](README.md).

## Assertions reach the solver

```
sync AssertionsReachTheSolver
when  { Asserting/assert: [ spec: ?s ; variable: ?v ; option: ?o ]
          => [ spec: ?s ; variable: ?v ; option: ?o ] }
where { ?o is not held softly in ?s }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }

sync ANegotiableAnswerReachesTheSolverSoftly
when  { Asserting/assert: [ spec: ?s ; variable: ?v ; option: ?o ]
          => [ spec: ?s ; variable: ?v ; option: ?o ] }
where { ?o is held softly in ?s }
then  { Constraining/incline: [ spec: ?s ; variable: ?v ; option: ?o ] }

sync AWithdrawalReachesTheSolver
when  { Asserting/withdraw: [ spec: ?s ; variable: ?v ]
          => [ spec: ?s ; variable: ?v ] }
then  { Constraining/release: [ spec: ?s ; variable: ?v ] }
```

where *held softly* is one calculation, shared by the rules on this page:

```
?o is held softly in ?s
  iff  Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch value: ?o }
         binds at least one ?ch,
  and  for every such ?ch, with ?ch answers: ?c,
         Specifying: { ?c negotiability: "negotiable" }
```

and *met* is the other, read by the rules and the canvas alike:

```
?v -> ?o is met in ?s
  iff  Constraining: { ?s assumed: ?v -> ?o }
  or   Constraining: { ?s inclined: ?v -> ?o } and nothing is refused against ?v
```

These rules run one direction. Nothing carries anything from
[Constraining](../concepts/constraining.md) back into
[Asserting](../concepts/asserting.md) except by way of a person answering a
question, and that asymmetry is the design.

### Which strength a value reaches the solver with is a fact of the state

<a id="which-of-the-first-two-fires-is-a-fact-of-the-state"></a>
One completion, rules with complementary `where` clauses, and no field on
the assertion says which. Strength is a fact of a *clause*, which is
[Specifying](../concepts/specifying.md)'s `negotiability`, and not of an
assertion: `Asserting` records the value and nothing about how firmly it is
meant, so the rule has to look up what the value is *for*. That lookup is
[Binding](../concepts/binding.md)'s `answers`, which the person wrote by
picking an option while answering a clause, so the tag that routes a value to
the solver is the person's own. Nothing infers a strength, and the model
cannot set one: no tool reaches `Specifying/settle`
([Conduct](conduct.md)).

The calculation is strict on purpose. A value that answers no clause is an
ordinary assertion and reaches the solver hard, as the model's `assert_value`
and a bare pick on the canvas always have. A value that answers two clauses,
one fixed and one negotiable, is hard, because the firmer requirement governs.
And `open` is not a strength: a clause the person has deliberately left open
says nothing about how firmly its answer is meant, so an answer to it is hard.
The solver knows a hard strength and a soft one, and the calculation maps
every negotiability onto one of them by asking one question, *is every reason for this
value a preference*.

### What the solver does with a soft value

`Constraining/incline` records the value as inclined, not assumed: honoured
where it can be, and dropped where it cannot, with earlier inclinations
honoured before later ones. An honoured inclination narrows the canvas exactly
as an assumption does, and what follows from it is shown as following from
it. The difference appears when something hard contradicts it. `assume` is
checked against the rules and the assumptions alone, so it succeeds; the
inclination gives way in the recompute; and no question is asked, because a
preference is by the person's own account the thing to give up. The canvas
reads the outcome from `Constraining.settled` beside `Constraining.inclined`:
an inclined value the specification settled on is *asked*, and one it did not
is *yielded*. A yielded value stays asserted, stays on the canvas, and stays
bound to its clause, because nothing about the person's requirement changed.
Only the solver's answer did.

`incline` never fails, so an inclination is met the moment it is recorded,
whether it is then honoured or yields. The one way a refusal comes to stand
against an inclined value is a hardening that failed, below, and *met* is
defined so that such a value counts as unmet until the refusal is cleared:
`UnmetAssertionsAreTriedAgain` tries it again hard when the obstacle goes,
and `AResolvedConflictWithdrawsItsQuestion` keeps its question until then.

### A clause's strength can change after it is answered

```
sync ASettledClauseSoftensItsAnswer
when  { Specifying/settle: [] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                   ?ch answers: ?c ; ?ch value: ?o }
        Cataloguing: { ?v offers: ?o }
        Asserting: { ?s asserted: ?v -> ?o }
        ?o is held softly in ?s
        unless Constraining: { ?s inclined: ?v -> ?o }
          with nothing refused against ?v }
then  { Constraining/incline: [ spec: ?s ; variable: ?v ; option: ?o ] }

sync ASettledClauseHardensItsAnswer
when  { Specifying/settle: [] => [ clause: ?c ; spec: ?s ] }
where { Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                   ?ch answers: ?c ; ?ch value: ?o }
        Cataloguing: { ?v offers: ?o }
        Asserting: { ?s asserted: ?v -> ?o }
        ?o is not held softly in ?s
        Constraining: { ?s inclined: ?v -> ?o } }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }

sync ARetractedChoiceHardensItsValue
when  { Binding/retract: [] => [ selection: ?sel ; value: ?o ] }
where { Binding: { ?sel for: ?s }
        Cataloguing: { ?v offers: ?o }
        Asserting: { ?s asserted: ?v -> ?o }
        Constraining: { ?s inclined: ?v -> ?o }
        ?o is not held softly in ?s }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }
```

A person can settle a clause after answering it, and the value has to follow.
`assume` and `incline` each replace whatever the other recorded for the
variable, so moving a value between the two relations is one invocation
either way, and the last condition in each `where` is what keeps the rules
from re-recording a value that is already where it belongs.

Hardening can fail. A value that was honoured softly, or that had yielded,
may not hold together with the rest once it is meant firmly, and then
`assume`'s failing case fires `AConflictIsPutToThePerson` as for any other
assertion. The solver leaves the value inclined as it was and records the
refusal against it, so the value is unmet until the refusal clears, by the
obstacle going or by the clause being softened again. Making a requirement
fixed is how a person finds out what it costs, which is the right moment to
ask. Softening cannot fail: an unmet value made negotiable becomes an
inclination, its refusal is cleared, and it is honoured or yields in the
recompute, so settling a clause to *negotiable* is another way of answering
a conflict, in the document rather than on the canvas, and the question goes
with it. That is why the softening rule's last condition reads *with nothing
refused*: a value the solver already inclines, and has since refused firmly,
is inclined again so that the refusal clears.

`ARetractedChoiceHardensItsValue` is for a struck clause. `AStruckClauseReleasesItsChoices`
([Binding](binding.md)) retracts the choice and leaves the value asserted,
and a value with no clause behind it is an ordinary assertion, so it hardens.
The same rule matches the other retractions and declines on both: a
withdrawn value is no longer asserted, and an overwritten value's variable
now asserts something else.

### Why the strength is the person's tag and not a weight

The routing key is categorical and the person's own, and that is a finding
from the literature rather than a convenience. Lee, Wang, Albarghouthi,
Porfirio and Mutlu (*U-Define: Designing User Workflows for Hard and Soft
Constraints in LLM-Based Planning*, 2026,
[arXiv:2605.02765](https://arxiv.org/abs/2605.02765)) report that people
readily say what *must* hold versus what *should*, and do poorly at mapping
those onto numbers; their system sends hard constraints to a formal checker
and soft ones elsewhere, and reads the formal rule back in prose for
confirmation. The tag is categorical and the person's own, never a weight,
and the tag is what routes the value. Draco (Moritz, Wang, Nelson, Lin,
Smith, Howe and Heer, *Formalizing Visualization Design Knowledge as
Constraints: Actionable and Extensible Models in Draco*, IEEE TVCG 2019,
[doi:10.1109/TVCG.2018.2865240](https://doi.org/10.1109/TVCG.2018.2865240))
is the solver side of the same shape: hard constraints plus weighted soft
ones, and a solver returning "the optimal completion of a partial
specification". The line this application draws follows: a requirement
filters, a preference ranks within what is eligible, and an inference stays
a proposal. *Fixed* and *negotiable* are the first two; a proposed
completion ([Conduct](conduct.md)) is the third.

The one weight in the code is the `1` that `Constraining/complete` gives every
inclination, and it is not a strength the person chose. It is what makes a
completion honour preferences before cost.

### What this does not answer

Whether a configurator's solver accepts a soft constraint at all is one of
the **[unknown]**s in step 1 of the case's `Prototype plan`, and it is not
this repository's to answer: the prototype is configurator-agnostic, and z3
stands in for whichever configurator a solution built on it adopts. That z3
supports one is evidence about z3 and not about that configurator. What the
rules above establish is narrower and is still worth having: that
negotiability can reach validity by a rule that reads the person's tag,
without an action added to `Asserting` and without a weight anywhere the
person can see. If the adopted solver has no soft constraint, the consequence
the plan records stands, and the rules above that invoke `incline` are the
ones that would have nothing to invoke.

## The assertion is recorded before it is known to be satisfiable

`Asserting/assert` completes first and `Constraining/assume` follows. When
the assumption fails, the assertion is already on record and stays there.

This looks like a mistake and is the point. An assertion that cannot currently
be met is not a nullity — it is the most important thing on the screen. The
relations are readable side by side:

```
asserted  minus  assumed   =   what you asked for and cannot have
```

A configurator that validated before recording would have nowhere to put that
difference, and would be back to the last write winning. See
[Asserting](../concepts/asserting.md).

## A specification is given to the solver

<a id="a-specification-is-given-to-the-solver"></a>
```
sync ANewSpecificationIsGivenToTheSolver
when  { Asserting/start: [ spec: ?s ] => [ spec: ?s ] }
then  { Constraining/consider: [ spec: ?s ] }
```

A specification is started in `Asserting`, with nothing asserted of it, and
the solver begins tracking it, with nothing assumed. From then on every
variable has a set of possible options before anybody has asked for anything,
which is what the canvas's *still open* section reads.

## A discarded specification leaves the solver

```
sync ADiscardedSpecificationLeavesTheSolver
when  { Asserting/discard: [ spec: ?s ] => [ spec: ?s ] }
then  { Constraining/forget: [ spec: ?s ] }

sync ADiscardedSpecificationsQuestionsAreWithdrawn
when  { Asserting/discard: [ spec: ?s ] => [ spec: ?s ] }
where { Deciding: { ?r offered: ?options }
        and ?r is [ spec: ?s ; about: ?about ] }
then  { Deciding/withdraw: [ request: ?r ] }
```

`ADiscardedSpecificationsQuestionsAreWithdrawn` is the ordinary §6.5 shape — one binding per request, `then` once per
binding. It exists because a conflict question outlives the assertions it is
about: answering it after a discard would concede an assertion that no longer
exists, and the canvas would go on asking about a specification that is gone.

Note that this is a rule and not a change to [Deciding](../concepts/deciding.md).
That concept cannot tell that a specification was discarded, because it does not
know what a specification is. What it can do is stop holding a request, and
which requests to stop holding is a question for a rule.

`ADiscardedSpecificationLeavesTheSolver` is the inverse of
[`ANewSpecificationIsGivenToTheSolver`](#a-specification-is-given-to-the-solver),
and it exists for the reason MSM §5.1.2 gives: an action whose inverse is missing is a trap, and
without it `discard` would be an action of [Asserting](../concepts/asserting.md)
with its consequence for the solver unwritten. It is reachable by a gesture
([Gestures](gestures.md)) and its consequence for the solver is a rule, which
is where a consequence belongs.

No control on the canvas performs it yet. That is a gap in the interface rather
than in the model: the act exists, the route exists, and nothing has been built
to press it.

## When assertions cannot hold together

```
sync AConflictIsPutToThePerson
when  { Constraining/assume: [ spec: ?s ; variable: ?v' ; option: ?o' ]
          => [ error: ?why ; culprits: ?rules ; conceding: ?vars ] }
where { ?candidates is the set of [ variable: ?v ; option: ?o ]
          such that ?v is in ?vars
          and Asserting: { ?s asserted: ?v -> ?o },
          together with [ variable: ?v' ; option: ?o' ]
        ?candidates has at least two members
        ?reason is the because of each rule in ?rules,
          read from Constraining }
then  { Deciding/ask: [ request: [ spec: ?s ; about: "conflict" ] ;
          reason: ?reason ; options: ?candidates ] }

sync TheConcededAssertionIsWithdrawn
when  { Deciding/choose: [ request: ?r ; option: ?candidate ]
          => [ request: ?r ] }
where { ?r is [ spec: ?s ; about: "conflict" ]
        ?candidate is [ variable: ?v ; option: ?o ] }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }
```

Some clauses in that `where` are decisions rather than transcription. The refused pair `[ ?v' ; ?o' ]` is
offered alongside the candidates because the thing a person most often wants to
give up is the assertion they just made, and it is not in `asserted` — it never
got there. And a question needs at least two answers: with one candidate there
is nothing to choose between, so no question is asked. The refusal is still
recorded in `Constraining.refused` and still reaches the card, which is why the
person is not left without an account.

The `where` clause discards `?why` and keeps the rules' own sentences. The
error `Constraining` composes names variables and options by identity, because
identities are all it has; `because` is what a person can read, and it belongs
to the concept that owns the rule rather than to the one that reports the
failure. A concept that knew how to phrase its errors for an interface would be
a concept that knew there was an interface.

`AConflictIsPutToThePerson` aggregates in its `where` rather than firing once
per binding. WYSIWID §6.5's default — one binding, one invocation of `then` —
is what gives a cascading delete its iteration for free, and it is the wrong
default here: several conflicting assertions are one question with several
answers, not several questions. The `where` clause "performs calculations" (WYSIWID §5), and
collecting a set is one.

Note that `error` is matched alongside other output arguments. No construct
is needed for that: a failing case is an ordinary case, and `error` is an
ordinary argument name (WYSIWID §5.3). The rules responsible arrive with the
failure that produced them rather than from a separate query, which is
why there is no `Explaining` concept: nobody performs *explain*, so it would
have no actions.

### What each answer would cost is a read

The question offers assertions to give up, and a person choosing between
them needs to know what each answer does: what would then follow, and what it
would cost in price and in carbon. Those are not facts of any concept. They
are answers to *what if*. The amount worth showing is per answer, the values
that would then follow, the values that would no longer be forced — what the
given-up assertion was holding in place, which is where a price drop comes
from — and both deltas; the whole consequence set is one move
away, because every touched variable at once is what makes a ripple read as
noise, and the bare core without the costs leaves the person interrogating
each answer in turn.

`Constraining` therefore has a query beside `excluding` and `narrowing`:
`foreseeing`, which takes a specification and a set of assumptions in place of
its own and returns what would be possible and settled under them, or that
they cannot hold together. It records nothing; its specification is with the
[concept](../concepts/constraining.md). The canvas view
(`agent/views.py`) asks it once per answer, with that assertion left out and
every unmet assertion put back — which is what `UnmetAssertionsAreTriedAgain`
would do — and prices the result with the same reads the totals use. The
figures ride beside the question as `foreseen`, one entry per option; the
options themselves are untouched, because `Deciding/choose` has to recognise
the one handed back.

## A conflict resolved another way takes its question with it

```
sync AResolvedConflictWithdrawsItsQuestion
when  { Constraining/assume: [ spec: ?s ] => [ spec: ?s ] }
where { *the question is answered* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AResolvedConflictWithdrawsItsQuestion
when  { Constraining/incline: [ spec: ?s ] => [ spec: ?s ] }
where { *the question is answered* }
then  { Deciding/withdraw: [ request: ?r ] }

sync AResolvedConflictWithdrawsItsQuestion
when  { Asserting/withdraw: [ spec: ?s ] => [ spec: ?s ] }
where { *the question is answered* }
then  { Deciding/withdraw: [ request: ?r ] }
```

where *the question is answered* is the `where` they share:

```
the question is answered
  iff  ?r is [ spec: ?s ; about: "conflict" ]
  and  ?r is pending, as Conduct defines it
  and  for every ?v such that Asserting: { ?s asserted: ?v -> ?o },
         ?v -> ?o is met in ?s
```

One rule with several triggers, written as one block per trigger under one name.
Actions listed together in a `when` must all occur in the same flow
(WYSIWID §5.3), so a single block naming them all would fire only on a flow
that did all of them, which is not what is meant.

`TheConcededAssertionIsWithdrawn` is one way a conflict ends, and it is not
the only one. The person may answer the question in the chat instead of on
the canvas — *keep the hospital* — and the model, permitted to withdraw,
withdraws the 630 kg at their word. Or the person withdraws the refused
assertion themselves, or asserts something else for that variable, or settles
the clause the refused value answers to *negotiable*. None of
those touch `Deciding`, and without this rule the canvas would go on asking a
question that has been answered ([The moves](../moves.md#the-conflict-as-the-worked-case)).

The shared condition says what *answered* means: every assertion of the specification
is assumed or inclined. That is the condition the question was asked about,
negated, and it is why the rule matches `assume` and `incline` as well as
`withdraw`. Withdrawing the
assertion that was refused satisfies it at once, since that one was never
assumed. Withdrawing one that was conceding does not — the refused assertion
is still unmet — until `UnmetAssertionsAreTriedAgain` assumes it, and it is
that `assume`'s completion the rule then matches. Softening the refused
assertion inclines it, and it is that `incline`'s completion the rule
matches. Either way the question goes when the conflict does, and not before.

It is the same shape as [`AnOvertakenProposedValueIsRetired`](conduct.md),
which withdraws a proposed value once the rules no longer allow it: each
question is about a condition, and holds as long as the condition does.

A chosen request is not pending, so a question answered on the canvas is left
alone: the answer is the record of what was chosen, and this rule only takes
away a question nobody answered.

## What `Deciding` is instantiated with here

[`Deciding [Request, Option]`](../concepts/deciding.md) is used in several ways
in this application with different parameters, which is the argument for it
being a concept at all:

| | `Request` | `Option` |
|---|---|---|
| a conflict | `[ spec ; about: "conflict" ]` | an assertion that might be given up — `[ variable ; option ]` |
| a completion | `[ spec ; about: "completion" ]` | a whole assignment |
| a proposed value | `[ spec ; about: "completion" ; variable ]` | a value to be taken up — `[ variable ; option ]` |
| a meeting | a meeting | a time |

A request here is a value, not an individual: it is identified by what it
is about, so asking the same question again is the same request, and its
earlier options come back as `displaced`. That is the sense MSM §4 gives a
value, something interpretable by its structure, and it is why the rules can
find the conflict question for a specification by writing it down rather than
by looking it up. A request that had to be told apart from another about the
same thing would need an identity minted for it, in a `where`, as WYSIWID
mints a user's in §5.1.

The `Option` of a conflict question is *not* a catalogue option. It is a pair
naming the variable and what was asked for it, because the question is *which
of these requests do you give up*, and the answer has to identify a request.
An implementation that passed catalogue options here would produce a question a
person cannot answer — several conflicting assertions can name options of the
same variable, and several variables can be offered the same option value. A
proposed value ([Conduct](conduct.md#proposing-and-not-adopting)) is the same
pair read the other way, a request to take up rather than give up, and only
the request's `about` tells the two apart.

The type parameter is unconstrained (WYSIWID §4), so nothing in `Deciding`
notices or cares. That is what makes it reusable, and it is also what makes it
possible to get wrong quietly, which is why it is written down.

## An assertion is tried again when the obstacle goes

```
sync UnmetAssertionsAreTriedAgain
when  { Constraining/release: [ spec: ?s ] => [ spec: ?s ] }
where { Asserting: { ?s asserted: ?v -> ?o }
        and ?v -> ?o is not met in ?s }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }
```

An inclined value with nothing refused against it is met, whether honoured or
yielded, so it is not tried again; the recompute that follows the `release`
is what reconsiders it. One that a hardening refused is tried again hard,
which is what the hardening was asking for.

This is what makes *the assertion stays on record* mean something rather than
merely look tidy. Give up the hospital and the 630 kg car you asked for
half an hour ago becomes buildable — so it is assumed, and the red card turns
into an ordinary one, without anybody asking for it a second time.

It is the [§6.5 shape](../method/synchronization.md#form) again: one binding
per unmet assertion, `then` once per binding. It cannot loop, because a
retry that succeeds invokes no `release` and a retry that fails invokes
nothing at all; and it terminates, because the set of assertions only ever
shrinks along that path.

Without it, `refused` would go stale rather than transient — a card explaining
a refusal by rules that no longer refuse anything, which is worse than no
explanation.

## An issued quote is shown

```
sync AnIssuedQuoteIsShown
when  { Quoting/quote: [] => [ quote: ?q ] }
then  { Moding/focus: [ workspace: workspace ; surface: quote ] }
```

The offer is a surface of its own, offered at boot beside the canvas
([Seeding](seeding.md)), and it takes the viewer's attention when a
quote is issued, whichever party asked for it. An offer nobody sees is not an
offer that was made. This is
[`TheCanvasIsShownBeforeItChanges`](conduct.md) one concept further along, and
it lives here rather than in [Conduct](conduct.md) because its `when` is a
concept's completion and not a tool call: it fires the same way for a click
and for the model.

```
sync AFramedRequirementShowsTheConfiguration
when  { Framing/frame: [ lens: workspace ; frame: [ by: "clause" ; clause: ?c ] ]
          => [ lens: workspace ; frame: ?f ] }
then  { Moding/focus: [ workspace: workspace ; surface: canvas ] }
```

The requirements are a surface of their own too, and a clause is framed from
there. What the frame selects — the clause's answers, what they forced, what
could still answer it — is on the configuration, and so is the pick that
answers it ([Gestures](gestures.md#the-canvas-is-narrowed-to-one-requirement)),
so framing a requirement brings the configuration forward, whichever party
did it. The frame strip there links back to the clause.

## A frame goes with what it framed

<a id="a-frame-goes-with-what-it-framed"></a>
```
sync AWithdrawnAssertionUnframesTheCanvas
when  { Asserting/withdraw: [ spec: ?s ; variable: ?v ]
          => [ spec: ?s ; variable: ?v ] }
where { Framing: { workspace framed: [ by: "assertion" ; variable: ?v ] } }
then  { Framing/unframe: [ lens: workspace ] }

sync AStruckClauseUnframesTheCanvas
when  { Specifying/strike: [ clause: ?c ] => [ clause: ?c ] }
where { Framing: { workspace framed: [ by: "clause" ; clause: ?c ] } }
then  { Framing/unframe: [ lens: workspace ] }

sync ADiscardedSpecificationUnframesTheCanvas
when  { Asserting/discard: [ spec: ?s ] => [ spec: ?s ] }
where { Framing: { workspace framed: ?f } }
then  { Framing/unframe: [ lens: workspace ] }
```

A canvas narrowed to what followed from an assertion that no longer exists
would show the assertion's consequences with nothing for them to be
consequences of, and one narrowed to a requirement that was struck would be
answering nothing. The first two rules' `where` is what keeps a frame on
some *other* assertion or clause in place; the third needs none beyond
there being a frame at all. [Framing](../concepts/framing.md) cannot see either event for
itself — it does not know what an assertion is — so when a frame stops
meaning anything is a question for a rule, as when a question stops needing
an answer is above.

## If the person declines

`Deciding/decline` appears in no rule here, and nothing happens as a result.
That is the whole of its effect and it is correct: the assertion stays
recorded and unassumed, the rules that refused it stay recorded against it in
`Constraining.refused`, and the person can come back to it. The banner goes;
the account does not. An action no rule invokes does not happen — the same property that
lets a prohibition be written as a withheld permission
([Code of conduct](../method/conduct.md#permission-is-stated-positively)).

## See also

- [Asserting](../concepts/asserting.md) — the asserted half
- [Constraining](../concepts/constraining.md) — the entailed half
- [Deciding](../concepts/deciding.md) — the question, and its other use
- [Conduct](conduct.md) — what the model may add to any of this

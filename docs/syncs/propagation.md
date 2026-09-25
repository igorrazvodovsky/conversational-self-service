# Propagation

How what a party asserts reaches the solver, and how a conflict comes back.
See [the index](README.md).

## Assertions reach the solver

```
sync AssertionsReachTheSolver
when  { Asserting/assert: [ spec: ?s ; variable: ?v ; option: ?o ]
          => [ spec: ?s ; variable: ?v ; option: ?o ] }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }

sync AWithdrawalReachesTheSolver
when  { Asserting/withdraw: [ spec: ?s ; variable: ?v ]
          => [ spec: ?s ; variable: ?v ] }
then  { Constraining/release: [ spec: ?s ; variable: ?v ] }
```

Two rules, one direction. Nothing carries anything from
[Constraining](../concepts/constraining.md) back into
[Asserting](../concepts/asserting.md) except by way of a person answering a
question, and that asymmetry is the design.

## The rule that is registered and reached by nothing

```
sync PreferencesReachTheSolverSoftly
when  { Asserting/prefer: [ spec: ?s ; variable: ?v ; option: ?o ]
          => [ spec: ?s ; variable: ?v ; option: ?o ] }
then  { Constraining/incline: [ spec: ?s ; variable: ?v ; option: ?o ] }
```

`Asserting` has no `prefer`. Strength is a fact of a *clause* —
[Specifying](../concepts/specifying.md)'s `negotiability` — and not of an
assertion, so no completion can ever match this rule's `when`, and
`Constraining/incline` is an action nothing invokes.

Both are kept anyway, and deliberately. Whether the real configurator's solver
accepts a soft constraint at all is one of the **[unknown]**s in step 1 of the
case's `Prototype plan`, and it is not this repository's to answer: the z3
stand-in here obviously supports one, which is evidence about z3 and not about
Tacton. Deleting the pair would throw away a working answer to a question that
has not been asked yet; giving `Asserting` a `prefer` to reach it would put
back an action its specification does not have. So it stays as a dead rule
with the reason written down, which is the honest third option and is why this
section exists rather than a deletion.

Read it as a fact about the code: `agent/syncs/propagation.py` registers a rule
whose `when` names an action of a concept that does not have it. The engine
matches `(concept, action)` pairs and validates neither, so this costs a tuple
comparison per dispatch and nothing else.

## The assertion is recorded before it is known to be satisfiable

`Asserting/assert` completes first and `Constraining/assume` follows. When
the assumption fails, the assertion is already on record and stays there.

This looks like a mistake and is the point. An assertion that cannot currently
be met is not a nullity — it is the most important thing on the screen. The two
relations are readable side by side:

```
asserted  minus  assumed   =   what you asked for and cannot have
```

A configurator that validated before recording would have nowhere to put that
difference, and would be back to the last write winning. See
[Asserting](../concepts/asserting.md).

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

The second is the ordinary §6.5 shape — one binding per request, `then` once per
binding. It exists because a conflict question outlives the assertions it is
about: answering it after a discard would concede an assertion that no longer
exists, and the canvas would go on asking about a specification that is gone.

Note that this is a rule and not a change to [Deciding](../concepts/deciding.md).
That concept cannot tell that a specification was discarded, because it does not
know what a specification is. What it can do is stop holding a request, and
which requests to stop holding is a question for a rule.

The inverse of `ANewSpecificationIsGivenToTheSolver`, and it exists for the
reason MSM §5.1.2 gives: an action whose inverse is missing is a trap, and
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

Two clauses in that `where` were for a while only in the code, and both are
decisions rather than transcription. The refused pair `[ ?v' ; ?o' ]` is
offered alongside the candidates because the thing a person most often wants to
give up is the assertion they just made, and it is not in `asserted` — it never
got there. And a question needs at least two answers: with one candidate there
is nothing to choose between, so no question is asked. The refusal is still
recorded in `Constraining.refused` and still reaches the card, which is why the
person is not left without an account — but see below.


The `where` clause discards `?why` and keeps the rules' own sentences. The
error `Constraining` composes names variables and options by identity, because
identities are all it has; `because` is what a person can read, and it belongs
to the concept that owns the rule rather than to the one that reports the
failure. A concept that knew how to phrase its errors for an interface would be
a concept that knew there was an interface.

`AConflictIsPutToThePerson` aggregates in its `where` rather than firing once
per binding. WYSIWID §6.5's default — one binding, one invocation of `then` —
is what gives a cascading delete its iteration for free, and it is the wrong
default here: five conflicting assertions are one question with five answers,
not five questions. The `where` clause "performs calculations" (WYSIWID §5), and
collecting a set is one.

Note that `error` is matched alongside two other output arguments. No construct
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
that would change and both deltas; the whole consequence set is one move
away, because every touched variable at once is what makes a ripple read as
noise, and the bare core without the costs leaves the person interrogating
each answer in turn.

`Constraining` therefore has a read beside `excluding` and `narrowing`:
*foreseeing*, which takes a specification and a set of assumptions in place of
its own and returns what would be possible and settled under them, or that
they cannot hold together. It records nothing. The canvas view
(`agent/views.py`) asks it once per answer, with that assertion left out and
every unmet assertion put back — which is what `UnmetAssertionsAreTriedAgain`
would do — and prices the result with the same reads the totals use. The
figures ride beside the question as `foreseen`, one entry per option; the
options themselves are untouched, because `Deciding/choose` has to recognise
the one handed back.

## A conflict resolved another way takes its question with it

```
sync AResolvedConflictWithdrawsItsQuestion
when  { Constraining/assume: [ spec: ?s ] => [ spec: ?s ]
        Asserting/withdraw: [ spec: ?s ] => [ spec: ?s ] }
where { ?r is [ spec: ?s ; about: "conflict" ]
        Deciding: { ?r offered: _ }, and ?r is neither chosen nor declined
        for every ?v such that Asserting: { ?s asserted: ?v -> ?o },
          Constraining: { ?s assumed: ?v -> ?o } }
then  { Deciding/withdraw: [ request: ?r ] }
```

`TheConcededAssertionIsWithdrawn` is one way a conflict ends, and it is not
the only one. The person may answer the question in the chat instead of on
the canvas — *keep the hospital* — and the model, permitted to withdraw,
withdraws the 630 kg at their word. Or the person withdraws the refused
assertion themselves, or asserts something else for that variable. None of
those touch `Deciding`, and without this rule the canvas would go on asking a
question that has been answered ([The moves](../moves.md#the-conflict-as-the-worked-case)).

The `where` says what *answered* means: every assertion of the specification
is assumed. That is the condition the question was asked about, negated, and
it is why the rule matches `assume` as well as `withdraw`. Withdrawing the
assertion that was refused satisfies it at once, since that one was never
assumed. Withdrawing one that was conceding does not — the refused assertion
is still unmet — until `UnmetAssertionsAreTriedAgain` assumes it, and it is
that `assume`'s completion the rule then matches. Either way the question goes
when the conflict does, and not before.

It is narrower than [`AChangedSpecificationWithdrawsItsProposal`](conduct.md),
which withdraws a completion on any change. A completion is computed against a
state and is stale the moment that state moves; a conflict question is about a
condition, and holds as long as the condition does.

A chosen request is not pending, so a question answered on the canvas is left
alone: the answer is the record of what was chosen, and this rule only takes
away a question nobody answered.

## What `Deciding` is instantiated with here

[`Deciding [Request, Option]`](../concepts/deciding.md) is used twice in this
application with entirely different parameters, which is the argument for it
being a concept at all:

| | `Request` | `Option` |
|---|---|---|
| a conflict | a specification | an assertion that might be given up — `[ variable ; option ]` |
| a meeting | a meeting | a time |

The `Option` of a conflict question is *not* a catalogue option. It is a pair
naming the variable and what was asked for it, because the question is *which
of these requests do you give up*, and the answer has to identify a request.
An implementation that passed catalogue options here would produce a question a
person cannot answer — several conflicting assertions can name options of the
same variable, and several variables can be offered the same option value.

The type parameter is unconstrained (WYSIWID §4), so nothing in `Deciding`
notices or cares. That is what makes it reusable, and it is also what makes it
possible to get wrong quietly, which is why it is written down.

## An assertion is tried again when the obstacle goes

```
sync UnmetAssertionsAreTriedAgain
when  { Constraining/release: [ spec: ?s ] => [ spec: ?s ] }
where { Asserting: { ?s asserted: ?v -> ?o }
        and Constraining: { ?s has no assumption for ?v } }
then  { Constraining/assume: [ spec: ?s ; variable: ?v ; option: ?o ] }
```

This is what makes *the assertion stays on record* mean something rather than
merely look tidy. Give up the hospital and the 630 kg car you asked for
half an hour ago becomes buildable — so it is assumed, and the red card turns
into an ordinary one, without anybody asking for it a second time.

It is the [§6.5 shape](../method/synchronization.md#flows) again: one binding
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

## A frame goes with what it framed

<a id="a-frame-goes-with-what-it-framed"></a>
```
sync AWithdrawnAssertionUnframesTheCanvas
when  { Asserting/withdraw: [ spec: ?s ; variable: ?v ]
          => [ spec: ?s ; variable: ?v ] }
where { Framing: { workspace framed: [ by: "assertion" ; variable: ?v ] } }
then  { Framing/unframe: [ lens: workspace ] }

sync ADiscardedSpecificationUnframesTheCanvas
when  { Asserting/discard: [ spec: ?s ] => [ spec: ?s ] }
where { Framing: { workspace framed: ?f } }
then  { Framing/unframe: [ lens: workspace ] }
```

A canvas narrowed to what followed from an assertion that no longer exists
would show the assertion's consequences with nothing for them to be
consequences of. The first rule's `where` is what keeps a frame on some
*other* assertion in place; the second needs none beyond there being a
frame at all. [Framing](../concepts/framing.md) cannot see either event for
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

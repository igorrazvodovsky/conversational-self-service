# Synchronization

The only mechanism by which two [concepts](concept.md) may interact. Also called a reaction.

> Actions between concepts must often be coordinated. […] One might be tempted to express such coordinations as calls between actions. […] But such an approach would complicate the single-step specification of actions, and, worse, it would couple the concepts together by introducing references between them.
>
> — MSM §4.5

A synchronization is a declarative rule that sits *outside* the concepts and mediates between them. Concepts never call each other; the rule does the calling, and neither concept knows the other exists.

## Form

> When these actions happen, where the current state of things is so, then these actions should follow.
>
> — WYSIWID §5

```
sync Name
when  { Concept/action: [ input: ?var ] => [ output: ?var ] }
where { Concept: { ?individual relation: ?var } }
then  { Concept/action: [ input: ?var ] }
```

- `when` matches action *completions* — actions that have returned, denoted by `=>` pointing at a pattern for the output.
- `where` queries the state of any number of concepts, and performs calculations. Optional; the only optional part.
- `then` lists action *invocations* — action patterns with no `=>`.

Variables carry a `?`, are scoped across the whole rule, and are implicitly quantified. Matching is partial: an action pattern names only the arguments the rule cares about, so `User/register: [] => [ user: ?user ]` fires on any successful registration whatsoever (WYSIWID §5.2).

Two consequences of the `where` clause worth knowing. It is a function from one binding to a *set* of bindings, with `then` invoked once per binding — so a cascading delete over every comment on a post needs no explicit iteration (WYSIWID §6.5). And because errors are ordinary output arguments, a rule that fires on failure needs no special feature (WYSIWID §5.3).

## This scheme replaced an earlier one

Worth knowing, because anyone arriving from _The Essence of Software_ will have a different mechanism in mind and will not otherwise see why the form changed.

The book proposed synchronizations too, but with transactional semantics: a firing condition matching one action, causing others, with the whole sequence required to form a transaction so that if any action fails they are all undone. That scheme also supported suppression — a `downvote` synchronized with `Karma.permit` fails and aborts the downvote when the user lacks the points.

WYSIWID §3 lists five deficiencies and then says plainly: "A new synchronization scheme was therefore devised and is a key contribution of this paper."

1. "The causal model is not easy to understand, because it mixes a CSP-like symmetrical rendezvous with a directed stimulus/response pattern."
2. "Transactions complicate the implementation, making it hard to implement actions, such as notifications, whose effect in the world must be delayed until the transaction commits."
3. Extending a rule to fire on multiple actions, or to condition richly on concept state, "is challenging."
4. "It is not clear how to accommodate error handling."
5. Mapping an action over a set — a cascading delete over every comment on a post — is "not easy to specify."

The `when`/`where`/`then` form above answers all five, and needs no transactions to do it. The enabling move is worth stating on its own, because it is where the bootstrap concept comes from:

> A key insight that made this possible was to regard the incoming request as itself an action to which a synchronization reacts.

Practical consequence: material written against the book's scheme — including general-purpose concept-design tooling — teaches a mechanism this project does not use. Rules here are always `when`/`where`/`then` with `?variables`, never a list of actions that fire together.

The objects piece adds one framing note about what the mechanism *is*: concept design "uses action synchronization to eliminate dependencies, which can be seen as a particular implementation pattern (related to the patterns used in many event-driven architectures)." Not a new paradigm — a known pattern, applied at the level of meaning.

## Flows

All action records carry a flow token, and every action matched in one `when` must share it. Invocations in `then` inherit it (WYSIWID §6.3). A flow is therefore a directed acyclic subgraph of action occurrences rooted in an external stimulus — which recovers the one advantage traditional route handlers have, that the scope of each test and action is tied to a single request.

## Provenance

Each action occurrence is linked back to the actions that precipitated it, labelled with the name of the synchronization responsible (WYSIWID §6.6). This is what makes the action log an account rather than a log: given an undesirable action you can find the rule that authorised it, and MSM §5.2.3 makes the invariant explicit — every action reaches the log by way of some synchronization.

The same edges give idempotency. A rule fires for a completion only if no edge already exists from that completion bearing the rule's identifier, so the engine can re-evaluate every record on reboot and resume safely.

## Design rules

WYSIWID §7.2 states the four rules the pattern imposes. They are assessed against this repository in [the alignment analysis](../conceptual-model.md#3-wysiwids-four-design-rules).

1. Concept actions do not call actions or access the state of other concepts.
2. State declarations in one concept have no dependencies on state declarations in another.
3. Synchronizations only access concept states and actions.
4. Only a single bootstrap concept can initiate actions, and it encapsulates front-end commitments such as the use of HTTP.

## In this repository

There is an engine, in `agent/engine/`, and twenty-seven rules in `agent/syncs/`,
written up in [`../syncs/`](../syncs/README.md). Concepts import nothing from
each other; every interaction between two of them is a rule.

What the engine does and does not implement is a deliberate line. It provides
the [action log](implementation.md#the-action-log), the flow token, the
provenance edge labelled with the rule's name, and the once-only guarantee that
a rule fires at most once per completion. It does *not* provide a
`when`/`where`/`then` parser: a rule is a Python function receiving one
completion and returning invocations, and the notation stays in the notes,
where the papers' notation belongs. All four design rules below are checkable
against that shape, and none of them needs a matcher.

Three of the rules are worth naming here because of what they demonstrate.

_`AConflictIsPutToThePerson`_ matches a *failing* completion —
`assume => [ error ; culprits ; conceding ]` — and needs no construct to do it,
because `error` is an ordinary argument name (WYSIWID §5.3). It also aggregates
in its `where` rather than firing once per binding, since five conflicting
assertions are one question with five answers.

_`AnAdoptedCompletionBecomesAssertions`_ is the ordinary §6.5 shape in the
other direction: one binding per pair in the assignment, `then` invoked once per
binding, thirty-odd assertions made with no loop anywhere in a concept.

_`TheModelMayProposeACompletion`_ reads `Pricing` and `Footprinting` state in
its `where` to build an objective, and hands it to `Constraining`. Neither
concept learns the other exists. That is rules 1 and 3 below working together,
and it is the arrangement's clearest payoff.

The starter this replaced had no engine and no rules. Its coordination lived in
three places that were not rules: middleware configuration, five prose
sentences in a system prompt, and a shared state setter both actors called.
Each is transcribed and its fate recorded in
[the alignment analysis](../conceptual-model.md#what-this-replaced).

## See also

- [Concept](concept.md) — what synchronizations mediate between
- [Action](action.md) — what they match and invoke
- [Copiloting](../concepts/copiloting.md) — the bootstrap concept whose actions root every flow here
- [Code of conduct](conduct.md) — synchronizations as statements of permission

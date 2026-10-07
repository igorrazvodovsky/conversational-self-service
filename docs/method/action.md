# Action

One of the four phenomena of the ontology. See [the ontology](README.md).

> An action is an atomic occurrence that corresponds to a meaningful happening, and involves some participants that are individuals and values. The participants are classified into inputs and outputs. An action can have any number of outputs.
>
> — MSM §4.1

Three properties do the work:

_Names matter._ MSM footnote 9 draws the contrast sharply: in TLA and Z, two actions producing the same state transition are indistinguishable, because only the transition is semantically real. Here the name is the meaning. Two notifying mechanisms named `accept()` and `acknowledge()` "might have very different ramifications" (MSM §5.2) even when their code is identical.

_Arguments are named, not positional._ This is what allows a [synchronization](synchronization.md) to match on a subset of an action's arguments, and what distinguishes a normal outcome from an error one (WYSIWID §6.1). In code: a function from a map to a map (MSM §5.2).

_Actions are split into cases by output._ WYSIWID §4 writes each case separately in the pattern-matching style of functional languages, so `set => [ user: U ]` and `set => [ error: string ]` are two cases of one action. Error handling then needs no special language feature — `error` is just another argument name to match on (WYSIWID §5.3).

An action is contingent on [facts](fact.md) holding, and its effect is to add and remove facts.

## In this repository

Every action is a method of a [concept](concept.md) taking a map and returning
a map, and every one of them reaches the [log](implementation.md#the-action-log)
by way of a [synchronization](synchronization.md) or as a root action.

| Concept | Actions |
|---|---|
| `Asserting` | `start`, `assert`, `withdraw`, `discard` |
| `Constraining` | `offer`, `withhold`, `tabulate`, `imply`, `consider`, `assume`, `incline`, `release`, `complete` |
| `Cataloguing` | `describe`, `list`, `annotate`, `delist` |
| `Detailing` | `detail` |
| `Pricing` | `list`, `span`, `presume`, `finance`, `delist` |
| `Footprinting` | `attribute`, `meter`, `rate`, `frame` |
| `Deciding` | `ask`, `choose`, `decline` |
| `Moding` | `offer`, `focus` |
| `Copiloting` (root) | `gesture`, `invoke` |

_Names carry the meaning, and here two of them do visible work._
`Asserting/assert` and `Constraining/assume` produce nearly the same state
transition and are not the same act: the first records that somebody wants
something, the second that the rules can accommodate it. MSM footnote 9's
contrast with TLA and Z is exactly this — where only the transition is
semantically real, those two are indistinguishable, and a log of them cannot
answer *did I ask for this, or did the machine?*

_Arguments are named, and the failing case carries several of them._
`assume => [ error ; culprits ; conceding ]` needs no special construct:
`error` is an ordinary argument name (WYSIWID §5.3), and a rule matching on it
gets the rules responsible and the requirements at stake in the same match. See
[Propagation](../syncs/propagation.md).

_Actions split into cases by output._ `Asserting/withdraw` returns the option
it withdrew, or an error if nothing was asked of that variable. Both are cases
of one action.

_What is deliberately not an action._ The price total and the carbon footprint.
Nobody performs *compute the total*; a person performs a choice and the number
changes. They are reads over exposed state (WYSIWID §6.4) and live in
`agent/views.py`, outside the log, with the arithmetic stated in
[Pricing](../concepts/pricing.md) and
[Footprinting](../concepts/footprinting.md).

The line is not "an action must write." WYSIWID §4 keeps `Password/check`,
which writes nothing, because a person would recognise it as something they
did. By that test `Constraining/complete` is an action — *work out the cheapest
way to finish this* is plainly an act — and it changes no state at all.

## See also

- [Fact](fact.md) — what an action is contingent on and what it changes
- [Synchronization](synchronization.md) — how an action in one concept causes one in another
- [Concept](concept.md) — actions are partitioned among concepts; this is what a concept *is*

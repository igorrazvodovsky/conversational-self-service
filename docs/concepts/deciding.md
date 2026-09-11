# Deciding

A domain [concept](../method/concept.md) of the elevator configurator. The reusable half of human-in-the-loop.

```
concept Deciding [Request, Option]

purpose
  to obtain a person's choice on a matter the system cannot
  settle on its own

state
  reason:   Request -> string
  offered:  Request -> set Option
  chosen:   Request -> Option
  declined: set Request

actions
  ask [ request: Request ; reason: string ; options: set Option ]
    => [ request: Request ; displaced: set Option ]
    record the reason the choice is needed
    record the options among which it may be made,
    replacing any options previously offered for the request
    and discarding any answer previously given to it
    return whatever was offered before, which may be nothing

  choose [ request: Request ; option: Option ]
    => [ request: Request ]
    record the option as chosen for the request

  choose [ request: Request ; option: Option ]
    => [ error: string ]
    if the option is not among those offered for the request,
    or the request is already answered
    return the error description

  decline [ request: Request ]
    => [ request: Request ]
    record the request as declined without choosing an option

  withdraw [ request: Request ]
    => [ request: Request ; offered: set Option ]
    remove the request, with whatever was offered and answered for it
    return what had been offered

operational principle
  after ask [ request: r ; reason: "intro call" ; options: {9am, 2pm} ]
    => [ request: r ; displaced: {} ]
  then choose [ request: r ; option: 9am ] => [ request: r ]
  and chosen of r is 9am
  and choose [ request: r ; option: 4pm ] => [ error: e ]
  and after ask [ request: r ; reason: "they moved it" ; options: {3pm, 4pm} ]
    => [ request: r ; displaced: {9am, 2pm} ]
  then chosen of r is nothing
```

## Used twice, with different parameters

This is the concept that earns its keep by instantiation, so both uses are
worth stating together:

| | `Request` | `Option` | Where |
|---|---|---|---|
| a conflict between assertions | `[ spec ; about: "conflict" ]` | an assertion that might be given up — `[ variable ; option ]` | [Propagation](../syncs/propagation.md#when-assertions-cannot-hold-together) |
| a completion the model has proposed | `[ spec ; about: "completion" ]` | the whole assignment, offered as one | [Conduct](../syncs/conduct.md#proposing-and-not-adopting) |
| a meeting time | a meeting | a time | [Scheduling](scheduling.md) |

The conflict case is the one to be careful with. Its `Option` is *not* a
catalogue option — it is a pair naming a variable and what was asked for it,
because the question is *which of these requests do you give up* and an answer
has to identify a request. Type parameters
[cannot be constrained](../method/concept.md), so nothing in `Deciding`
notices the difference, which is what makes it reusable and also what makes it
possible to get wrong quietly.

The completion case is the more consequential. `Constraining/complete` returns
an assignment and writes nothing; the only path from that assignment into
[Asserting](asserting.md) is `Deciding/choose`. So the model may compute the
cheapest buildable lift meeting every assertion, and may not make it yours.
That is not a policy in a prompt — it is
[the absence of a rule](../syncs/conduct.md#what-is-not-here-and-why-that-is-the-enforcement).

## Why a question can be withdrawn

`decline` and `withdraw` are not the same act and neither substitutes for the
other. Declining is a person saying *not now*: the matter still needs settling,
the request stays on record, and they can come back to it. Withdrawing is
whoever asked saying the matter no longer needs settling at all.

The case that needs it: a specification is discarded, and the conflict
question about its assertions is still open. Answering it would concede an
assertion that no longer exists. Nothing in this concept can notice
that — it does not know what a specification is — so a
[rule](../syncs/propagation.md#a-discarded-specification-leaves-the-solver)
withdraws the question, which is where a fact about one concept following from
another belongs.

MSM §5.1.2's asymmetry test again: `ask` puts a matter on record, and without
`withdraw` nothing would take one off.

## The open questions are a read

There is no action that lists them. Nobody performs *tell me what is
outstanding*; a person asks a question or answers one, and what is outstanding
changes. It is a calculation over `offered`, `chosen` and `declined` — the same
line [Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic) draws
around the total:

```
pending  =  { r | offered(r) is defined, and r is in neither chosen nor declined }
```

The canvas reads it directly, and reads more than one: a conflict and a
proposed completion are both open at once, which is the whole point of the
section below.

## Why a request names the question and not its subject

Both configurator uses concern the same specification, so passing the
specification itself as the `Request` is tempting, and wrong in a way that only
shows up in a sequence: a person sitting on *which of these assertions do you
give up* who then asks the assistant to make it cheaper would find that
question replaced by *adopt this completion*, with nothing anywhere recording
that the first had been asked. Two different matters would share one request,
so answering either would lose the other.

The repair is in the instantiation rather than in this concept. A `Request` is
`[ spec ; about ]` — the specification the question concerns, and which question
it is. `Deciding` neither notices nor cares, because the type parameter
[cannot be constrained](../method/concept.md); what keeps them apart is that the
two [synchronizations](../syncs/README.md) mint requests that are distinct when
the questions are distinct.

This is the same class of mistake as passing a catalogue option where a
retraction candidate belongs, one level up: an unconstrained type parameter is
exactly as reusable as it is easy to instantiate carelessly, and both halves of
that are true.

## Why replacing a question is not an error

`choose` fails on a request already answered, and
[`Scheduling/agree`](scheduling.md) fails on a meeting already agreed, so `ask`
on a request already open looks like it should fail too. It must not. A second
conflict on the same specification is a new question about the same matter, and
a concept that refused to ask it would leave the person looking at a stale one.

What it needs is an account of the replacement. `ask` says that it discards whatever was offered and whatever was answered, and returns the
displaced options — so the [log](../method/implementation.md#the-action-log)
records that a question was superseded rather than the question simply ceasing
to exist. That is the difference between a fact and a gap, and it costs one
output argument.

## Why this is separate from Scheduling

`scheduleTime` fuses two concepts. The ask-and-answer protocol is
domain-independent — the same shape governs approving a deploy, confirming a
destructive operation, resolving a conflict between two assertions, or
picking a shipping address. What is being decided is a different concern
entirely.

WYSIWID §7.3 records the identical mistake being made by an LLM and then
corrected: a first-pass `Password` concept absorbed `reset` and
`completeReset` with a temporary token in its state. "While this is a
serviceable choice, this reset behavior can be handled in a more modular way,
by synchronization with a concept like JWT." The fix was to delete the actions
from the specification and let a
[synchronization](../method/synchronization.md) supply the coordination.

The same applies here. `Deciding` and `Scheduling` compose through a rule, not
through one tool that knows about both:

```
sync OfferMeetingTimes
when  { Scheduling/propose: [ meeting: ?m ] => [ meeting: ?m ] }
where { Scheduling: { ?m proposed: ?times } }
then  { Deciding/ask: [ request: ?m ; reason: "pick a time" ; options: ?times ] }

sync SettleMeetingTime
when  { Deciding/choose: [ request: ?m ; option: ?time ] => [ request: ?m ] }
then  { Scheduling/agree: [ meeting: ?m ; time: ?time ] }
```

Separated this way, `Deciding` is available against any pending question in the
application. The configurator did not have to build a conflict-resolution
mechanism; it had to write two rules.

## See also

- [Asserting](asserting.md) — what a conceded assertion is withdrawn from
- [Constraining](constraining.md) — what raises the conflict, and what proposes the completion
- [Scheduling](scheduling.md) — the domain concept this was once fused with
- [The synchronizations](../syncs/README.md) — all three compositions

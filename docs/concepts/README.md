# Concepts

The [concepts](../method/concept.md) of this application: an elevator
configurator built on the CopilotKit + LangGraph starter.

Under the method these notes are not documentation of the code. They are the
source the code is generated from — see
[From meaning to code](../method/implementation.md#generation). The rules by
which they interact are in [`../syncs/`](../syncs/README.md).

A note is the WYSIWID §4 specification block and nothing else. Concepts we
own carry a full one. The one concept naming third-party machinery carries a
purpose and a statement of what we rely on it for — the policy is
[Two tiers of concept](../method/boundaries.md). Why a concept is separate
from its neighbours is said by the [rules](../syncs/README.md) between them.

## The configurator — ours, fully specified

| Concept | Purpose |
|---|---|
| [Specifying](specifying.md) | to hold what a party requires, in their own words, as separate clauses each of which can be reworded, relaxed, struck, or deliberately left open |
| [Binding](binding.md) | to keep every committed value bound to the requirement it answers, so that a value can later be substituted and explained rather than merely overwritten |
| [Asserting](asserting.md) | to keep what each party has asserted of a specification on record, as asserted, until it is withdrawn |
| [Conversing](conversing.md) | to keep a record of what each party said, to whom and about what, in the order it was said |
| [Filing](filing.md) | to keep a document a party brought, as it was brought, so that a passage of it can be cited |
| [Reading](reading.md) | to hold what a source was read as, so that the reading can be checked against the source and corrected |
| [Deriving](deriving.md) | to work a quantity out from stated ones by a method a person can inspect, so that they can see what the number rests on and what was assumed |
| [Constraining](constraining.md) | to work out what a specification can still become under the rules that say what can be built, given what is asked of it firmly and what only as a preference |
| [Cataloguing](cataloguing.md) | to say what may be ordered, in terms a person can recognise |
| [Detailing](detailing.md) | to keep what the seller publishes about what an item is and does, so that a question about it is answered from the seller's record |
| [Pricing](pricing.md) | to say what each choice adds to the cost of a specification |
| [Footprinting](footprinting.md) | to estimate the carbon a specification will emit over its service life |
| [Quoting](quoting.md) | to hold an offer still — what is offered, at what price, on what terms, until when — so that a party can accept it as it stood |
| [Stipulating](stipulating.md) | to hold the conditions on which an offer is made, so that every quote is made on stated terms |
| [Profiling](profiling.md) | to hold what a party says of who they are, so that a document can name and address them |
| [Naming](naming.md) | to identify an item the way a document names it, by its title and the site it is for |

## The rest of the surface — ours, fully specified

| Concept | Purpose |
|---|---|
| [Deciding](deciding.md) | to obtain a person's choice on a matter the system cannot settle on its own |
| [Moding](moding.md) | to give one of several surfaces a viewer's attention |
| [Showing](showing.md) | to let a viewer choose which facts about an item are shown at a glance, and keep the choice |
| [Framing](framing.md) | to let a viewer narrow what is shown to the items that bear on one question, and keep the choice |

## Specified, and outside the engine

| Concept | Purpose |
|---|---|
| [Scheduling](scheduling.md) | to settle a meeting on one of the times it could be held |
| [Querying](querying.md) | to retrieve the records that answer a question posed in the asker's own words |
| [Theming](theming.md) | to let a viewer control the appearance of a surface, or defer that control to their environment |

These are ours and fully specified, but they have no module in
`agent/concepts/`, no rule reaches them, and nothing they do is in the log.
They live in the frontend and the starter's showcase code: the meeting picker,
the charts over `agent/src/query.py`, and the colour-scheme hook. Until one is
generated into the concept layer, WYSIWID §7.2's rules say nothing about it.

## Bootstrap concept — theirs, purpose only

| Concept | Purpose |
|---|---|
| [Copiloting](copiloting.md) | to carry what happens outside the application into it, whether a person acts, a model calls a tool or the application starts, so that the rules can act on it |

Per WYSIWID §6.7, every framework mechanism belongs here rather than becoming a
concept of its own. It carries no state, no action signatures and no
operational principle, deliberately and permanently.

## Reading order

Start with [Asserting](asserting.md) and read
[Constraining](constraining.md) next. Between them they carry the design's one
real claim — that what a person asked for and what follows from it are two
kinds of fact, and that a configurator storing them in one field cannot answer
the question a person most often has.

[Specifying](specifying.md) and [Binding](binding.md) hold
the requirement in the buyer's words, and the relation from a value to the
clause it answers. Between them and Asserting the same value appears twice,
once as a choice and once as an assertion.

[Cataloguing](cataloguing.md), [Pricing](pricing.md), [Footprinting](footprinting.md)
and Constraining each hold one kind of fact about the same catalogue option,
which is the shortest route to why concepts are not entities.

[Conversing](conversing.md) is the only concept no rule reads from: its
completions appear in no `when`. It exists so that the log's first entry for a
turn is the person's words, and the canvas reads an utterance back by its
flow, beside each value the model asserted in reply. A question the model put
to the person, and the person's reply to it, are utterances about the
question; whether it still awaits an answer is read by the canvas, the chat
and the model's tool, and by no rule.

[Filing](filing.md) and [Reading](reading.md) hold a
document a person brought, and what the model read from it or from their
words, held as a reading so that it can be checked against its source. A
reading becomes a clause and an answer by the rules in
[Reading](../syncs/reading.md), and the person corrects it with the gestures
they already have. [Deriving](deriving.md) works out what a quantity
read from the words comes to, by a method the catalogue publishes, so the
number and what it assumed are on record rather than in the model's head.

[Quoting](quoting.md) is where the configuration stops being the point: an
offer, frozen as issued, that the specification can move away from without
changing.

[Showing](showing.md) and [Framing](framing.md) are the viewer's-choice
concepts — which facts appear beside an item, and which items appear at all.

## What was here before

This model replaced one reverse-engineered from the starter's todo list, and
these concepts went with it:

- `Tasking` — tracking discrete pieces of work. Nothing in a configurator is a task.
- `Adorning` — attaching a glyph to an item. It existed to hold `Todo.emoji`, and there is no emoji here.

They are worth knowing about because the finding they carried survived the
change of domain. The user-meaningful task actions were implemented as one
whole-list setter; the equivalent mistake here would be a single
`configure(spec)` taking the whole assignment, and it is the mistake
[Asserting](asserting.md) exists to make impossible.

## Before writing another one

The [bad smells](../method/objects.md#bad-smells) catch a concept that is
really a class declaration: state with no sets, an action that cannot be
defined on the individual it names, and a purpose that needs an "and". The last
is the cheapest and catches the most.

## Not concepts

_Explaining._ It would have no actions; nobody performs *explain*. The rules
responsible for a conflict are an output argument of the failing case of
`Constraining/assume`.

_Versioning or comparing a specification._ There is one specification per
session. A configurator sold to anyone would need both, and each is a concept
rather than a field; leaving them out is a scope decision, not a claim that
they do not exist. [Quoting](quoting.md) holds the snapshot the
application cannot do without, and an offer is not a version;
[Naming](naming.md) gives the specification a title and a site, which
makes it findable and not comparable.

_Mapping._ The case's concept for how a statement in one vocabulary
corresponds to values in another. Here a value is a catalogue option, so the
correspondence is [Binding](binding.md)'s `answers` and the option itself,
and the model's version of it is the `answer` on a [Reading](reading.md)
item; a concept holding it again would be `answers` under a second name. A
quantity is not translated either: the model reads it from the words, and
which option's range contains it is worked out by
[Deriving](deriving.md) and the range [Cataloguing](cataloguing.md)
publishes. It becomes a concept the day a clause carries a standard's class,
or a quantity no option publishes a range for, that has to be translated
into an option.

_Installing, Servicing, Decommissioning._ Each is a stage of the lift's
life, not a concept. What the specification commits to at each stage is a
choice like any other: how the old lift leaves and when the team works,
what the maintenance covers and who can do it, and what happens to the lift
at the end of its life. Each is a catalogue variable in a family named for
its stage, so it is priced by [Pricing](pricing.md), bounded by
[Constraining](constraining.md), and its carbon is a stage of
[Footprinting](footprinting.md)'s estimate. The operating life itself, such
as the visits, the call-outs and the examinations, happens after the
parties have committed, and is outside the case.

_Accounting._ Login, roles, price visibility. The case's catalogue puts
`Account` and `Role` outside the case, and [Profiling](profiling.md) is
deliberately only the half of a profile that appears on a letterhead.

_Agreeing._ A qualified acceptance — *yes, subject to* — with conditions that
have owners and dates, voided when the thing agreed to changes. The case's
catalogue has it on the horizon, depending on `Binding`. Accepting a fixed
offer as it stands is `Quoting/commit`, and not the same concept.

_Chart components and suggestion pills._ A chart is a rendering of
[Querying](querying.md)'s state, and a suggestion pill submits a message, so
each is an affordance on an existing stimulus. See
[Concept](../method/concept.md#what-is-deliberately-not-a-concept).

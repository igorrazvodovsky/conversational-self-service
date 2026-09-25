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
| [Specifying](specifying.md) | to hold what a party requires, in their own words, as separate clauses each of which can be answered, relaxed, or deliberately left open |
| [Binding](binding.md) | to keep every committed value bound to the requirement it answers, so that a value can later be substituted, explained and attributed rather than merely overwritten |
| [Asserting](asserting.md) | to hold what a party asserted of a specification apart from what its rules entailed |
| [Conversing](conversing.md) | to carry what a party says into the system, in the order it was said |
| [Constraining](constraining.md) | to limit a specification to combinations that can actually be built |
| [Cataloguing](cataloguing.md) | to say what may be ordered, in terms a person can recognise |
| [Pricing](pricing.md) | to say what each choice adds to the cost of a specification |
| [Footprinting](footprinting.md) | to estimate the carbon a specification will emit over its service life |
| [Quoting](quoting.md) | to hold an offer still — what is offered, at what price, on what terms, until when — so that a party can accept it as it stood |
| [Stipulating](stipulating.md) | to hold the conditions on which an offer is made, so that every quote is made on stated terms |
| [Profiling](profiling.md) | to hold what a party says of who they are, so that a document can name and address them |
| [Naming](naming.md) | to give an item a title and a place that a person will recognise it by |

## The rest of the surface — ours, fully specified

| Concept | Purpose |
|---|---|
| [Deciding](deciding.md) | to obtain a person's choice on a matter the system cannot settle alone |
| [Scheduling](scheduling.md) | to fix a time that the parties to a meeting have agreed on |
| [Querying](querying.md) | to retrieve the records that answer a question in the asker's own words |
| [Moding](moding.md) | to give one of several surfaces a viewer's attention |
| [Showing](showing.md) | to let a viewer choose which facts about an item are shown at a glance, and keep the choice |
| [Framing](framing.md) | to let a viewer narrow what is shown to the items that bear on one question, and keep the choice |
| [Theming](theming.md) | to let a viewer control the appearance of a surface, or defer it |

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

[Specifying](specifying.md) and [Binding](binding.md) are the case's slice 1:
the requirement in the buyer's words, and the relation from a value to the
clause it answers. Between them and Asserting the same value appears twice,
once as a choice and once as an assertion.

[Cataloguing](cataloguing.md), [Pricing](pricing.md), [Footprinting](footprinting.md)
and Constraining each hold one kind of fact about the same catalogue option,
which is the shortest route to why concepts are not entities.

[Conversing](conversing.md) is the only concept nothing reads from: its
completions appear in no `when`, and it exists so that the log's first entry
for a turn is the person's words.

[Quoting](quoting.md) is where the configuration stops being the point: an
offer, frozen as issued, that the specification can move away from without
changing.

[Showing](showing.md) and [Framing](framing.md) are the two viewer's-choice
concepts — which facts appear beside an item, and which items appear at all.

## What was here before

This model replaced one reverse-engineered from the starter's todo list. Two
concepts went with it:

- `Tasking` — tracking discrete pieces of work. Nothing in a configurator is a task.
- `Adorning` — attaching a glyph to an item. It existed to hold `Todo.emoji`, and there is no emoji here.

They are worth knowing about because the finding they carried survived the
change of domain. Seven user-meaningful task actions were implemented as one
whole-list setter; the equivalent mistake here would be a single
`configure(spec)` taking the whole assignment, and it is the mistake
[Asserting](asserting.md) exists to make impossible.

## Before writing another one

Three [bad smells](../method/objects.md#bad-smells) catch a concept that is
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
they do not exist. [Quoting](quoting.md) holds the one snapshot the
application cannot do without, and an offer is not a version;
[Naming](naming.md) gives the one specification a title and a site, which
makes it findable and not comparable.

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

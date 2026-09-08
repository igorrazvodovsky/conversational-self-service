# Concepts

The [concepts](../method/concept.md) of this application: an elevator
configurator built on the CopilotKit + LangGraph starter.

Under the method these notes are not documentation of the code. They are the
source the code is generated from — see
[From meaning to code](../method/implementation.md#generation). The rules by
which they interact are in [`../syncs/`](../syncs/README.md), and how far the
implementation answers to either is
[the alignment analysis](../conceptual-model.md).

Notes come at two tiers. Concepts we own carry a full WYSIWID §4 specification.
The one concept naming third-party machinery carries a purpose and a statement
of what we rely on it for, and nothing more — the policy is
[Two tiers of concept](../method/boundaries.md).

## The configurator — ours, fully specified

| Concept | Purpose |
|---|---|
| [Asserting](asserting.md) | to hold what a party asserted of a specification apart from what its rules entailed |
| [Constraining](constraining.md) | to limit a specification to combinations that can actually be built |
| [Cataloguing](cataloguing.md) | to say what may be ordered, in terms a person can recognise |
| [Pricing](pricing.md) | to say what each choice adds to the cost of a specification |
| [Footprinting](footprinting.md) | to estimate the carbon a specification will emit over its service life |

## The rest of the surface — ours, fully specified

| Concept | Purpose |
|---|---|
| [Deciding](deciding.md) | to obtain a person's choice on a matter the system cannot settle alone |
| [Scheduling](scheduling.md) | to fix a time that the parties to a meeting have agreed on |
| [Querying](querying.md) | to retrieve the records that answer a question in the asker's own words |
| [Moding](moding.md) | to give one of several surfaces a viewer's attention |
| [Theming](theming.md) | to let a viewer control the appearance of a surface, or defer it |

## Bootstrap concept — theirs, purpose only

| Concept | Purpose |
|---|---|
| [Copiloting](copiloting.md) | to carry stimuli between a person, an application surface and a model |

Per WYSIWID §6.7, every framework mechanism belongs here rather than becoming a
concept of its own. It carries no state, no action signatures and no
operational principle, deliberately and permanently.

## Reading order

Start with [Asserting](asserting.md) and read
[Constraining](constraining.md) next. Between them they carry the design's one
real claim — that what a person asked for and what follows from it are two
kinds of fact, and that a configurator storing them in one field cannot answer
the question a person most often has.

[Cataloguing](cataloguing.md) is the shortest route to why concepts are not
entities: it takes one JSON object apart into four concepts' facts and says
what each of the pieces is for.

## What was here before

This model replaced one reverse-engineered from the starter's todo list. Two
concepts went with it:

- `Tasking` — tracking discrete pieces of work. Nothing in a configurator is a task.
- `Adorning` — attaching a glyph to an item. It existed to hold `Todo.emoji`, and there is no emoji here.

They are worth knowing about because the finding they carried survived the
change of domain. Seven user-meaningful task actions were implemented as one
whole-list setter; the equivalent mistake here would be a single
`configure(spec)` taking the whole assignment, and it is the mistake
[Asserting](asserting.md#why-this-is-separate-from-constraining) exists to
make impossible. The history is in
[the alignment analysis](../conceptual-model.md#what-this-replaced).

## On "In the code" sections

Some notes carry one and some do not, and the difference is deliberate. A note
grows an "In the code" section when the implementation *departs* from the
specification — that section is an alignment finding, not documentation.
[Querying](querying.md), [Scheduling](scheduling.md) and [Theming](theming.md)
have one each, and each records something the code does not do. The rest have
none because there is nothing to report: the code was generated from the
specification and answers to it. If you find yourself writing one, you have
found a finding.

## Before writing another one

Three [bad smells](../method/objects.md#bad-smells) catch a concept that is
really a class declaration: state with no sets, an action that cannot be
defined on the individual it names, and a purpose that needs an "and". The last
is the cheapest and catches the most.

## Not concepts

_Explaining._ It would have no actions; nobody performs *explain*. The rules
responsible for a conflict are an output argument of the failing case of
`Constraining/assume`. See
[Constraining](constraining.md#why-the-explanation-is-not-its-own-concept).

_Naming, versioning or comparing a specification._ There is one specification
per session. A configurator sold to anyone would need all three, and each is a
concept rather than a field; leaving them out is a scope decision, not a claim
that they do not exist.

_Quoting._ Freezing a specification and its price into an offer with a validity
date is the obvious next concept, and is absent for the same reason.

_Chart components, suggestion pills, and conversation itself._ Reasons in
[Concept](../method/concept.md#what-is-deliberately-not-a-concept) and
[Copiloting](copiloting.md#two-deliberate-exclusions).

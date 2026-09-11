# The ontology

The vocabulary this project is grounded in, drawn from two papers:


- MSM — Meng, Namazov, Schare, Cunha & Jackson, _Making Software Meaningful_, arXiv:2606.11051v1 [cs.SE], June 2026
- WYSIWID — Meng & Jackson, _What You See Is What It Does: A Structural Pattern for Legible Software_, Onward! '25, arXiv:2508.14511v2, doi:10.1145/3759429.3762628

and one shorter piece the first of them cites, which turns out to matter more than its length suggests:

- Jackson, _Why Concepts Aren't Objects_, blog post, 2026 — [notes](objects.md)

Where they appear to disagree, [Concept](concept.md#which-source-wins) states the precedence rule: the source addressing the axis wins.

The claim the papers rest on is that a software system has a meaning, that meaning has a form, and the form is small.

## The four phenomena

- [Individual](individual.md) — a unique entity with persistent identity, and nothing else
- [Value](value.md) — something interpretable by its structure or by comparison
- [Action](action.md) — an atomic named occurrence with named inputs and outputs
- [Fact](fact.md) — an assertion about an individual, or a relation between individuals and values

That is the whole ontology. MSM §4.3: "This simple structure of individuals, values, actions and facts is sufficient to define the behavior of even the most complex software systems."

## The two organizing elements

Four phenomena are not enough structure for a system with a hundred actions, so two more elements organize them:

- [Concept](concept.md) — a partition of the actions, with their facts, around one purpose
- [Synchronization](synchronization.md) — a declarative rule mediating between concepts, and the only way they may interact

## What the structure is not

- [Objects](objects.md) — why the chunk is a purpose rather than an entity, the three bad smells of a concept written as a class, and the naming retraction that settles [gerunds](concept.md#naming)

## Applying it

- [Two tiers of concept](boundaries.md) — this project's rule for how far a specification goes: full for code we own, purpose only for code we do not
- [Misalignment](misalignment.md) — the vocabulary for saying what is wrong: conflation, dark concepts, substitution
- [Code of conduct](conduct.md) — governing an actor that acts in your absence, and how a prohibition becomes a permission

## Getting to code

- [From meaning to code](implementation.md) — how the phenomena map to code primitives, what shape the repository takes, the action log, and why the concept specification is the prompt that generates its own implementation

## Applying it here

The concepts of this application are in [`../concepts/`](../concepts/) and the
rules between them in [`../syncs/`](../syncs/).

The notes come first and the code is generated from them. Where the two have
drifted, the note is right and the code is wrong — that is what it means for a
specification to be [the prompt](implementation.md#generation).

# Concept

The organizing mechanism above the four phenomena. See [the ontology](README.md).

> The meaning of even a small software system may involve a dozen types of individuals, and a hundred actions. Clearly some additional structuring is needed. Our approach is to use concepts as the organizing mechanism. Each concept corresponds to a functional concern or responsibility. The actions are partitioned among the concepts, and their associated facts follow them.
>
> — MSM §4.4

A concept is a partition of the [actions](action.md), with the [facts](fact.md) following. [Individuals](individual.md) are *not* partitioned — the same individual participates in many concepts, and that asymmetry is what separates this from object orientation, where the individual is the module and every concern about a user ends up on the `User` class.

A concept is its own state machine, understandable on its own. Where it refers to something owned elsewhere it does so through a type parameter, which cannot be constrained — so `Comment [Target]` works against posts, products or articles without knowing what any of them are.

In architectural terms a concept resembles a microservice, "although more truly *micro*, since a conventional microservice would comprise many concepts" (MSM §2.5). Unlike microservices, concepts have no dependencies on each other at all — no calls, no state reads, no foreign keys. Composition happens entirely in [synchronizations](synchronization.md).

## Naming

Gerunds — `Tasking`, `Authenticating`, `Adorning` — not nouns.

The three sources appear to disagree. WYSIWID uses nouns: `Password`, `Post`, `Web`. MSM uses gerunds and gives a reason — concepts "correspond to activities or functional concerns; they are more like verbs than nouns" (MSM §2.5).

The disagreement is settled by the author of the nouns. [Why concepts aren't objects](objects.md) opens by taking the blame for them:

> I've been surprised at how many people think concepts are objects (in the object-oriented sense). And I suspect that I'm largely to blame, for giving names to concepts that sound like objects — `Post` rather than `Posting` for example.

That is a retraction naming the exact substitution, so it decides the question outright rather than on grounds of recency. The cost of the noun form is the one the whole method exists to avoid: a concept named `Post` invites the reading that it is the `Post` class, and a reader who takes that reading will look for a price on the option rather than in [Pricing](../concepts/pricing.md).

## Which source wins

<a id="which-source-wins"></a>
Three sources describe this method, and they use three notations. A precedence rule, so this is not re-argued each time something new appears:

_The source addressing the axis wins._

| Question | Source | Why |
|---|---|---|
| Naming | [The objects piece](objects.md) | Jackson retracting his own choice on a naming question is decisive on that question. |
| Specification syntax | WYSIWID §4 | It is the only notation designed to feed a [synchronization](synchronization.md) engine. Named-argument records are what §5.2's partial matching and §5.3's error overloads require. |
| Ontology and code shape | MSM §4–5.2 | The only systematic treatment of the four phenomena and their mapping to code. |
| Why not objects | [The objects piece](objects.md) | MSM footnote 6 cites it for exactly this. |

Recency alone is *not* the rule. The objects piece is the most recent source and writes actions as `register (name: String, pass: String): (user: User)` with `requires`/`effects`, state as "a set of `Users` with a username `String`", and no operational principle at all. Adopting that here would cost eight rewritten concept notes and lose the bracket-and-arrow form the DSL depends on. It is a prose exposition for readers, not a specification language for an engine, and it is not trying to supersede one.

## Specification format

From WYSIWID §4. Every concept note in [`../concepts/`](../concepts/README.md) is this block and nothing else, as in the paper's Appendix B — no rationale before or after it. The purpose is the argument for the concept; what a concept is *not* is said by the concepts that hold those facts, and how it meets its neighbours is said by the [rules](../syncs/README.md). The one exception is the note held at the abstract tier, which carries a purpose and the contract relied on. See [Two tiers of concept](boundaries.md).

```
concept Name [TypeParams]

purpose
  a phrase saying what value this delivers

state
  relation: Type -> Type

actions
  actionName [ input: Type ; input: Type ]
    => [ output: Type ]
    informal prose describing what it does

  actionName [ input: Type ; input: Type ]
    => [ error: string ]
    the conditions under which it fails

queries
  queryName [ input: Type ; input: Type ]
    => [ output: Type ]
    the calculation over the concept's own state; records nothing

operational principle
  an archetypal scenario showing how the concept fulfils its purpose
```

Notes on the parts:

- `purpose` is what makes the concept a unit of meaning rather than a bag of functions. A concept that cannot state one is not a concept.
- `state` is [facts](fact.md) as relations, in Alloy style.
- `actions` are split into cases in the pattern-matching style of functional languages. Usually the cases differ in their outputs, as WYSIWID §4's do, but a case may also differ in its inputs. Error cases are ordinary cases; `error` is just an argument name (WYSIWID §5.3).
- `queries` is optional, and this project's addition to the format. It declares a calculation that a concept performs over its own state and that a rule or the read side needs, and that its exposed relations cannot answer on their own: a total, an estimate, what a solver would say under other assumptions. A query records nothing and appears in no `when`, so it is not an action. It belongs in the specification because the specification is what the concept is generated from, and a calculation left out of it is lost on regeneration. A record assembled from a concept's relations, or a filter over them, is not a query: that is what WYSIWID §6.4's getters were, and a `where` writes it over exposed state instead. When more than one reader needs it, it is named once in the sync notes, as *met* and *the pending questions* are.
- Specifications are deliberately partial — WYSIWID §4 omits password well-formedness rules "because these details are not needed for synchronizations."
- `operational principle` is an archetypal scenario, useful both for understanding the concept and for generating its test cases.

Concepts expose their state to synchronizations rather than hiding it behind getters (WYSIWID §4). Reads and writes are strictly separated: reads are queries, writes are actions. WYSIWID §6.4 is blunt about the alternative — "Our solution to this is simply to have no getters" — because getters proliferate to serve clients' query needs and end up coupling the concept to its callers.

That rule is narrower than "every action must write." WYSIWID §4 keeps `Password/check`, which returns a boolean and changes nothing, because it "is genuinely an action that would make sense to a user." What it rules out is the accessor that exists only to serve a caller: "an observer action that merely obtains a reference to a user from the user's email address, a query that synchronizations might perform for reasons that are of no interest to the user." The discriminating question is whether a person would recognise it as something they did.

## Checking a specification

Three tells that what you have written is a class declaration rather than a concept, from [the objects piece](objects.md#bad-smells):

1. The `state` section has no sets — it lists the properties of one individual.
2. An action cannot be defined on that individual, because it needs the whole set (find *which* task has this title) or a second individual.
3. The `purpose` will not come out coherent. If it needs an "and", it is two concepts.

The third is the cheapest, because it needs no code. It is the test that separates [Deciding](../concepts/deciding.md) from [Scheduling](../concepts/scheduling.md), and [Cataloguing](../concepts/cataloguing.md) from [Pricing](../concepts/pricing.md) and [Footprinting](../concepts/footprinting.md).

Identity is never a state relation. "There is no need for a `userid` field; each `User` individual implicitly has an identity" — which is why no concept note here declares an `id`. That is a rule about specifications and not about code; see [Individual](individual.md#two-levels).

## The concepts of this repository

Ten domain concepts and one bootstrap concept, indexed in [`../concepts/`](../concepts/README.md), with one module each in `agent/concepts/` and the rules between them in `agent/syncs/`.

The five that carry the configurator are [Asserting](../concepts/asserting.md), [Constraining](../concepts/constraining.md), [Cataloguing](../concepts/cataloguing.md), [Pricing](../concepts/pricing.md) and [Footprinting](../concepts/footprinting.md). The split worth defending is the first two: what a person asked for and what follows from it are two concepts, not two fields, and [Asserting](../concepts/asserting.md#why-this-is-separate-from-constraining) argues it.

The one worth defending in the other direction is [Constraining](../concepts/constraining.md), which holds the rules *and* answers what they still allow. That looks like two concerns and is one, on the `Password` precedent: WYSIWID §4 gives that concept both `set` and `check` under a single purpose, because holding the secret and testing against it are the same job.

## What is deliberately not a concept

The repository has eight framework mechanisms that a naive reading would promote to concepts: `CopilotChat`, `useFrontendTool`, `useComponent`, `useHumanInTheLoop`, `useDefaultRenderTool`, `useConfigureSuggestions`, the A2UI surfaces, the MCP client. None is a unit of meaning; each is a way of carrying a stimulus across a boundary. WYSIWID §6.7 collapses all such machinery into a single bootstrap concept, which is what [Copiloting](../concepts/copiloting.md) does.

The chart components are likewise not concepts. They have no state and no lifecycle — a pie chart is a rendering of [Querying](../concepts/querying.md)'s state, and "this data was displayed" is not a fact anyone needs recorded.

The discriminating question in every case: does it have a purpose you could state to a user, and facts that persist after the screen changes?

## See also

- [Synchronization](synchronization.md) — the only way two concepts may interact
- [Action](action.md) — what a concept is a partition of
- [Objects](objects.md) — why the chunk is a purpose and not an entity

# Individual

One of the four phenomena of the ontology. See [the ontology](README.md).

> An individual represents a unique entity with a persistent identity. Individuals can have limited or unlimited lifetimes, and may come into existence at some time and disappear at another.
>
> — MSM §4.1

An individual is not composite. It has no attributes and contains nothing. Identities can be matched, but not compared or decomposed. Everything else said about an individual is said in [facts](fact.md) that associate it with [values](value.md) and with other individuals.

MSM footnote 6 is explicit that this is load-bearing rather than stylistic: the relational view "is critical to escaping from the conflation that object orientation produces, preventing effective separation of concerns." The footnote cites [Why concepts aren't objects](objects.md), which is the argument in full; the short version is that "an object is represented by nothing more than its identity, and can be associated with other objects and with non-object values by relationships."

What counts as an individual is decided by whether identity does any work, not by whether the thing feels concrete. Users are individuals; passwords are not, "because passwords are just strings, and what makes a particular string a password is that it's the password of some user." Being a password is a [fact](fact.md).

## Two levels

<a id="two-levels"></a>
Identity appears differently in a specification and in code, and the two sources say apparently opposite things because they are talking about different levels.

| | Specification | Code |
|---|---|---|
| Rule | Identity is implicit. An individual never has an id relation. | An individual *is* an id — a UUID, or any other name that identifies exactly one. |
| Source | "There is no need for a `userid` field; each `User` individual implicitly has an identity" ([objects](objects.md#bad-smells)) | "Individuals → UUIDs" (MSM §5.2) |
| Here | No concept note declares an `id`; see [Asserting](../concepts/asserting.md)'s state section. | An option *is* `rated_load:kg1000`, and correct. |

An explicit `id` in a `state` section is one of the [bad smells](objects.md#bad-smells) — it usually means the section is listing the fields of a record. An explicit identity in code is what the method asks for. Reading either rule at the other level produces a contradiction that is not there.

Individuals are not assigned to [concepts](concept.md). The same individual participates in many — a `User` is known to `Authenticating` by a password and to `UserDisplaying` by a bio, and neither concept owns it.

In code, an individual is a UUID (MSM §5.2). Not an object with methods: "an object with a fixed set of methods would misrepresent the capabilities of an individual and would be a brittle abstraction."

## In this repository

| Individual | Identity in code | Assessment |
|---|---|---|
| Variable | its name — `rated_load` (`agent/wiring.py`) | Genuine. Named by the catalogue, and the name is the identity. |
| Option | `variable:value` — `rated_load:kg1000` (`agent/wiring.py`, `oid`) | Genuine, and qualified on purpose. `kg1000` alone is not an identity: `standard` names four different options in the source file. |
| Rule | its catalogue id — `R15` (`agent/concepts/constraining.py`) | Genuine. Its `because` sentence is a [fact](fact.md) about it, not part of it. |
| Specification | one per running instance, `SPEC` (`agent/wiring.py`) | Genuine, and deliberately impoverished — see below. |
| Action occurrence | a UUID on every log record (`agent/engine/log.py`) | Genuine. This is what provenance edges point at. |
| Flow | `flow-…`, minted per root action (`agent/engine/log.py`) | Genuine, and the thing the CopilotKit starter has no equivalent of. |
| Grid | `today`, `decarbonising` (`agent/wiring.py`, `GRIDS`) | Genuine. Two carbon intensities the same specification ranks differently against. |
| Retraction candidate | none — it is a value | Correctly *not* an individual. Two candidates naming the same variable and option are the same candidate, so identity would do no work. See [Value](value.md). |
| Thread, message | SDK-internal | Genuine, opaque to this codebase. |

Two rows repay attention.

_Option._ The qualified identity is the whole of WYSIWID §6.1's argument in
miniature: names are a chronic source of illegibility, and the answer is to
qualify them until they identify one thing. The paper goes as far as URIs
(`…/Password/set/password`); `variable:value` is the same move at the scale
this application needs.

_Specification._ There is exactly one, and it has no name, no owner, no
revision and no sibling to be compared against. That is a scope decision rather
than a claim about the domain — a configurator sold to anybody needs all four,
and each is a concept rather than a field. It is recorded here because a single
hard-coded identity is exactly the shape that stops being genuine when the
application grows, and the note should say so before somebody discovers it.

## See also

- [Fact](fact.md) — how everything else about an individual is said
- [Value](value.md) — the other kind of participant in an action
- [Asserting](../concepts/asserting.md) — the concept that owns what a person asked of a `Spec`
- [Objects](objects.md) — why an individual is not an object, at length

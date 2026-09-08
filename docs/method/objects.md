# Why concepts are not objects

The argument [Individual](individual.md) and [Fact](fact.md) compress into a footnote, stated in full.

MSM footnote 6 makes a strong claim in two sentences — that individuals are not composite, "do not 'contain' attributes," and that this relational view "is critical to escaping from the conflation that object orientation produces." Its authority is reference [21]: Daniel Jackson, _Why Concepts Aren't Objects_, 2026. This note is that source. It is not a fourth position alongside the two papers; it is the reasoning the footnote points at.

Jackson opens by taking the blame for the confusion:

> I've been surprised at how many people think concepts are objects (in the object-oriented sense). And I suspect that I'm largely to blame, for giving names to concepts that sound like objects — `Post` rather than `Posting` for example — and for not being forceful enough in explaining what's wrong with objects.
>
> When I wrote my book, I underestimated how much object orientation has shaped how people think about software. […] So I relegated my explanations of why concepts aren't objects to two page-long end notes.

That first sentence settles this project's [naming question](concept.md#naming) on its author's own authority.

## Four things "object oriented" means

The piece separates them, because only the last is the error.

| Sense | Verdict |
|---|---|
| _Objects as individuals_ — the world contains entities with persistent identity | Compatible, and essential. "This notion is just as essential to concept design as to any other software development approach." |
| _Objects as machines_ — little state machines calling each other's methods | Compatible **as an implementation technique**. Concept design "uses action synchronization to eliminate dependencies, which can be seen as a particular implementation pattern (related to the patterns used in many event-driven architectures)." |
| _Objects as datatypes_ — classes as abstract data types | Orthogonal. Data abstraction and object orientation "just happen to have been conflated in the history of programming languages." |
| _Object-oriented **design**_ — the domain is modelled as objects whose methods are the real-world actions | The error. |

The second row is the one that licenses this project's [two-tier boundary](boundaries.md). React components and CopilotKit hooks are objects-as-machines, used as implementation. They are not a domain model, and holding them at the abstract tier is the sanctioned treatment rather than a compromise.

Even the first row carries a qualification that matters here:

> It doesn't require thinking of objects as composite structures that have 'values' distinct from their 'identities.' Better to take the relational view that an object is represented by nothing more than its identity.

## Why object-oriented design fails

Five failures, each of which has a counterpart in this repository.

_Functions on more than one object._ "A bank transfer, for example, updates the state of two accounts, so it can't be represented by a method on just one." And more often than expected, an action that looks single-object is really about the whole set: renaming a user is about every user if names must be unique; authenticating begins by finding *which* user has a name, "which isn't a method of any user object."

_Relational functions._ "Who should `follow` be assigned to, the following or followed user? Is upvoting a method of a user or a post?" Introducing link objects does not rescue it — you still need a collection object to ask whether two users are friends, "and what are you going to call it, by the way? It's not easy to find a compelling name, and that alone should make you suspicious."

_Aggregates._ A cart with line items: `add` stops being a method on one object, "and neither can exist without the other." Domain-driven design answers this with aggregates; the complication "arises only because of the insistence that the domain should be modeled with objects whose methods correspond to real-world actions."

_Directionality._ An instance variable prescribes a navigation direction. Posts holding an array of comments is "exactly the wrong way round" — comments should hold their post, because posts without comments are commoner than comments without posts — but then a post cannot reach its comments, so codebases keep links both ways and inherit an invariant to maintain.

_Separating views._ The most serious. Asking "what do I know about users?" conflates every function a user participates in onto one object — username and password for authentication, display name and bio for profiles, plus karma, friends, upvotes. "These all belong to very different functions and should be separated." The precedents named are mixins, subject-oriented and aspect-oriented programming, roles, and the entity-component pattern from games, which "is similar in some ways to our standard implementation of concepts."

## Chunking

The positive argument, and the clearest statement of why the unit is a concept and not an entity.

Software models three kinds of thing: individuals with persistent identity, relationships between them, and actions that change those relationships. "If it helps, you can think of individuals as nouns, relationships as adjectives, and actions as verbs. These provide a vocabulary of behavior, but they don't suggest any structuring principle."

The structuring principle is borrowed from expertise research. What distinguishes experts from novices is chunking — "a musician doesn't think of a composition in terms of individual notes, but in terms of bars, or motifs, or themes." A concept is the chunk: it "brings together all the behaviors associated with a particular purpose."

> In object-oriented design, the chunks are equated with the individuals themselves. The economy of this idea is very appealing: why introduce a new notion when an existing one will suffice? […] And indeed the idea works very nicely in some cases.

It works for a `GroupChat`, where joining, leaving, posting and replying really are actions on one group. It fails for password authentication, where a `Password` object cannot find itself by username, cannot enforce uniqueness, and so spawns a `PasswordTable` — "and now we have password-related behaviors split across multiple objects."

Note what the concept treatment does to the individuals. Users are individuals; passwords are not, "because passwords are just strings, and what makes a particular string a password is that it's the password of some user." Being a password is a [fact](fact.md), not an identity.

## Bad smells

<a id="bad-smells"></a>
Jackson gives three tells that a specification is a class declaration wearing a concept's clothes. They are a usable checklist, and the `concept-audit` skill applies them.

The example he rejects:

```
concept User
purpose manage users
state
  userid
  username
  password
  email
  displayname
actions
  register (username, password)
  authenticate (username, password)
```

1. _The state has no sets._ It "seems instead to list the properties of a single user." Concept state relates a *set* of individuals to values; a flat list of fields is a record.
2. _The actions cannot be defined on that single individual._ "The `authenticate` action makes no sense: which user is to be compared with the given username and password?"
3. _The purpose cannot be written coherently._ "The presence of the `email` and `displayname` fields conflates user authentication with user profiles; this is why it's not possible to write a coherent purpose for the concept."

The third is the strongest of the three, because it is checkable without reading any code. If the purpose needs an "and", the concept is two concepts.

His repair:

```
concept PasswordAuthentication
purpose authenticate users
state
  a set of Users with
    a username String
    a password String
actions
  register (name: String, pass: String): (user: User)
    effects creates a new user with username name and password pass
  authenticate (name: String, pass: String): (user: User)
    requires some user with username name and password pass
    effects returns the matching user
  authenticate (name: String, pass: String): (error: Error)
    requires no user with username name and password pass
    effects returns an appropriate error message
```

Two details worth noticing. The `userid` field is gone — "each `User` individual implicitly has an identity," so identity is never a state relation. And `authenticate` appears twice, split on its output, which is the same overloading WYSIWID §4 uses and the reason error handling needs no special feature.

On dialect: this is a third notation, with `requires`/`effects` where WYSIWID §4 writes informal prose, and no operational principle in either worked example. These notes keep WYSIWID's syntax; the reasoning is in [Concept](concept.md#which-source-wins).

## In this repository

The `User` bad smell is the catalogue's option record with different field
names. Every one of the two hundred-odd options in `agent/catalogue/elevator.json`
has this shape:

```json
{ "value": "kg1000", "label": "1000 kg / 13 persons", "price": 3000,
  "co2": 90, "note": "a stretcher fits" }
```

All three tells are present.

_No sets._ It lists the properties of a single option. What the domain needs is
a relation over the set of them — which options a variable offers, what each
costs, what each is estimated to emit.

_The actions cannot be defined on that individual._ You cannot ask one option
what a specification costs. The whole-collection function the piece predicts
arrives on schedule: some `total(options)` appears, and the only question is
which module it lands in.

_The purpose will not come out coherent._ There is no single answer to *what is
this object for*. `label` and `note` exist so a person can recognise the
option; `price` exists so a quotation can be totalled; `co2` exists so a
footprint can be estimated. Three purposes, the same conflation as `email`
against `password`.

Read as [facts](fact.md), the same information distributes without residue and
each piece lands in the concept whose purpose it serves:

```
offers   (rated_load, kg1000)                  Cataloguing
label    (kg1000, "1000 kg / 13 persons")      Cataloguing
note     (kg1000, "a stretcher fits")          Cataloguing
capital  (kg1000, 3000)                        Pricing
embodied (kg1000, 90)                          Footprinting
range    (rated_load, kg1000)                  Constraining
```

The concrete payoff, rather than the aesthetic one: a catalogue with no carbon
data is an ordinary product catalogue and still works, because
[Footprinting](../concepts/footprinting.md) simply holds no facts. Under the
record shape, `co2` would be a column of nulls and every reader of the record
would have to decide what a null meant.

_Identity._ The record's `value` field is the one place to read carefully
rather than quickly. "There is no need for a `userid` field" is a claim about
*specifications*: identity is implicit in an individual, so it is never a state
relation — which is why no concept note here declares one. It is not a claim
about code, where MSM §5.2 asks for the opposite: "Individuals → UUIDs."
`wiring.py` mints `rated_load:kg1000` as the option's identity, and is right to,
because `value` alone does not identify one — `standard` is a service level, an
energy package, a control panel and a lead time, four different individuals
spelled the same way. See [Individual](individual.md#two-levels).

## See also

- [Individual](individual.md) — the phenomenon this piece defends, and the two levels it lives at
- [Fact](fact.md) — the relational view, and what the catalogue record costs
- [Concept](concept.md) — naming, and which source wins on which question
- [Two tiers of concept](boundaries.md) — objects as implementation, sanctioned here

## Source

Daniel Jackson, _Why Concepts Aren't Objects_, blog post, 2026. <https://essenceofsoftware.com/posts/concepts-and-oop/>. Cited as reference [21] of MSM, in support of footnote 6.

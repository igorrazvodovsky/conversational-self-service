# From meaning to code

How the [ontology](README.md) is realised in an implementation. MSM §5.2, with WYSIWID §6 on the runtime and §7 on generation.

> Applying concept design to code is the process of software development flipped on its head: instead of assigning meaning to structures, the goal is to assign structures to meaning. The patterns that implement a concept, such as the choice of data structure or control flow, are secondary to its names (concept, actions, parameters).
>
> — MSM §5.2

The selection principle is simplicity: "the pattern that most succinctly captures the phenomena is preferred."

## Phenomena to primitives

| Phenomenon | Code | Why this and not something else |
|---|---|---|
| [Individual](individual.md) | a UUID | "In the same way that individual people are free to participate in an open and wide variety of actions, so too must the code enable the same flexibility." An object with a fixed set of methods "would misrepresent the capabilities of an individual and would be a brittle abstraction." |
| [Value](value.md) | value-objects — primitives and collection types | Already "treated as interpretable by their structure and content alone" in every language. |
| [Action](action.md) | a function from a map to a map, keys being the named parameters | Handles arbitrary input and output arity, and gives actions a uniform shape "e.g., for logging and synchronization." |
| [Fact](fact.md) | a relation | "canonically in relational databases, normalized into a triple-store, or rendered into trees in a document store with manual management of invariants." |

## The concept idiom

MSM §5.2 spells this out for TypeScript:

- _Concept → singleton class._ One stable instance per concept, "concerned only with one concern, such as Authenticating. This class forms a namespace and isolation boundary for the lifecycle of the concept, consolidating all necessary implementation details in one location."
- _State → attributes._ Held internal to the class, possibly as a database connection rather than the data itself. Either way it relates individuals (UUIDs) and values.
- _Action → method._ Takes a JSON map, returns a JSON map, corresponding to the action's parameters. Side effects and computation happen in the body.

The framework demand is deliberately near zero:

> Notably, when implementing concepts, there are no requirements for extending a custom class, importing a framework, or using any DSL. A vanilla TypeScript class that adheres to the convention of all actions taking and returning a JSON map is sufficient structure for a concept.

## Repository shape

From MSM §5.2.1:

```
src/concepts/    one class per concept, own folder, with its tests
src/syncs/       independent blocks, any nesting, named name.sync.ts
src/engine/      provided; developers do not touch it
src/main.ts      provided; discovers concepts, wires synchronizations
```

Developers only ever touch `concepts/` and `syncs/`. A concept can be dropped in from elsewhere with no modification or configuration and made useful purely by adding [synchronizations](synchronization.md) that refer to it.

MSM §5.2.4 records that this boundary is load-bearing when LLMs are involved: agents "sometimes decided to modify engine code as a shortcut to implementing behavior that belonged within a concept or synchronization," and "no example of a modification to engine code was found to be legitimate."

## What "ontology" does not mean here

Worth stating plainly, because the word invites the wrong reading. The [ontology](README.md) is the four kinds of phenomena. It is not a knowledge graph, and there is no ontology artifact to build alongside the code — no schema file, no triple store of domain entities. It lives in the code as naming discipline and module shape.

Both papers are explicit. MSM §2.4 faults the field of conceptual modeling for having "tended to be more interested in representations of data (such as knowledge graphs and ontologies) than in representations of behavior." WYSIWID §2 is blunter: "In contrast to the way the word is sometimes used in other settings, a concept is not an element in an ontology. In the field of conceptual modeling, a 'conceptual model' is often a data model in which the concepts are entities."

There is one real exception, and it is a naming solution rather than a modeling one. WYSIWID §6.1 observes that names are a chronic source of illegibility — "does `user` refer to a class, an argument, or an identifier?" — and answers it with URIs:

```
https://essenceofsoftware.com/concepts/0.1/Password/set/password
```

The last three segments are exactly the three levels of a concept specification: concept, action, argument. The RealWorld case study therefore holds concept state in RDF quad stores, so predicates are fully qualified names, and implements the `where` clause with a SPARQL engine (§6.4, §6.5). §6.2 then co-opts the quad's fourth element, the graph identifier, to carry the application version, so several versions of a running application coexist in one database without confusion.

That is a deployment convenience the pattern permits, not a commitment it requires. A relational database works, with a mapping from column names to their qualified forms.

## No layers

MSM §5.2.2: middleware, API servers, routers and dependency injection are absent, because they are not units of meaning. Anything genuinely needed becomes a concept instead — HTTP handling becomes a `Requesting` concept with two actions, `request` and `respond`, and the `path` parameter lets synchronizations do the router's job by pattern matching.

> What differentiates this approach from existing web development frameworks is not modularity of structure — many of these frameworks were invented precisely to factor out code into separate parts — but rather modularity of meaning.

## The action log

MSM §5.2.3. Both invocations (the request with its inputs) and completions (what happened, error or not) are committed. The log is the source of truth: "the state of concepts can be reconstructed entirely from the log," and even non-deterministic actions replay deterministically from their recorded completions.

Three properties follow:

- _Accountability._ Every action carries provenance edges to the actions that caused it, labelled by the synchronization responsible — itself an addressable, uniquely named element of the code. The invariant: every action reaches the log by way of some synchronization.
- _Reliability._ Synchronizations fire only after actions are committed, and the invocation/completion split lets the system survive crashes mid-processing. Full reification of history also gives replay from any prefix, deterministic testing and what-if branching.
- _Usability._ Unlike events, "which tend to grow increasingly illegible in systems where downstream processors require more and more metadata," action records share their schema with the concept every party already understands, so they stay a stable readable surface.

## Generation

The link from specification to code, and the reason the [concept notes](../concepts/) exist.

WYSIWID §7.3 states it most directly: _the prompt for the implementation is exactly the concept design spec._ They demonstrate it by deleting two actions and a state component from an over-eager `Password` specification and regenerating a correct implementation in a single pass. Behavior is changed by editing the spec, not by patching the code.

MSM §5.2.4 gives the full loop:

1. _Problem framing._ Describe what the system should achieve, as markdown.
2. _Designing concepts and behavior._ Work with an LLM to break the problem into concept specifications and declare the behavior between them as synchronizations.
3. _Generating concepts._ One LLM call per concept, from its specification. "Given the simplicity of concepts, this was observed in practice to be highly reliable."
4. _Generating synchronizations._ One call per sync spec; the code is incorporated by being placed in `syncs/`.

The context economics are the payoff:

> As no concept can import another, LLM generation could proceed both in parallel and with a much smaller set of context: only the shared background documents were necessary, and no concept needed to understand either other concepts, or synchronizations. For synchronizations, only the declared concepts would need to be referenced.

Measured at under $0.09 per concept with managed context, against more than $3 for a commercial agent working the repository directly (MSM §5.2.4). The same section names the failure mode of skipping this discipline — _agentic debt_, "the compounding price of delegating decision-making to agents without staying in the loop."

## In this repository

The layout follows §5.2.1, on the agent side, in Python:

| MSM §5.2.1 | Here |
|---|---|
| `src/concepts/` — one class per concept | `agent/concepts/` — one module per concept, each a singleton class whose actions take and return dicts |
| `src/syncs/` — independent blocks | `agent/syncs/` — `seeding.py`, `gestures.py`, `propagation.py`, `conduct.py`, each a list of `Sync` values |
| `src/engine/` — provided, untouched | `agent/engine/` — the log, flows, provenance, and the dispatcher |
| `src/main.ts` — discovers concepts, wires syncs | `agent/wiring.py`, which also reads the catalogue in |

_The engine has no DSL._ It provides the log, the flow token, the provenance edge and the once-only guarantee; a rule is a function, not a parsed string. The `when`/`where`/`then` notation lives in [`../syncs/`](../syncs/README.md). This is the only place where a reader has to hold two representations of one thing in their head, and it is the cost of not building a matcher.

`agent/views.py` composes concept state and the arithmetic each concept declares over its own into the shape the canvas needs. It invokes nothing and appears in no rule. WYSIWID §6.4 puts it there — "reads are handled by client-driven querying capabilities" — and the alternative,
making the total an action, would have put *compute the total* in the log as
though somebody had performed it.

### The phenomena, mapped

| Phenomenon | Here |
|---|---|
| Individual | a name that identifies exactly one — `rated_load:kg1000`, `R15`, a record UUID |
| Value | dicts, strings, numbers |
| Action | a method from a dict to a dict, enforced by the engine, which raises if one returns anything else |
| Fact | a relation, held as a dict keyed by individual |

### The log

Booting writes about 1,300 records — the catalogue's arrival, as accountable as
a click — and `engine.settled_at` marks where that stopped and behaviour began.
Every record after it carries an actor (`person`, `model`) and, unless it is a
root action, the name of the rule that authorised it. The interface reads those
edges directly: *you asked for this*, *the assistant asked for this*, *adopted
from a proposal* are three different `via` values on the same action, and no
field anywhere records which one applied.

That is the property the CopilotKit starter cannot have. Its one write action
is `agent.setState`, called by both actors with the same payload shape, so no
log can distinguish completing a task from renaming one.

The log is also the only thing kept between runs. `agent/journal.py` appends
every record after the boot mark to a file as it is committed, and at the next
boot — after the catalogue has been read in afresh — replays the file: each
completion's recorded input is applied to its concept again, and the record
goes back into the log as it was, identity, timestamp and provenance edge
included. No rule fires during replay, because every derived completion is
already in the file; the once-only edges are restored with the records. That
is the paper's claim above, that the state of concepts can be reconstructed
entirely from the log, made into the persistence mechanism rather than a
property proven about one. It lives outside `engine/` because that directory
is not edited, and the one cost of that is that the durable log numbers its
own records.

## See also

- [Concept](concept.md) — the specification format that acts as the prompt
- [Synchronization](synchronization.md) — flows, provenance and the four design rules
- [Action](action.md) — why named arguments over a map, rather than positional

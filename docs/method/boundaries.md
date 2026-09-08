# Two tiers of concept

A project commitment, not a rule from the papers.

> Be true to the method in our own code. For third-party code, use concepts more abstractly: purpose yes, full specification no.

## The rule

| | Own code | Third-party code |
|---|---|---|
| purpose | stated | stated |
| assumed contract | — | stated: what we rely on it for |
| state as relations | specified | not specified |
| action signatures | specified | not specified |
| operational principle | specified | not specified |
| [synchronizations](synchronization.md) | written | not written |

A [concept](concept.md) we own gets the full WYSIWID §4 treatment, because we can make the code answer to it. A concept naming third-party machinery gets a purpose and a statement of what we depend on, and stops there.

## Why the line is drawn at ownership

A specification is a claim about behavior that the code is obliged to meet. For code we do not control, that obligation runs the wrong way — we would be asserting properties of somebody else's implementation, which is fiction on the day it is written and stale on the day they ship a minor version.

Worse, a full spec of third-party internals invites the same error the method exists to prevent. It looks like meaning and is actually a transcription of a vendor's API surface, which is exactly the "modularity of structure" MSM §5.2.2 distinguishes from modularity of meaning.

Naming the purpose is still worth doing. It says what the dependency is *for*, in the vocabulary the rest of the model uses, and it gives synchronizations a name to refer to when the boundary is eventually crossed.

## What sanctions this

The papers permit it without prescribing it. WYSIWID §2:

> Nevertheless, a concept may have dependencies on lower level services, such as databases, networking services and datatype libraries.

That is the sanction: infrastructure can be depended on without being turned into a concept.

[Why concepts aren't objects](objects.md) sanctions the specific case this repository is full of. Objects that are little state machines calling each other's methods — React components, CopilotKit hooks — are "compatible with concept design, so long as it's used strictly as an implementation technique rather than a domain-modeling principle." The line the policy draws is exactly that one. `useFrontendTool` is machinery; it is not a claim about the domain, and specifying it as though it were would make it one. The ownership rule above is this project's extension of it — the papers do not draw the line where we are drawing it, because their reference implementation owns everything down to the engine.

MSM §5.2.2's `Requesting` concept is *not* the precedent, and it is worth being clear about why. `Requesting` is fully specified because they write it. The equivalent here would be a `Requesting` concept we implemented over `fetch`, which would be ours and would get a full spec.

## Where the line falls in this repository

_Ours — full specifications, in [`../concepts/`](../concepts/README.md):_ [Asserting](../concepts/asserting.md), [Constraining](../concepts/constraining.md), [Cataloguing](../concepts/cataloguing.md), [Pricing](../concepts/pricing.md), [Footprinting](../concepts/footprinting.md), [Deciding](../concepts/deciding.md), [Scheduling](../concepts/scheduling.md), [Querying](../concepts/querying.md), [Theming](../concepts/theming.md), [Moding](../concepts/moding.md).

_Depended on without being specified:_ z3. It is the decision procedure inside
[Constraining](../concepts/constraining.md) and it gets no concept of its own —
WYSIWID §2's sanction is exact here, since a solver is a lower-level service in
the same sense as a database or a datatype library. The concept says what
`assume` means; which procedure computes it is
[secondary to the name](implementation.md).

_Theirs — purpose and assumed contract only:_ [Copiloting](../concepts/copiloting.md), covering the CopilotKit runtime, the chat and threads UI, frontend tools, generative UI, A2UI surfaces, the MCP client, and the LangGraph state channel.

The split is not a coincidence of this policy meeting the earlier domain/bootstrap distinction. WYSIWID §6.7's bootstrap concept is where framework commitments were always meant to go; the ownership rule explains *why* that concept is the one that stays abstract.

## What the policy does not excuse

Three things sit on our side of the line and are sometimes mistaken for the vendor's:

- _The system prompt._ `agent/main.py` is our code. The starter wrote five coordination rules there as prose to a model that might decline them; they are now [rules](../syncs/README.md), and what remains in the prompt is guidance about how to talk, not about what may happen.
- _The tool definitions._ `assert_value`, `withdraw`, `propose` and `review` in `agent/tools.py` are ours. That they are shaped by CopilotKit's conventions does not make their names, arguments or granularity the vendor's responsibility, and the granularity is the whole difference between a log that says what happened and one that says only that something did.
- _The gesture vocabulary._ `start`, `say`, `assert`, `withdraw`, `discard`, `choose`, `decline` and `focus` are the `act` values a person's gesture can carry. `Copiloting/gesture` accepts whatever arrives and decides nothing, so these are defined by the rules that react to them and nowhere else — [Gestures](../syncs/gestures.md#the-gesture-vocabulary-is-ours). The reasoning is the same as for the tool names one bullet up, applied to the other root actor.
- _The gate on the model's actions._ The model is a second root actor, and what it may do is [stated positively as rules](../syncs/conduct.md). No third-party boundary absolves that; it is the part of MSM §5.3 that had to be built rather than adopted.

## See also

- [Concept](concept.md) — the full specification format, for the tier that gets one
- [Objects](objects.md) — objects as implementation, which is the sanctioned use
- [Copiloting](../concepts/copiloting.md) — the abstract tier, in practice
- [The conceptual model](../conceptual-model.md#3-wysiwids-four-design-rules) — what follows for the architecture

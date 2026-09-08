# Code of conduct

The vocabulary for governing an actor that acts in your absence. MSM §5.3.

This is the note the rest of the method needs in order to say anything useful about the model. [The alignment analysis](../conceptual-model.md#5-two-root-actors-and-what-each-may-do) names the problem: this application has two root actors, and one of them decides for itself which tools to call. §5.3 is the answer's shape.

> An agent that has been granted authority over a user's files, email, calendar or experimental codebase acts in the user's absence. What it did, why it did so, and whether it had the right to do so must be answered from a record largely produced by the agent itself. Direct observation, which mediates most software use, is no longer available.

## What is wrong with prompts and traces

The two artifacts an agentic system normally offers are a prompt and a tool-call trace. MSM §5.3 rejects both as accounts of meaning:

> The prompt is discursive prose, written for a model to interpret; the trace is detailed but semantically thin. Neither carries the meaning of what the agent was doing in terms a stakeholder can recognize.

The questions it says neither can answer are worth quoting in full, because they are the questions this repository cannot answer either:

> Was a particular commit made in service of a hypothesis formed in advance, or rationalized after the fact? Did a metric improve for the predicted reason, or by coincidence? Was an email sent because the user endorsed it, or because the agent inferred a wish from indirect evidence? These are not questions about which tool was called. They are questions about meaning.

## The structure

A code of conduct is not a new mechanism. It is [concepts](concept.md) and [synchronizations](synchronization.md), applied to the agent's own activities:

> a structure that names the activities the agent performs, states the conditions under which they are permitted, and records observations in the same vocabulary in which those activities are described.

For an autonomous research agent, §5.3.1 names four concepts: `Hypothesizing` owns the forming of a hypothesis and the predictions it carries; `Editing` owns proposing, applying and committing changes; `Experimenting` owns planning and running experiments; `Evaluating` owns recording measurements, "with the discipline that recorded values come from execution rather than from the agent's own description of what it observed."

The permission is an ordinary synchronization:

```
sync CommitRequiresHypothesis
when  { Editing/apply: [ change: ?change ] => [] }
where { Hypothesizing: { ?hypothesis supports: ?change } }
then  { Editing/commit: [ change: ?change ] }
```

> The agent can apply a change to a working copy at any time to inspect its effect, but only commits it when the change is bound to a hypothesis. Without such a binding, the `apply` has no further effect.

## Permission is stated positively

This is the part that solves a problem the [DSL](synchronization.md) raises and cannot resolve on its own.

`when`/`where`/`then` invokes actions. It has no way to forbid one. So a prompt rule like *do not refine the diagram* has no synchronization form — the analysis records `DiagramsAreDrawnOnce` as inexpressible for exactly this reason.

The code-of-conduct framing dissolves it. You do not forbid the second draw; you decline to authorise it. An action reaches the log only by way of some synchronization ([the action log](implementation.md#the-action-log) invariant), so an action no rule invokes simply does not happen. A prohibition becomes the absence of a permission, and every rule can then be written in the positive form the DSL already has.

The starter this replaced had five such rules written as prose in a system prompt. Four were permissions in disguise. The fifth was only ever hard because it was phrased as a ban, and it dissolved the moment it was restated as one.

## Predictions, and what the trace becomes

A code of conduct is "a small document […] short enough to be read directly and precise enough that, for any action the agent takes, the clause that caused it can be identified."

Because the code and the trace share a vocabulary, they can be read together: "the trace reports what happened, the code states what would have made it legitimate, and the alignment or misalignment between the two becomes part of the record."

§5.3.1 singles out predictions as the discipline that gives this teeth. A hypothesis is admitted only if it carries a prediction; an outcome is admitted only if it compares the observation against the prediction it was meant to adjudicate. The consequence:

> A metric that improves while contradicting its predicted mechanism then appears in the trace not as a silent success but as an explicit disagreement between what was expected and what occurred.

## Four properties of a governed trace

§5.3.2 derives them all from one structural choice — "the trace consists of typed actions over typed facts rather than free-form prose interleaved with opaque tool calls."

_Attribution._ Any action can be pinned to the clause that authorised it, or seen immediately to lack one.

_Memory._ Long runs fail in ways loosely blamed on context capacity — an agent revisits a path, repeats a question, retries a fix. MSM offers a different diagnosis: "even when it remains in view, prose is hard to search by intent." A typed trace is queryable in the vocabulary it was produced in, so a resuming agent asks which hypotheses it formed and what tested them, "rather than reading its own narrative back and reconstructing the answers." Across runs the same property makes the trace durable memory.

_Replay as evaluation._ Given any prefix of a real run, a different model can be asked what it would do next under the same code. "Because actions are typed, the two candidate continuations are commensurate, and the comparison meaningful." MSM proposes this as evaluation without benchmarks constructed in advance.

_Multi-agent coordination._ Where AutoGen-style systems coordinate by exchanging messages, agents under a shared code are governed by one set of concepts and reactions with one trace. "An agent passing a hypothesis to another for testing does so through an action in `Hypothesizing` whose effect, by synchronization, is an action in `Experimenting`. The handoff is part of the structure, not an artifact of how the agents happen to communicate."

## Evidence

§5.3.3 reports three autonomous research loops: a language-model training agent, a numerical-simulation optimizer, and a multi-agent semiconductor TCAD campaign. All three produced real results, which is the claim worth recording:

> One might worry that a code of conduct trades results for legibility […] We did not find this. Legibility came alongside the results, not at their expense.

The TCAD case carries the more useful methodological point. When the work branched across agents instead of proceeding serially, "the same discipline applied once the concepts were adjusted" — new actions for branching, auditing and recording findings replaced the serial vocabulary. "When the shape of the work changed, the underlying machinery did not; only the concepts did."

MSM notes that runtime enforcement mechanisms are described in a separate submission not yet public (§5.3 footnote 12). The enforcement story is therefore the one part of this section with no published detail behind it.

## In this repository

There is a code of conduct, and it is [`../syncs/conduct.md`](../syncs/conduct.md).

The MSM §5.3.1 concepts do not transfer — this agent forms no hypotheses and
runs no experiments. The shape does. Its activities are stating a requirement,
preferring an option, withdrawing one, and proposing a completion; each is a
tool that only records that the model asked; and what follows from each is a
rule that says it may.

The enforcement is entirely in what is absent. No rule carries a
`Copiloting/invoke` to `Deciding/choose`, so the model cannot adopt the
completion it computed. None carries one to `Pricing` or `Cataloguing`, so it
can read a price and not set one, and cannot list or delist an option. Nothing
tells it not to. An action reaches the log only by way of some synchronization,
so an action no rule invokes does not happen — which is this section's move,
[permission stated positively](#permission-is-stated-positively), doing the work
a paragraph of English used to be asked to do.

The practical difference is that the list is checkable. *Can the assistant
change a price?* is answered by reading the `then` clauses of one file, not by
reasoning about what a language model is likely to infer.

Two properties of §5.3.2 follow immediately and one does not.

_Attribution._ Every action can be pinned to the rule that authorised it, or
seen to be a root action. The canvas prints it.

_Memory._ The trace is typed and queryable in the vocabulary it was produced in,
so `agent/views.py` asks it *which rule last recorded a requirement for this
variable* and gets an answer without reading any prose back.

_Replay as evaluation_ is available in principle — the log is complete and the
concepts are deterministic — and nothing here uses it. Recorded as unclaimed
rather than as done.

## See also

- [Synchronization](synchronization.md) — the form a permission takes
- [From meaning to code](implementation.md#the-action-log) — the log the trace is
- [Copiloting](../concepts/copiloting.md) — the second root actor, unmodelled
- [Misalignment](misalignment.md) — the other half of MSM's applications

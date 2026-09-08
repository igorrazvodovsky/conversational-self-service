# Copiloting

The bootstrap [concept](../method/concept.md) of this application, and the one concept in this model held at the abstract tier — purpose and assumed contract, no specification. See [Two tiers of concept](../method/boundaries.md) for why.

```
concept Copiloting

purpose
  to carry stimuli between a person, an application surface and a
  model, so that each can act on what the others did
```

> There need to be root actions that correspond to external stimuli. These actions are treated as the actions of a special bootstrap concept. […] These actions can always be identified easily in the set of synchronizations, since they are the only ones that have completions but no invocations.
>
> — WYSIWID §6.7

## Not specified here

Deliberately absent, and not to be filled in later: state as relations, action signatures, and an operational principle. This concept names machinery we do not own — the CopilotKit runtime, the chat and threads UI, frontend tools, generative UI, A2UI surfaces, the MCP client, and the LangGraph state channel. A specification would be an assertion about somebody else's implementation.

Rules *do* name its two root actions, and must: WYSIWID §6.7 requires it, since a flow has to root somewhere and root actions are what it roots in. What no rule does is reach past them into the machinery behind. `Copiloting/gesture` and `Copiloting/invoke` are the whole of the surface a rule may see, and `agent/engine/bootstrap.py` — which implements them in nine lines that record a stimulus and decide nothing — is the boundary made literal rather than a specification of the vendor's code.

## What we rely on it for

The assumed contract. Every CopilotKit mechanism in the repository is one of six
stimulus kinds, which is the level at which the rest of the model refers to
them:

| Kind | Direction | Mechanism |
|---|---|---|
| a person submits a message | in | `CopilotChat` (`src/app/page.tsx`) |
| a person acts on an application surface | in | the canvas (`src/components/configurator/`), reaching `POST /configurator/gesture` |
| a person acts on a rendered surface | in | `useHumanInTheLoop` (`src/hooks/use-generative-ui-examples.tsx`), A2UI events |
| the model calls a named tool | in | `agent/tools.py`, the MCP client (`src/app/api/copilotkit/[[...slug]]/route.ts`) |
| the model returns prose | out | `CopilotChat` |
| the model asks that a surface be shown | out | `useComponent`, `useDefaultRenderTool`, A2UI (`agent/src/a2ui_fixed_schema.py`) |
| the viewer's environment changes | in | `prefers-color-scheme` (`src/hooks/use-theme.tsx`) |

Collapsing nine mechanisms into seven stimulus kinds is the point of the
bootstrap. Modelled separately they would be nine concepts, none reusable and
none nameable to a user.

The last row is the one that does not fit the framing above, and saying so is
more useful than hiding it. `prefers-color-scheme` is not CopilotKit machinery
and nothing in this concept's contract with the vendor covers it — but a
bootstrap concept exists to hold *external stimuli*, and the operating system
changing its colour scheme is one. [Theming](theming.md) needs that stimulus to
have a root action; it does not have one yet, and reaches the application
through a React effect instead. The two-tier policy scoped this note to
third-party machinery, and the bootstrap's job turns out to be wider than the
vendor boundary that named it.

## The state channel carries a projection, and nothing else

This is the part of the contract that shaped the architecture, so it is worth
stating precisely.

`AbstractAgent` (`@ag-ui/client`) offers the frontend exactly three ways to
write: `addMessage` / `setMessages`, `setState`, and `runAgent` /
`connectAgent`. There is no method for invoking a named agent-side action.

The starter's canvas therefore wrote through `setState` — a setter on a shared
blob, called by both actors with the same payload shape, which is why no log of
it could say what had happened. There was never a version of this in which the
method's action layer lived inside the SDK, so the question was never how to
reconcile two orientations but where to put the concepts.

They went behind an endpoint we own, invoked as actions by both the UI and the
model. That is WYSIWID §6.4's read/write split, which the paper prescribes for
its own reasons: "Reads and writes are strictly separated: reads are handled by
client-driven querying capabilities […] and writes are handled directly by the
action API."

Two consequences accepted honestly. The model's view of the specification is a
projection that lags the log — `review` (`agent/tools.py`) reads a projection
rather than the state, and the system prompt says so. And the canvas polls
while the model is working, because a change made through the action API is
invisible to the state channel by construction.

## Two deliberate exclusions

_Conversation gets no domain concept._ Submitted messages and returned prose are stimuli here because this application does nothing with a conversation beyond carrying it — it records no facts about messages and has no action over them. An application that threaded, searched or summarised its own conversations would need a `Conversing` concept it owned and specified; this one lacks the behavior to justify one.

_Suggestion pills are not a concept._ `useConfigureSuggestions` (`src/hooks/use-example-suggestions.tsx`) submits a message when clicked, so it is an affordance on an existing stimulus.

## Two root actors

WYSIWID's `Web` concept has one source of external stimuli: the HTTP client.
This application has two that are genuinely independent — the person, and the
model deciding for itself which tools to call.

So there are two root actions rather than one, and the asymmetry between them is
deliberate. `gesture` and `invoke` do the same nothing; what differs is the
rules that react to them, in [Gestures](../syncs/gestures.md) and
[Conduct](../syncs/conduct.md). A person may adopt a proposed completion. The
model may not, and no rule says so — no rule carries `Copiloting/invoke` to
`Deciding/choose`, and that absence is the whole of the enforcement.

MSM §5.3 addresses agents as subjects governed by a code of conduct rather than
as a second bootstrap, and §5.3.1's form is what closes the gap:

```
when:  Editing.apply (change)
where: Hypothesizing.form (hypothesis, supports: change)
then:  Editing.commit (change)
```

The starter had five attempts at exactly that, written as prose in a system
prompt to a model that might decline them. They are now rules, and the one that
survived the change of domain unaltered — the canvas must be visible before the
assistant changes it — is [`TheCanvasIsShownBeforeItChanges`](../syncs/conduct.md).

## See also

- [Two tiers of concept](../method/boundaries.md) — why this note stops where it does
- [Synchronization](../method/synchronization.md) — flows root in this concept's stimuli
- [Conduct](../syncs/conduct.md) and [Gestures](../syncs/gestures.md) — what each root actor may do
- [The conceptual model](../conceptual-model.md#5-two-root-actors-and-what-each-may-do) — the alignment analysis

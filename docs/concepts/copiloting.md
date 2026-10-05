# Copiloting

```
concept Copiloting

purpose
  to carry what happens outside the application into it, whether a
  person acts, a model calls a tool or the application starts, so
  that the rules can act on it
```

The bootstrap concept, held at the abstract tier: a purpose and the assumed
contract, no state, no action signatures, no operational principle. The
policy is [Two tiers of concept](../method/boundaries.md).

## What we rely on it for

| Kind | Direction | Mechanism |
|---|---|---|
| a person submits a message | in | `CopilotChat` (`src/app/page.tsx`) |
| a person acts on an application surface | in | the canvas (`src/components/configurator/`), reaching `POST /configurator/gesture` |
| a person acts on a rendered surface | in | `useHumanInTheLoop` (`src/hooks/use-generative-ui-examples.tsx`), A2UI events |
| the model calls a named tool | in | `agent/tools.py`, the MCP client (`src/app/api/copilotkit/[[...slug]]/route.ts`) |
| the person's own agent acts for them | in | `useFrontendTool` with `webmcp` (`src/components/configurator/webmcp.tsx`), reaching `POST /configurator/gesture`, and `POST /configurator/invoke` for `review`, `propose` and `read` |
| the person's own agent speaks to the model | in | `converse` (`src/components/chat/converse.tsx`), a `say` gesture under `browser`, then the chat's run on a message whose id is that gesture's flow |
| the model returns prose | out | `CopilotChat`, and to the person's own agent the reply `converse` and `listen` return |
| the model asks the person, and its run waits | out | a LangGraph interrupt from `ask` (`agent/tools.py`), received as an AG-UI interrupt by `useInterrupt` (`src/components/chat/question.tsx`) |
| the waiting run is resumed | in | `useInterrupt`'s `resolve`, once the view shows the question no longer waits |
| the model asks that a surface be shown | out | `useComponent`, `useDefaultRenderTool`, A2UI (`agent/src/a2ui_fixed_schema.py`) |
| the viewer's environment changes | in | `prefers-color-scheme` (`src/hooks/use-theme.tsx`) |
| the application starts, with its catalogue | in | `agent/wiring.py`, performing `boot` |

Its root actions, `gesture`, `invoke` and `boot`, record a stimulus and
decide nothing; what follows from each is in [Gestures](../syncs/gestures.md),
[Conduct](../syncs/conduct.md) and [Seeding](../syncs/seeding.md). `gesture` is performed by the person and by
their own agent alike, and the actor on the record is what tells them apart
— see [The person's own agent, acting as the person](../syncs/conduct.md#the-persons-own-agent-acting-as-the-person).

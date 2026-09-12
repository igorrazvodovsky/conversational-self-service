# Copiloting

```
concept Copiloting

purpose
  to carry stimuli between a person, an application surface and a
  model, so that each can act on what the others did
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
| the model returns prose | out | `CopilotChat` |
| the model asks that a surface be shown | out | `useComponent`, `useDefaultRenderTool`, A2UI (`agent/src/a2ui_fixed_schema.py`) |
| the viewer's environment changes | in | `prefers-color-scheme` (`src/hooks/use-theme.tsx`) |

Its two root actions, `gesture` and `invoke`, record a stimulus and decide
nothing; what follows from each is in [Gestures](../syncs/gestures.md) and
[Conduct](../syncs/conduct.md).

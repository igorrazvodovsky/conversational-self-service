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
| a browser agent calls a named tool | in | `useFrontendTool` with `webmcp` (`src/components/configurator/webmcp.tsx`), reaching `POST /configurator/invoke` |
| the model returns prose | out | `CopilotChat` |
| the model asks that a surface be shown | out | `useComponent`, `useDefaultRenderTool`, A2UI (`agent/src/a2ui_fixed_schema.py`) |
| the viewer's environment changes | in | `prefers-color-scheme` (`src/hooks/use-theme.tsx`) |
| the application starts, with its catalogue | in | `agent/wiring.py`, performing `boot` |

Its root actions, `gesture`, `invoke` and `boot`, record a stimulus and
decide nothing; what follows from each is in [Gestures](../syncs/gestures.md),
[Conduct](../syncs/conduct.md) and [Seeding](../syncs/seeding.md). `invoke` is performed by the in-app model
and by a browser agent alike, and the actor on the record is what tells
them apart — see [A browser agent, on the same terms](../syncs/conduct.md#a-browser-agent-on-the-same-terms).

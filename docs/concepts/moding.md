# Moding

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Moding [Workspace, Surface]

purpose
  to give one of several surfaces a viewer's attention

state
  available: Workspace -> set Surface
  active:    Workspace -> Surface

actions
  offer [ workspace: Workspace ; surface: Surface ]
    => [ workspace: Workspace ]
    add the surface to those available in the workspace

  focus [ workspace: Workspace ; surface: Surface ]
    => [ workspace: Workspace ]
    make the surface the active one

  focus [ workspace: Workspace ; surface: Surface ]
    => [ error: string ]
    if the surface is not available in the workspace
    return the error description

operational principle
  after offer [ workspace: w ; surface: canvas ] => [ workspace: w ]
  then focus [ workspace: w ; surface: canvas ] => [ workspace: w ]
  and active of w is canvas
```

## Why this thin concept earns its place

There is a real rule attached to it. The starter wrote it as English in a
system prompt:

```
- Todos: enable app mode first, then manage todos.
```

That is ordinary application logic — the canvas must be visible before the
agent changes it, or the person watches nothing happen — enforced by asking a
language model nicely. The configurator has the same rule about the same
canvas, and writes it as four deterministic lines:

```
sync TheCanvasIsShownBeforeItChanges
when { Copiloting/invoke: [ tool: "require" ] => [] }
then { Moding/focus: [ surface: canvas ] }
```

A concept with one action and two state relations is worth naming exactly when
something else needs to refer to it. This is that case, twice over since
2026-09-11: the offer is a second surface beside the canvas, and
[`AnIssuedQuoteIsShown`](../syncs/propagation.md#an-issued-quote-is-shown)
gives it the viewer's attention when a quote is issued, whichever party asked.

## What is not a surface

The chat was a `Moding` surface until 2026-09-11, when the layout adopted the
sibling prototype's chat geometry (`conv-pro-conf`, its *chat surface* spec):
the conversation sits beside the artifact panel, floats over it, takes the
whole surface, or is put away, and the person switches between those from one
control. That geometry is not a surface here, for two reasons.

First, it is not shared state. `Moding` gives one of several *artifacts* a
viewer's attention, and a rule may move it — a tool call brings the canvas
forward, an issued quote brings the offer. How wide the transcript is drawn is
the person's alone: no rule, tool call or card click reaches it, it is not
remembered across a reload, and the app never opens anyone in a transcript.
Keeping it in the concept would have let `TheCanvasIsShownBeforeItChanges`
decide the width of somebody's chat, which is not what the rule is about.

Second, the two were conflated. With `chat` a surface, *focus the canvas*
meant both *put the specification on the panel* and *shrink the conversation
to half*, and the toggle that offered `chat` was really a fourth geometry
under another name. Pulled apart, `Moding` holds `canvas` and `quote`, the
canvas is always mounted, and the chat's position is view state in
`src/components/example-layout/chat-surface.tsx`.

What this costs: the rule now guarantees that the canvas is the artifact on
the panel, not that the panel is in view. A person who has given the chat the
whole surface and then asks the assistant for a hospital lift sees the change
when they come back. The sibling prototype takes the same position and states
it as a principle — user-invoked, one click back, never the app's choice.

Note what changed and what did not. The concept is untouched by the move from a
todo list to a configurator, and so is the rule's shape; only the tool named in
the `when` is different. That is the reusability the method claims for
concepts, observed rather than asserted.

## See also

- [Theming](theming.md) — the same underlying shape; a candidate unification is noted there
- [Conduct](../syncs/conduct.md) — where the rule above lives
- [Synchronization](../method/synchronization.md) — why it belongs there and not in a prompt

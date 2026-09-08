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
something else needs to refer to it. This is that case.

Note what changed and what did not. The concept is untouched by the move from a
todo list to a configurator, and so is the rule's shape; only the tool named in
the `when` is different. That is the reusability the method claims for
concepts, observed rather than asserted.

## See also

- [Theming](theming.md) — the same underlying shape; a candidate unification is noted there
- [Conduct](../syncs/conduct.md) — where the rule above lives
- [Synchronization](../method/synchronization.md) — why it belongs there and not in a prompt

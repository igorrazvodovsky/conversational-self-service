# Moding

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
  and offer [ workspace: w ; surface: quote ] => [ workspace: w ]
  then focus [ workspace: w ; surface: canvas ] => [ workspace: w ]
  and active of w is canvas
  and after focus [ workspace: w ; surface: quote ] => [ workspace: w ]
  then active of w is quote, and canvas is still available
  and focus [ workspace: w ; surface: chat ] => [ error: e ]
```

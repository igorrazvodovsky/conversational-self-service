# Framing

```
concept Framing [Lens, Frame]

purpose
  to let a viewer narrow what is shown to the items that bear on one
  question, and keep the choice

state
  framed: Lens -> Frame

actions
  frame [ lens: Lens ; frame: Frame ]
    => [ lens: Lens ; frame: Frame ]
    make the frame the lens's, replacing any it had

  unframe [ lens: Lens ]
    => [ lens: Lens ]
    remove the lens's frame, if it has one

operational principle
  after frame [ lens: w ; frame: [ by: "assertion" ; variable: building_type ] ]
    => [ lens: w ; frame: f ]
  then framed of w is f
  and after unframe [ lens: w ] => [ lens: w ]
  then w has no frame
```

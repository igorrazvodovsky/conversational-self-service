# Theming

```
concept Theming [Surface]

purpose
  to let a viewer control the appearance of a surface, or defer
  that control to their environment

state
  preference:  Surface -> ("dark" | "light" | "system")
  environment: Surface -> ("dark" | "light")

actions
  prefer [ surface: Surface ; preference: string ]
    => [ surface: Surface ]
    record the preference

  prefer [ surface: Surface ; preference: string ]
    => [ error: string ]
    if the preference is not one of "dark", "light" or "system"
    return the error description

  defer [ surface: Surface ]
    => [ surface: Surface ]
    set the preference to "system"

  resolve [ surface: Surface ; environment: ("dark" | "light") ]
    => [ surface: Surface ]
    record what the viewer's environment is currently asking for

operational principle
  after defer [ surface: s ] => [ surface: s ]
  and resolve [ surface: s ; environment: "dark" ] => [ surface: s ]
  then the effective appearance of s is "dark"
  and after prefer [ surface: s ; preference: "light" ] => [ surface: s ]
  then resolve [ surface: s ; environment: "dark" ] => [ surface: s ]
  and the effective appearance of s is still "light"
```

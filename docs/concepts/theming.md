# Theming

A domain [concept](../method/concept.md) of the elevator configurator.

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

## The effective appearance is a read

```
effective(s)  =  preference(s), when it is "dark" or "light"
                 environment(s), when the preference is "system"
```

It is not state. Held as state, set as a side effect of `prefer` and
`resolve`, it would be a memo of the last resolution with nothing in the state
saying whether it was still current — and `resolve` would be an action whose
whole effect was to compute something. Holding the environment as a fact instead, and reading the
two together, is the same move
[Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic) makes for
the total: nobody performs *work out which theme applies*.

## In the code

`ThemeProvider` (`src/hooks/use-theme.tsx:15-40`) holds the preference and performs `resolve` in an effect: when the preference is `system` it reads `prefers-color-scheme` and re-reads it on change (`:22-31`), otherwise it applies the preference directly (`:33`).

The agent-facing action is `toggleTheme` (`src/hooks/use-generative-ui-examples.tsx:73-79`).

## Two findings

_The action reads the wrong fact._ `toggleTheme` decides what to flip to by reading `document.documentElement.classList` (`:77`) rather than `theme`. It is therefore contingent on a fact — `preference(s, "system")` — that it never consults, consulting a derived DOM fact instead. The action's meaning ("toggle the theme") and the state it acts on have come apart.

_The environment has no root action._ `resolve` is performed by the operating system changing its colour scheme, which is an external stimulus, and WYSIWID §6.7 requires those to be root actions of the bootstrap concept. It reaches the application as a `matchMedia` listener inside a React effect (`:22-31`) — a second initiator, in exactly the sense [Gestures](../syncs/gestures.md#why-a-click-is-not-an-endpoint) rejects for clicks. [Copiloting](copiloting.md#what-we-rely-on-it-for) lists it as a stimulus kind; nothing routes it that way yet.

_`defer` is missing._ Invoking `toggleTheme` while the preference is `system` discards the deference to the environment permanently. Nothing restores it: `setTheme` has exactly one caller in the codebase, and it passes only `"light"` or `"dark"` (`:78`). The provider supports `"system"` (`use-theme.tsx:5,16`) and no surface, agent-facing or human-facing, can return to it.

That is a missing action rather than a bug in an existing one, and the distinction is the point of writing the concept down. The operational principle above states the property the code violates; nothing in the code states it at all.

## A candidate refactor, not taken

`Theming` and [Moding](moding.md) are both instances of a more general shape — a viewer selects among named alternatives for a surface — and could be unified into a single `Preferring [Setting, Value]`. Noted here rather than done, since this pass is reverse-engineering rather than redesign.

## See also

- [Moding](moding.md) — the same shape, applied to layout
- [Action](../method/action.md) — on actions contingent on facts they do not read

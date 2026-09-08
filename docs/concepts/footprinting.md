# Footprinting

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Footprinting [Option, Grid, Basis]

purpose
  to estimate the carbon a specification will emit over its service life

state
  embodied:  Option -> Mass
  demand:    Option -> Option -> Option -> Energy
  intensity: Grid -> Mass
  horizon:   Basis -> Natural
  uplift:    Basis -> Real
  scope:     Basis -> string

actions
  attribute [ option: Option ; embodied: Mass ]
    => [ option: Option ]
    record the carbon attributable to making and installing the option

  meter [ class: Option ; usage: Option ; travel: Option ; energy: Energy ]
    => []
    record the energy a lift of that class, worked that hard,
    over that travel, draws in a year

  rate [ grid: Grid ; intensity: Mass ]
    => [ grid: Grid ]
    record the carbon released per unit of energy drawn from the grid

  frame [ basis: Basis ; horizon: Natural ; uplift: Real ; scope: string ]
    => [ basis: Basis ]
    record how many years this basis assumes,
    what multiple it applies to embodied figures,
    and the sentence saying what an estimate on it covers and omits

operational principle
  after attribute [ option: mid_15_30 ; embodied: 2600 ] => [ option: mid_15_30 ]
  and meter [ class: b ; usage: medium ; travel: mid_15_30 ; energy: 3154 ] => []
  and rate [ grid: today ; intensity: 0.22 ] => [ grid: today ]
  and frame [ basis: en15804 ; horizon: 25 ; uplift: 1.9 ;
              scope: "embodied ≈ EN 15804 A1–A3 …" ] => [ basis: en15804 ]
  then demand of (b, medium, mid_15_30) is 3154
  and after rate [ grid: today ; intensity: 0.11 ] => [ grid: today ]
  then intensity of today is 0.11 and demand is unchanged
  and after frame [ basis: forty_year ; horizon: 40 ; uplift: 1.9 ; scope: "…" ]
    => [ basis: forty_year ]
  then horizon of en15804 is still 25
```

## The footprint is a read, and here is the arithmetic

Same rule as [Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic),
same reason: nobody performs *compute the footprint*. For a set of chosen
options `C` containing an energy class `k`, a usage profile `u` and a travel
band `v`, against a grid `g` and on a basis `b`:

```
made      =  uplift(b) × Σ embodied(o)  for o in C
annual    =  demand(k, u, v)
run       =  annual × intensity(g) × horizon(b)
footprint =  made + run
```

`made` and `run` are reported separately as well as summed, because the
decisions that move them are different decisions and a single number hides
that. On a mid-rise office the two halves come out within about a third of each
other, so neither can be waved away — a regenerative drive cuts `run` and adds
to `made`, and whether that trades well depends entirely on `intensity`.

## Why the grid is a type parameter

Which is why `Grid` is a type parameter rather than a constant. The catalogue
carries two intensities — `0.22` for the grid as it is and `0.11` for a
decarbonising one — and the same specification reverses its ranking between
them. A concept that hard-coded one would present a contested estimate as a
fact.

`scope` holds the disclaimer as state rather than as a comment in the UI,
because it is a property of the estimate and travels with it: installation,
maintenance and end-of-life are not modelled, and every figure is an
illustrative model rather than a verified assessment.

`horizon`, `uplift` and `scope` are facts about a `Basis` for the same reason.
A service life of twenty-five years moves the balance between `made` and `run`
at least as much as the grid intensity does — quote forty and the operational
half grows by more than half again — so a concept that held one horizon would
be doing precisely what the paragraph above refuses to do with the grid. The
[same argument, and the same repair, applies to Pricing](pricing.md#why-the-reckoning-is-a-basis-and-not-a-constant).

## Why `demand` is a three-place relation

`demand: Option -> Option -> Option -> Energy` is the shape the data has, and
the shape the physics has: annual energy is not separable into a per-class
factor times a per-usage factor times a per-travel factor. A lift worked hard
over a short travel and one worked lightly over a tall one do not scale from
the same base.

The alternative — three relations and a product — would be smaller to write and
would assert an independence that is not there. MSM §5.2's selection principle
is that "the pattern that most succinctly captures the phenomena is preferred",
and the phenomenon here is a table.

## See also

- [Pricing](pricing.md) — the other reading of the same choices
- [Cataloguing](cataloguing.md#the-record-in-elevatorjson-is-three-concepts-facts-in-one-object) — where the embodied figures come from
- [Fact](../method/fact.md) — on relations of more than two places

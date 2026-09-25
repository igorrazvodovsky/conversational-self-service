# Footprinting

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

queries
  footprint [ chosen: set Option ; grid: Grid ; basis: Basis ]
    => [ made: Mass ; annual: Energy ; run: Mass ; total: Mass ;
         complete: boolean ]
    made is the basis's uplift times the sum of embodied
    over the chosen options
    annual is the demand of the class, usage and travel among the chosen
    run is annual times the grid's intensity times the basis's horizon
    total is made plus run
    complete when a demand is recorded for the chosen three

operational principle
  after attribute [ option: mid_15_30 ; embodied: 2600 ] => [ option: mid_15_30 ]
  and meter [ class: b ; usage: medium ; travel: mid_15_30 ; energy: 3154 ] => []
  and rate [ grid: today ; intensity: 0.22 ] => [ grid: today ]
  and frame [ basis: en15804 ; horizon: 25 ; uplift: 1.9 ;
              scope: "embodied ≈ EN 15804 A1–A3 …" ] => [ basis: en15804 ]
  then footprint [ chosen: {b, medium, mid_15_30} ; grid: today ; basis: en15804 ]
    => [ made: 1.9 × 2600 ; run: 3154 × 0.22 × 25 ; complete: true ]
  and after rate [ grid: today ; intensity: 0.11 ] => [ grid: today ]
  then footprint [ chosen: {b, medium, mid_15_30} ; grid: today ; basis: en15804 ]
    => [ made: 1.9 × 2600 ; run: 3154 × 0.11 × 25 ]
  and after frame [ basis: forty_year ; horizon: 40 ; uplift: 1.9 ; scope: "…" ]
    => [ basis: forty_year ]
  then horizon of en15804 is still 25
```

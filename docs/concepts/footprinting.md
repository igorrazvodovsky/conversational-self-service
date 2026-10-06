# Footprinting

```
concept Footprinting [Option, Grid, Basis]

purpose
  to estimate the carbon a specification will emit over its service life

state
  embodied:  Option -> Mass
  installed: Option -> Mass
  upkeep:    Option -> Mass
  ended:     Option -> Mass
  demand:    Option -> Option -> Option -> Energy
  intensity: Grid -> Mass
  horizon:   Basis -> Natural
  uplift:    Basis -> Real
  scope:     Basis -> string

actions
  attribute [ option: Option ; embodied: Mass ]
    => [ option: Option ]
    record the carbon attributable to making the option

  attribute [ option: Option ; installed: Mass ]
    => [ option: Option ]
    record the carbon attributable to bringing the option to site
    and installing it

  attribute [ option: Option ; ended: Mass ]
    => [ option: Option ]
    record the carbon attributable to taking the option out of service
    at the end of its life: dismantling, transport, processing and disposal

  recur [ option: Option ; upkeep: Mass ]
    => [ option: Option ]
    record the carbon the option adds to every year of service,
    from the visits, repairs and replaced parts that keep the lift running

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
    what multiple it applies to the carbon of making,
    and the sentence saying what an estimate on it covers and omits

queries
  footprint [ chosen: set Option ; grid: Grid ; basis: Basis ]
    => [ made: Mass ; installed: Mass ; maintained: Mass ; annual: Energy ;
         run: Mass ; ended: Mass ; total: Mass ; complete: boolean ]
    made is the basis's uplift times the sum of embodied
    over the chosen options; the uplift applies to nothing else
    installed is the sum of installed over the chosen options
    maintained is the sum of upkeep over the chosen options
    times the basis's horizon, the years of service and not the
    years of any contract
    annual is the demand of the class, usage and travel among the chosen
    run is annual times the grid's intensity times the basis's horizon
    ended is the sum of ended over the chosen options
    total is made plus installed plus maintained plus run plus ended
    complete when a demand is recorded for the chosen three;
    an option with no figure for a stage adds nothing to it

operational principle
  after attribute [ option: mid_15_30 ; embodied: 2600 ] => [ option: mid_15_30 ]
  and attribute [ option: mid_15_30 ; installed: 300 ] => [ option: mid_15_30 ]
  and attribute [ option: mid_15_30 ; ended: 220 ] => [ option: mid_15_30 ]
  and recur [ option: standard ; upkeep: 120 ] => [ option: standard ]
  and meter [ class: b ; usage: medium ; travel: mid_15_30 ; energy: 3154 ] => []
  and rate [ grid: today ; intensity: 0.22 ] => [ grid: today ]
  and frame [ basis: en15978 ; horizon: 25 ; uplift: 1.9 ;
              scope: "making ≈ EN 15804 A1–A3 …" ] => [ basis: en15978 ]
  then footprint [ chosen: {b, medium, mid_15_30, standard} ; grid: today ;
                   basis: en15978 ]
    => [ made: 1.9 × 2600 ; installed: 300 ; maintained: 120 × 25 ;
         run: 3154 × 0.22 × 25 ; ended: 220 ; complete: true ]
  and after rate [ grid: today ; intensity: 0.11 ] => [ grid: today ]
  then footprint [ chosen: {b, medium, mid_15_30, standard} ; grid: today ;
                   basis: en15978 ]
    => [ made: 1.9 × 2600 ; maintained: 120 × 25 ; run: 3154 × 0.11 × 25 ]
  and after frame [ basis: forty_year ; horizon: 40 ; uplift: 1.9 ; scope: "…" ]
    => [ basis: forty_year ]
  then footprint [ chosen: {standard} ; grid: today ; basis: forty_year ]
    => [ maintained: 120 × 40 ; complete: false ]
  and horizon of en15978 is still 25
```

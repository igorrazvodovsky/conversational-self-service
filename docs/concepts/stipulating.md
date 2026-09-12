# Stipulating

```
concept Stipulating [Basis, Variable]

purpose
  to hold the conditions on which an offer is made, so that every
  quote is made on stated terms

state
  validity:     Basis -> Natural            — days an offer stands
  warranty:     Basis -> Natural            — months from acceptance
  approval:     Basis -> Natural            — weeks to layout drawings
  installation: Basis -> Natural            — weeks on site
  byOthers:     Basis -> set Variable
  stages:       Basis -> seq Stage
  upon:         Stage -> string
  share:        Stage -> Real
  clauses:      Basis -> seq Clause
  section:      Clause -> string
  text:         Clause -> string

actions
  stipulate [ basis: Basis ; validity: Natural ; warranty: Natural ;
              approval: Natural ; installation: Natural ]
    => [ basis: Basis ]
    record the periods on which this basis offers

  stage [ basis: Basis ; upon: string ; share: Real ]
    => [ stage: Stage ]
    append a payment stage: the event on which a share of the
    price falls due

  clause [ basis: Basis ; section: string ; text: string ]
    => [ clause: Clause ]
    append a clause to the basis, under a section

  delegate [ basis: Basis ; variable: Variable ]
    => [ basis: Basis ]
    record that what is settled for the variable is a requirement
    on the site, to be provided by others, and not an item supplied

operational principle
  after stipulate [ basis: b ; validity: 30 ; warranty: 12 ; approval: 4 ; installation: 6 ]
    => [ basis: b ]
  and stage [ basis: b ; upon: "order" ; share: 0.3 ] => [ stage: s1 ]
  and stage [ basis: b ; upon: "readiness for dispatch" ; share: 0.5 ] => [ stage: s2 ]
  and clause [ basis: b ; section: "excluded" ; text: "VAT" ] => [ clause: c ]
  and delegate [ basis: b ; variable: shaft ] => [ basis: b ]
  then validity of b is 30
  and stages of b is s1 then s2
  and shaft is in byOthers of b
```

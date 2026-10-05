# Stipulating

```
concept Stipulating [Basis, Variable, Option]

purpose
  to hold the conditions on which an offer is made, so that every
  quote is made on stated terms

state
  validity:     Basis -> Natural            — days an offer stands
  warranty:     Basis -> Natural            — months from acceptance
  approval:     Basis -> Natural            — weeks to layout drawings
  installation: Basis -> Natural            — weeks on site
  handover:     Basis -> Option -> Natural  — weeks from order to handover
  byOthers:     Basis -> set Variable
  stages:       Basis -> seq Stage
  upon:         Stage -> string
  event:        Stage -> Event
  share:        Stage -> Real
  clauses:      Basis -> seq Clause
  section:      Clause -> string
  text:         Clause -> string

  Event is one of
    order        — the quote accepted
    approval     — the layout drawings issued for approval
    dispatch     — the equipment ready to leave for site
    completion   — installation finished
    acceptance   — the final examination passed, and the lift handed over

actions
  stipulate [ basis: Basis ; validity: Natural ; warranty: Natural ;
              approval: Natural ; installation: Natural ]
    => [ basis: Basis ]
    record the periods on which this basis offers

  promise [ basis: Basis ; option: Option ; weeks: Natural ]
    => [ basis: Basis ]
    record that, on this basis, choosing the option promises
    handover the given number of weeks after order

  stage [ basis: Basis ; upon: string ; event: Event ; share: Real ]
    => [ stage: Stage ]
    append a payment stage: the event on which a share of the
    price falls due, in the seller's words and as a milestone

  clause [ basis: Basis ; section: string ; text: string ]
    => [ clause: Clause ]
    append a clause to the basis, under a section

  delegate [ basis: Basis ; variable: Variable ]
    => [ basis: Basis ]
    record that what is settled for the variable is a requirement
    on the site, to be provided by others, and not an item supplied

queries
  programme [ basis: Basis ; chosen: set Option ; term: Natural ]
    => [ milestones: seq [ event: Event ; week: Natural ] ;
         warranty: Natural ; maintenance: Natural ]
    the handover week is that of a chosen option the basis promises
    order falls in week 0 and approval in the approval week
    dispatch falls the installation period before handover,
      and not before order
    completion and acceptance fall in the handover week
    warranty runs its months from acceptance
    maintenance runs the term's months from the end of warranty
    no milestone after order when no chosen option is promised

operational principle
  after stipulate [ basis: b ; validity: 30 ; warranty: 12 ; approval: 4 ; installation: 6 ]
    => [ basis: b ]
  and promise [ basis: b ; option: standard ; weeks: 16 ] => [ basis: b ]
  and stage [ basis: b ; upon: "order" ; event: order ; share: 0.3 ] => [ stage: s1 ]
  and stage [ basis: b ; upon: "readiness for dispatch" ; event: dispatch ; share: 0.5 ]
    => [ stage: s2 ]
  and clause [ basis: b ; section: "excluded" ; text: "VAT" ] => [ clause: c ]
  and delegate [ basis: b ; variable: shaft ] => [ basis: b ]
  then validity of b is 30
  and stages of b is s1 then s2
  and shaft is in byOthers of b
  and programme [ basis: b ; chosen: {standard} ; term: 120 ]
    => [ milestones: order 0, approval 4, dispatch 10, completion 16,
                     acceptance 16 ;
         warranty: 12 ; maintenance: 120 ]
```

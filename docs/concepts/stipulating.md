# Stipulating

A domain [concept](../method/concept.md) of the elevator configurator. It
exists because a quote is a proposal, and a real proposal is half
conditions.

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

## Why the basis is the one Pricing prices on

`Basis` is the type parameter [Pricing](pricing.md#why-the-reckoning-is-a-basis-and-not-a-constant)
introduced for *the terms on which somebody is being quoted*. A financing
factor and a presumed term are two such terms; a payment schedule,
a warranty and a list of exclusions are more of the same kind, and they are
kept apart from Pricing for the reason its note gives for keeping carbon
apart: they do not compute the same way. A price is arithmetic over the
chosen options. A condition is a sentence. The rule that issues a quote reads
both concepts on the same basis, and neither knows the other exists.

## Why `byOthers` names variables

A real proposal's longest section is the work the seller does not do. Much of
it is standard text, and that is a clause. But the requirements that matter
most are numbers the configuration itself settled — the shaft is 2500 × 2200,
the pit is 2100 deep, the headroom is 4600 — and on a proposal they belong
under *work by others*, not under *what is supplied*. Which variables those
are is a fact about the offer, not about the catalogue, so this concept holds
the set and the rendering reads it. `Variable` is a type parameter and the
concept cannot check that the variable exists; a delegated variable nobody
offers is a requirement on nothing, and the rendering shows none.

## What is seeded and what is not

Everything here arrives from the catalogue file's `terms` block, by the
wiring at boot, like a price ([Seeding](../syncs/seeding.md)). No gesture and
no tool reaches this concept: a person cannot change the seller's terms and
neither can the assistant, for the same reason neither can change a price —
there is no rule. A seller's surface is the missing actor, as
[Quoting's note](quoting.md#not-in-this-concept) already says.

## What this is not

_The offer._ A stipulation is standing; an offer is dated. [Quoting](quoting.md)
copies what is stipulated into each quote at issue, so that a change to the
seller's terms next month does not change a quote issued this month.

_Negotiation._ Nothing here is agreed by anyone. The case's `Agreeing` — a
qualified acceptance, *yes, subject to* — is where a buyer's counter-condition
would live, and it stays on the horizon.

## See also

- [Pricing](pricing.md) — the other thing held against a basis
- [Quoting](quoting.md) — where these are frozen into an offer
- [Seeding](../syncs/seeding.md) — how they arrive

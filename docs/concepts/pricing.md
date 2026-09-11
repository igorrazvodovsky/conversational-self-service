# Pricing

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Pricing [Option, Basis]

purpose
  to say what each choice adds to the cost of a specification

state
  capital: Option -> Money
  monthly: Option -> Money
  months:  Option -> Natural
  usual:   Basis -> Option
  factor:  Basis -> Real

actions
  list [ option: Option ; capital: Money ]
    => [ option: Option ]
    record the one-off amount the option adds when it is chosen

  list [ option: Option ; monthly: Money ]
    => [ option: Option ]
    record the amount the option adds to every month of the term

  span [ option: Option ; months: Natural ]
    => [ option: Option ]
    record how many months this option runs for,
    for those options that name a contract term

  presume [ basis: Basis ; option: Option ]
    => [ basis: Basis ]
    record the term this basis reckons by when none has been chosen

  finance [ basis: Basis ; factor: Real ]
    => [ basis: Basis ]
    record what a financed capital sum costs in total on this basis,
    as a multiple of the sum itself

  delist [ option: Option ]
    => [ option: Option ]
    remove every amount recorded against the option

operational principle
  after list [ option: mrl_m500 ; capital: 58000 ] => [ option: mrl_m500 ]
  and list [ option: premium ; monthly: 550 ] => [ option: premium ]
  and span [ option: y10 ; months: 120 ] => [ option: y10 ]
  and presume [ basis: list2026 ; option: y10 ] => [ basis: list2026 ]
  and finance [ basis: list2026 ; factor: 1.25 ] => [ basis: list2026 ]
  then capital of mrl_m500 is 58000
  and after finance [ basis: cash ; factor: 1.0 ] => [ basis: cash ]
  then factor of list2026 is still 1.25
  and after delist [ option: mrl_m500 ] => [ option: mrl_m500 ]
  then capital of mrl_m500 is nothing
```

## The total is a read, and here is the arithmetic

There is no `total` action, and the omission is deliberate. Nobody performs
*compute the total*; a person performs a choice and the total changes. WYSIWID
§6.4 puts reads on the other side of the line from writes — "reads are handled
by client-driven querying capabilities […] and writes are handled directly by
the action API" — so the total is a calculation in a `where` clause over
exposed state, not an entry in the log.

Written down here because a formula that lives only in an implementation lives
nowhere. For a set of chosen options `C`, a term option `t` in `C`, and a
basis `b`:

```
capital     =  Σ capital(o)  for o in C
recurring   =  Σ monthly(o)  for o in C
term        =  months(t), or months(usual(b)) if C names no term
financed    =  capital × factor(b)
instalment  =  financed / term  +  recurring
lifetime    =  financed  +  recurring × term
```

Three assumptions, stated rather than buried, because the source data underdetermines them:

_The financing factor applies to capital only._ `financing_factor: 1.25` in
`elevator.json` is read as the total cost of financing an equipment price over
the term, not as a markup on the service charge. A customer paying cash pays
`capital`; the instalment figure is what the same equipment costs when it is
financed.

_The term scales the recurring stream and nothing else._ The three
`contract_term` options carry no price of their own in the catalogue, which is
the tell: their effect is on `months`. A longer term lowers the instalment and
raises the lifetime total, which is the trade-off the variable exists to
express. If it did anything else, the option would have needed a price.

_Before a term is chosen, the catalogue's default term applies._ That is what
`usual` and `presume` are for, and the read reports which of the two it used —
an instalment resting on an assumption the person has not made is a different
claim from one resting on a term they have. Refusing to show the figure until
somebody picks a term would hide the number that most influences which term
they pick.

## Why the reckoning is a basis and not a constant

`factor` and `usual` are not facts about the product. They are the terms on
which somebody is being quoted, and the note below already admits it: "three
assumptions, stated rather than buried, because the source data underdetermines
them." An assumption that the state cannot hold twice is an assumption nobody
can argue with, which is the failure mode
[Footprinting](footprinting.md#why-the-grid-is-a-type-parameter) avoids by
making `Grid` a parameter — the same specification reverses its ranking between
two grid intensities, so hard-coding one "would present a contested estimate as
a fact."

A financing factor of 1.25 is exactly as contested, and a customer paying cash
is reckoning on a different basis rather than a wrong one. `Basis` is a type
parameter for the same reason `Grid` is, and it costs one relation each.

The catalogue seeds one basis, so in practice there is one. What the
parameter buys is that a second one is expressible.

## Why this is separate from Footprinting

The purposes differ in one clause each and neither needs an "and": what a
choice costs, and what a choice emits. That is enough on the
[cheapest test](../method/objects.md#bad-smells), but the structural argument
is the more convincing one — the two do not compute the same way.

Price is additive over the chosen options and then scaled by a term. A
footprint is additive over the chosen options for its embodied half, and for
its operational half is a table lookup on three variables at once, multiplied
by a grid intensity and a service life. A single `Tallying [Option, Measure]`
covering both would fit the additive halves and misrepresent the other one.

They are also separable in use. A catalogue with prices and no carbon data is
an ordinary product catalogue; the reverse is an environmental product
declaration. Neither is a degenerate case of the other.

## Why `months` is a fact about an option

`months: Option -> Natural` reads oddly next to `capital` and `monthly` until
you notice that a contract term *is* an option — `y5`, `y10`, `y15` are chosen
from a variable like any others. Giving `Pricing` a `Term` type parameter of
its own would assert that terms are a different kind of thing, and would then
require this concept to know which variable holds them. It does not, and it
should not: it holds an amount against an option, and one kind of amount
happens to be a count of months.

## See also

- [Cataloguing](cataloguing.md#the-record-in-elevatorjson-is-three-concepts-facts-in-one-object) — where these amounts come from
- [Footprinting](footprinting.md) — the other reading of the same choices
- [Concept](../method/concept.md) — on reads, getters, and where the line falls

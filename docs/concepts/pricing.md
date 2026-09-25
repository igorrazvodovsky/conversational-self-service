# Pricing

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

queries
  total [ chosen: set Option ; basis: Basis ]
    => [ capital: Money ; recurring: Money ; term: Natural ;
         financed: Money ; instalment: Money ; lifetime: Money ;
         presumed: boolean ; complete: boolean ]
    capital is the sum of capital over the chosen options,
    and recurring the sum of monthly
    term is the months of a chosen option that names a term,
    or, when none does, of the option the basis presumes
    financed is capital times the basis's factor
    instalment is financed divided by term, plus recurring
    lifetime is financed plus recurring times term
    presumed when no chosen option names a term,
    and complete when there is a term to reckon by

operational principle
  after list [ option: mrl_m500 ; capital: 58000 ] => [ option: mrl_m500 ]
  and list [ option: premium ; monthly: 550 ] => [ option: premium ]
  and span [ option: y10 ; months: 120 ] => [ option: y10 ]
  and presume [ basis: list2026 ; option: y10 ] => [ basis: list2026 ]
  and finance [ basis: list2026 ; factor: 1.25 ] => [ basis: list2026 ]
  then total [ chosen: {mrl_m500, premium} ; basis: list2026 ]
    => [ lifetime: 58000 × 1.25 + 550 × 120 ; presumed: true ]
  and total [ chosen: {mrl_m500, premium, y10} ; basis: list2026 ]
    => [ lifetime: 58000 × 1.25 + 550 × 120 ; presumed: false ]
  and after finance [ basis: cash ; factor: 1.0 ] => [ basis: cash ]
  then factor of list2026 is still 1.25
  and after delist [ option: mrl_m500 ] => [ option: mrl_m500 ]
  then capital of mrl_m500 is nothing
```

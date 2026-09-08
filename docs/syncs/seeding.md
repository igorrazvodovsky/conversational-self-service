# Seeding

How `elevator.json` becomes facts. See [the index](README.md).

## The rules

```
sync TheCatalogueSeedsTheSolver
when  { Cataloguing/list: [ variable: ?v ; option: ?o ]
          => [ variable: ?v ; option: ?o ] }
then  { Constraining/offer: [ variable: ?v ; option: ?o ] }

sync ADelistedOptionLeavesTheSolver
when  { Cataloguing/delist: [ variable: ?v ; option: ?o ]
          => [ variable: ?v ; option: ?o ] }
then  { Constraining/withhold: [ variable: ?v ; option: ?o ] }
```

## Why only two, when the file feeds four concepts

Each option in the source file carries a label, a note, a price, a monthly
price and a carbon figure. Those are facts of
[Cataloguing](../concepts/cataloguing.md),
[Pricing](../concepts/pricing.md) and
[Footprinting](../concepts/footprinting.md), and the option's membership of a
variable's range is a fact of
[Constraining](../concepts/constraining.md) as well as of Cataloguing.

Only the last of those is carried by a rule. The other three are invoked
directly by the wiring at boot — MSM §5.2.1's `main`, which "discovers concepts,
wires synchronizations" and is the one place outside a concept or a rule where
an action may be invoked.

The distinction is not arbitrary and it is worth being able to state. A rule
exists where one fact *follows from* another. An option's range membership
follows from its being listed: an option nobody offers cannot be chosen, and
delisting one has to take it out of the solver or the catalogue and the solver
disagree about what is buildable. A price does not follow from being listed.
An option can be listed with no price recorded against it, and a price can
change without the catalogue changing. Putting `Pricing/list` behind
`Cataloguing/list` would have required `Cataloguing/list` to carry an amount —
which is the option record reassembled, the very thing the split exists to take
apart.

So: the loader reads one file and invokes four concepts. The file is a unit of
shipping; the concepts are units of meaning. That the two do not coincide is
MSM §5.2.2's point, on a scale small enough to check by eye.

## What the loader invokes

In order, once, at boot:

| From the file | Action |
|---|---|
| each variable's name, label and group | `Cataloguing/describe` |
| each option's value and label | `Cataloguing/list` — and by rule, `Constraining/offer` |
| each option's `note` | `Cataloguing/annotate` |
| each option's `price` | `Pricing/list` |
| each option's `monthly_price` | `Pricing/list` |
| `pricing.term_months` | `Pricing/span` |
| `pricing.financing_factor` | `Pricing/finance` |
| each option's `co2` | `Footprinting/attribute` |
| `footprint.annual_kwh` | `Footprinting/meter` |
| `footprint.grid_factor`, `grid_factor_decarbonising` | `Footprinting/rate` |
| `footprint.service_life_years`, `fabrication_multiplier`, `module_scope` | `Footprinting/frame` |
| each `table` constraint | `Constraining/tabulate` |
| each `implication` constraint | `Constraining/imply` |

Every one of them appears in the [action log](../method/implementation.md#the-action-log)
like any other action, which means the catalogue's arrival is as accountable as
a person's click, and a question about why an option is priced as it is has an
answer with a timestamp on it.

## See also

- [Cataloguing](../concepts/cataloguing.md#the-record-in-elevatorjson-is-three-concepts-facts-in-one-object) — the record, read as facts
- [Constraining](../concepts/constraining.md#why-the-ranges-are-here-as-well-as-in-the-catalogue) — why the range is held twice
- [From meaning to code](../method/implementation.md) — what `main` is for

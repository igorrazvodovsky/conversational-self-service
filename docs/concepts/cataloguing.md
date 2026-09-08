# Cataloguing

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Cataloguing [Variable, Option]

purpose
  to say what may be ordered, in terms a person can recognise

state
  offers:  Variable -> set Option
  heading: Variable -> string
  family:  Variable -> string
  label:   Option -> string
  note:    Option -> string

actions
  describe [ variable: Variable ; heading: string ; family: string ]
    => [ variable: Variable ]
    record what the variable is called
    and the family it is arranged under

  list [ variable: Variable ; option: Option ; label: string ]
    => [ variable: Variable ; option: Option ]
    add the option to those the variable offers
    record the words the option reads as

  list [ variable: Variable ; option: Option ; label: string ]
    => [ error: string ]
    if the variable already offers the option
    return the error description

  annotate [ option: Option ; note: string ]
    => [ option: Option ]
    record a remark about what the option means in practice

  delist [ variable: Variable ; option: Option ]
    => [ variable: Variable ; option: Option ]
    remove the option from those the variable offers

operational principle
  after describe [ variable: rated_load ; heading: "Rated load" ; family: "performance" ]
    => [ variable: rated_load ]
  and list [ variable: rated_load ; option: kg1000 ; label: "1000 kg / 13 persons" ]
    => [ variable: rated_load ; option: kg1000 ]
  and annotate [ option: kg1000 ; note: "a stretcher fits" ] => [ option: kg1000 ]
  then offers of rated_load contains kg1000
  and label of kg1000 reads "1000 kg / 13 persons"
  and after delist [ variable: rated_load ; option: kg1000 ]
    => [ variable: rated_load ; option: kg1000 ]
  then offers of rated_load does not contain kg1000
```

## What this concept is not

It is not the product data model, and the distinction is the one WYSIWID §2
insists on: "a concept is not an element in an ontology." `Cataloguing` is not
here to represent an elevator. It is here because somebody has to be able to
say *these are the things you may ask for, and this is what they are called*,
and because that is a different job from saying which of them go together.

The test the note has to pass is whether a person would recognise the actions
as things somebody does. `list` is what a product manager does when a new car
size becomes orderable. `delist` is what they do when a supplier stops making
one. `annotate` is the sentence under the option — "a stretcher fits", "no
stretcher fits" — which is the difference between a catalogue and a parts list.

## The record in `elevator.json` is three concepts' facts in one object

Each option in the source file is an object of this shape:

```json
{ "value": "kg1000", "label": "1000 kg / 13 persons", "price": 3000,
  "co2": 90, "note": "a stretcher fits" }
```

That object has all three [bad smells](../method/objects.md#bad-smells) and is
the cleanest live instance of them in the repository. Its state has no sets —
it is the properties of one option. Its actions cannot be defined on it: you
cannot ask a single option what a specification costs, which is why a
whole-collection function appears the moment anyone tries. And its purpose will
not come out coherent, because there is no single answer to *what is this
object for*: `label` and `note` are for recognising the option, `price` is for
totalling a quotation, `co2` is for estimating a footprint.

Read as [facts](../method/fact.md) rather than as a record, the same
information distributes without residue:

```
offers   (rated_load, kg1000)     Cataloguing
label    (kg1000, "1000 kg / 13 persons")   Cataloguing
note     (kg1000, "a stretcher fits")       Cataloguing
capital  (kg1000, 3000)           Pricing
embodied (kg1000, 90)             Footprinting
range    (rated_load, kg1000)     Constraining
```

The file is one file because a file is a convenient unit of shipping. It is
four concepts because meaning does not follow files. Splitting it on load —
which is what [the seeding synchronizations](../syncs/README.md#seeding) do —
is MSM §5.2.2's "modularity of meaning" against modularity of structure, on a
scale small enough to check by eye.

## The family is not the grouping that matters

`family` records the catalogue's own arrangement — `agreement`, `context`,
`performance`, `platform`, `dimensions`, `doors`, `safety`, `cabin`. It is a
fact about the catalogue and it is fixed.

The grouping a person actually needs while configuring is *what I asked for*,
*what follows from that*, and *what is still open*, and that one is a property
of the current state rather than of the catalogue. It is read from
[Asserting](asserting.md) and [Constraining](constraining.md), changes on
every action, and cuts across every family. Driving the layout from `family`
would put a settled `energy_class` next to an open `dispatch_control` and
present them as the same kind of thing. See
[Constraining](constraining.md#what-settled-values-are-for).

## See also

- [Constraining](constraining.md) — the other holder of the option ranges, and why
- [Pricing](pricing.md), [Footprinting](footprinting.md) — the other two owners of the option record
- [Objects](../method/objects.md#bad-smells) — the three smells, applied above

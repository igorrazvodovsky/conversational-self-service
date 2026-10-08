# Seeding

How `elevator.json` becomes facts. See [the index](README.md).

## The stimulus

The application's start is a stimulus like a click or a tool call: an action
of the bootstrap concept, [Copiloting](../concepts/copiloting.md), carrying
the catalogue as it was read, the basis and grids it is reckoned on, the
workspace with its surfaces and facets, and the specification to open.

```
Copiloting/boot: [ catalogue ; basis ; grids ; workspace ;
                   surfaces ; facets ; spec ] => [ … the same … ]
```

`agent/wiring.py` performs it once, and invokes no concept action itself.
MSM §5.2.1's `main` "discovers and registers all concepts" and "wires all
declared synchronizations"; it is not a second initiator. What the catalogue
leaves in each concept is carried there by the rules below, so the invariant
of MSM §5.2.3 holds for the catalogue as for everything else: every action
reaches the log by way of a synchronization, with a provenance edge naming it.
A question about why an option is priced as it is has an answer with a
timestamp and a rule on it.

## The rules

```
sync TheSellerIsIntroduced
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
where { ?c's vendor is ?v }
then  { Profiling/introduce: [ party: seller ; name ; organisation ;
          address ; email ; phone — each as ?v gives it ] }

sync TheSellersTermsAreStipulated
when  { Copiloting/boot: [] => [ catalogue: ?c ; basis: ?b ] }
where { ?c's terms are ?t }
then  { Stipulating/stipulate: [ basis: ?b ; validity, warranty,
          approval, installation — as ?t gives them ] ;
        Stipulating/promise: [ basis: ?b ; option ; weeks ]
          for each option of each variable with a promised handover ;
        Stipulating/stage: [ basis: ?b ; upon ; event ; share ]
          for each entry of ?t's schedule ;
        Stipulating/clause: [ basis: ?b ; section ; text ; where: {} ]
          for each text under each section of ?t's clauses ;
        Stipulating/clause: [ basis: ?b ; section ; text ; where: { option } ]
          for each text under each section of each option's scope ;
        Stipulating/delegate: [ basis: ?b ; variable ]
          for each variable ?t leaves to others }

sync TheCatalogueIsListed
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Cataloguing/describe: [ variable ; heading ; family ]
          for each variable of ?c ;
        Cataloguing/list: [ variable ; option ; label ]
          for each option of each variable ;
        Cataloguing/annotate: [ option ; note ]
          for each option with a note ;
        Cataloguing/bound: [ option ; above ; upTo ]
          for each option offered for a range of a quantity }

sync TheCatalogueIsDetailed
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Detailing/detail: [ item: variable ; topic ; text ]
          for each particular of each variable ;
        Detailing/detail: [ item: option ; topic ; text ]
          for each particular of each option }

sync TheCatalogueIsPriced
when  { Copiloting/boot: [] => [ catalogue: ?c ; basis: ?b ] }
then  { Pricing/list: [ option ; capital ] for each option with a price ;
        Pricing/list: [ option ; monthly ] for each with a monthly price ;
        Pricing/span: [ option ; months ] for each contract term ;
        Pricing/presume: [ basis: ?b ; option ] for the default term ;
        Pricing/finance: [ basis: ?b ; factor ] }

sync TheCatalogueIsFootprinted
when  { Copiloting/boot: [] => [ catalogue: ?c ; basis: ?b ; grids: ?g ] }
then  { Footprinting/attribute: [ option ; embodied ] for each option with a figure ;
        Footprinting/attribute: [ option ; installed ]
          for each option with a figure for installation ;
        Footprinting/attribute: [ option ; ended ]
          for each option with a figure for the end of its life ;
        Footprinting/recur: [ option ; upkeep ]
          for each option with a yearly figure for its upkeep ;
        Footprinting/meter: [ class ; usage ; travel ; energy ]
          for each entry of the annual demand table ;
        Footprinting/rate: [ grid ; intensity ] for each grid ?g names ;
        Footprinting/frame: [ basis: ?b ; horizon ; uplift ; scope ] }

sync TheCatalogueSetsTheRules
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Constraining/tabulate: [ rule ; over ; allows ; because ]
          for each table constraint ;
        Constraining/imply: [ rule ; given ; entails ; because ]
          for each implication }

sync TheCatalogueSaysHowToWorkThingsOut
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Deriving/describe: [ quantity ; meaning ; unit ]
          for each quantity of ?c ;
        Deriving/define: [ method ; yields ; formula ; needs ; presumes ]
          for each method of ?c, in the order the catalogue prefers them }

sync TheCatalogueSetsTheSteps
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Stepping/author: [ template ; name ; needs ; covers ; owner ]
          for each step of ?c, in the catalogue's order }

sync TheWorkspaceIsLaidOut
when  { Copiloting/boot: [] => [ workspace: ?w ; surfaces: ?s ; facets: ?f ] }
then  { Moding/offer: [ workspace: ?w ; surface ] for each surface in ?s ;
        Moding/focus: [ workspace: ?w ; surface: the first of ?s ] ;
        Showing/offer: [ lens: ?w ; facet ; about ] for each facet in ?f ;
        Showing/show: [ lens: ?w ; facet ] for each facet in ?f shown to begin with }

sync ASpecificationIsStartedAtBoot
when  { Copiloting/boot: [] => [ spec: ?s ] }
then  { Asserting/start: [ spec: ?s ] }

sync TheCatalogueSeedsTheSolver
when  { Cataloguing/list: [ variable: ?v ; option: ?o ]
          => [ variable: ?v ; option: ?o ] }
then  { Constraining/offer: [ variable: ?v ; option: ?o ] }

sync ADelistedOptionLeavesTheSolver
when  { Cataloguing/delist: [ variable: ?v ; option: ?o ]
          => [ variable: ?v ; option: ?o ] }
then  { Constraining/withhold: [ variable: ?v ; option: ?o ] }
```

These rules depart from WYSIWID in one respect, and it is stated here rather
than left to be found. In the paper, iteration comes only from the `where`:
it yields a set of bindings and `then` is invoked once per binding (§6.5), so
`then` has no loops and every invocation in it runs at the same grain. A
seeding rule instead fires once per boot and computes its whole list of
invocations from the file, at several grains at once — one `stipulate` beside
a `stage` per schedule entry, a `describe` per variable beside a `list` per
option. `for each` in a `then` is shorthand for that list. Written as
WYSIWID would, each grain would be a rule of its own with a `where` binding
the entries; that is more rules saying nothing new, and the code registers
the shorthand exactly as written here, one rule computing its invocations. The
same liberty is taken, for a different reason, by
[`AConflictIsPutToThePerson`](propagation.md#when-assertions-cannot-hold-together),
which aggregates in its `where`.

An option's identity is `variable:value`, minted by each rule from the file's names, because a value alone does not identify an option:
`standard` is a service level, an energy package, a control panel and a lead
time. See [Individual](../method/individual.md#two-levels).

The rules fire in the order written, each with the consequences of the ones
before it already in place. `ASpecificationIsStartedAtBoot` comes last, so the
solver holds its rules before a specification is given to it
([Propagation](propagation.md#a-specification-is-given-to-the-solver)).

## Which rule hangs off what

Each concept is seeded by its own rule off the stimulus, not by a chain off
`Cataloguing/list`. A rule hangs one fact off another only where the second
*follows from* the first. An option's place in the solver's range follows
from its being listed: an option nobody offers cannot be chosen, and delisting
one has to take it out of the solver or the catalogue and the solver disagree
about what is buildable. So `TheCatalogueSeedsTheSolver` hangs off
`Cataloguing/list`.

A price does not follow from being listed. An option can be listed with no
price recorded against it, and a price can change without the catalogue
changing. Putting `Pricing/list` behind `Cataloguing/list` would have required
`Cataloguing/list` to carry an amount, which is the option record reassembled,
the very thing the split exists to take apart. Off the boot stimulus, each
concept takes only its own facts from the file. The file is a unit of
shipping; the concepts are units of meaning. That the two do not coincide is
MSM §5.2.2's point, on a scale small enough to check by eye.

A range follows from nothing either. `Cataloguing/bound` is the seller
saying which counts or measures an option is offered for (2–6 stops, up to
15 m of travel), and it rides with the listing in one rule only because both
are read from the same option record. The methods by which a quantity is
worked out are the seller's in the same way a price is: the storey height a
method presumes is a convention of the seller's, not a fact of any building,
and it reaches [Deriving](../concepts/deriving.md) from the file, where a
derivation shows it as assumed until a source states another.

## The seller's side

`TheSellerIsIntroduced` and `TheSellersTermsAreStipulated` are the seller's
side of a quotation: who is offering, and on what conditions. They hang off
the application's start rather than any gesture for the same reason a price
does: no actor in this application is the seller, and no rule lets a person or
the model reach [Stipulating](../concepts/stipulating.md) or the seller's
[Profiling](../concepts/profiling.md) ([Gestures](gestures.md#what-a-gesture-is-not-allowed-to-be)).

A handover promise is the seller's condition on an option, not a description
of it, so `TheSellersTermsAreStipulated` reads the `weeks` an option carries
in the file and leaves its label to [Cataloguing](../concepts/cataloguing.md).
The label says *16 weeks from order* to a person; the promise is the number
the programme is reckoned from, and neither is parsed out of the other. A
payment stage carries both of its descriptions the same way: `upon` in the
seller's words for the proposal, `event` as the milestone the programme
places it on.

What the seller supplies with an option, what it leaves out and what it asks
the customer to provide are conditions too, so an option's `scope` in the file
becomes clauses of the basis that hold where the option is chosen, and an
offer prints them only then. What the option is and does, the interfaces it
speaks and what it covers, is a description, and goes to
[Detailing](../concepts/detailing.md) beside the label rather than into the
terms. The line between them is whether the seller is bound by it: *the
customer's access control contractor attends commissioning* is a condition
of the price, *the reader in the lobby panel speaks OSDP v2* is what the
option is.

## See also

- [Cataloguing](../concepts/cataloguing.md) — the record, read as facts
- [Constraining](../concepts/constraining.md) — `range`, held beside `offers` because neither concept may read the other's
- [Copiloting](../concepts/copiloting.md) — the bootstrap concept whose `boot` roots every rule here
- [From meaning to code](../method/implementation.md) — what `main` is for

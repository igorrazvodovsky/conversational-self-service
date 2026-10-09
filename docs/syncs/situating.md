# Situating

The facts of the situation the lift must fit: what the building is, where it
is, whether there is a shaft already, how many floors and how far apart.
What each party said of them, what the person has checked, and what rests on
each. See [the index](README.md).

The case keeps these apart from the requirement on purpose: a given is an
input and a clause is a requirement, and a configurator that holds them in
one field has the person *choosing* that the building is a hospital, with
everything that follows from that free to be traded away in a conflict. Here
a given is recorded beside the assertion or the reading that carries it, with
who it comes from and whether anyone has measured it, and the rules that
trade assertions read it.

## What is a fact of the situation

```
sync TheCatalogueNamesTheSituation
when  { Copiloting/boot: [] => [ catalogue: ?c ] }
then  { Situating/describe: [ fact ; meaning ]
          for each variable ?c lists under situation, with its heading,
          and for each quantity some method of ?c needs, with its meaning }
```

Two kinds of fact, from the catalogue. The variables the seller lists under
`situation` are facts the solver takes as options: the building's type, the
code regime, whether the shaft exists. The quantities a method needs are
facts the solver never sees: the floors, the basements, the floor-to-floor
height, which [Deriving](../concepts/deriving.md) works out into the stops
and the travel. A quantity a method *yields* is not a fact; it is what the
facts come to. One name serves across variables and quantities, so a
quantity and a variable never share one.

## A value asserted of a fact is a given

```
sync AnAssertedFactIsAGiven
when  { Asserting/assert: [ party: ?p ] => [ spec: ?s ; variable: ?v ; option: ?o ] }
where { Situating: { ?v in facts }
        not Situating: { ?g in givens of ?s ; ?g of: ?v ; ?g is: ?o }
        bind a fresh identity as ?g' }
then  { Situating/record: [ situation: ?s ; party: ?p ; fact: ?v ;
          value: ?o ; given: ?g' ] }

sync AWithdrawnFactIsStruck
when  { Asserting/withdraw: [] => [ spec: ?s ; variable: ?v ] }
where { Situating: { ?g in givens of ?s ; ?g of: ?v } }
then  { Situating/strike: [ given: ?g ] }
```

A fact the solver takes as an option reaches it as an assertion, by whatever
route an assertion takes: the person's click, the model's tool, a reading's
answer, a value adopted from a proposal. The given is recorded off the
assertion, with the asserting party as the one it comes from, so one rule
covers every route and the given always says what the solver holds. Asserting
the value the given already has records nothing, which is what lets a survey
assert its measurement without the measurement being recorded again as an
estimate. A withdrawn value takes its given with it: the situation does not
go on saying *hospital* when nothing is asserted.

## A quantity read is a given

```
sync AReadQuantityIsAGiven
when  { Reading/read: [] => [ states: ?q ] }
where { Specifying: { ?s in open }
        ?q maps ?f to ?n
        Situating: { ?f in facts }
        ?f is not given by the person in ?s
        bind a fresh identity as ?g }
then  { Situating/record: [ situation: ?s ; party: model ; fact: ?f ;
          value: ?n ; given: ?g ] }
```

The model reads *ground plus five upper floors* as the quantity it states,
and the quantity is a fact of the situation: recorded here, by the model,
as an estimate, before the clause is stated, so that what the reading is
worked out into rests on everything the situation gives and not only on the
one passage ([Reading](reading.md#a-quantity-read-is-worked-out)). A fact
the person has given stands: a reading that states it again records
nothing, and the tool says so.

## The person vouches for a given

```
sync AKeptReadingVouchesForItsGivens
when  { Specifying/adopt: [ party: person ] => [ clause: ?c ; spec: ?s ] }
where { Reading: { ?c answer: ?a* ; ?c states: ?q }
        ?f is a variable offering an option ?x in ?a*,
          or a quantity ?q maps to ?x
        Situating: { ?g in givens of ?s ; ?g of: ?f ; ?g is: ?x ;
                     ?g recordedBy: model }
        bind a fresh identity as ?g' }
then  { Situating/record: [ situation: ?s ; party: person ; fact: ?f ;
          value: ?x ; given: ?g' ] }
```

A given the model read is the model's until the person keeps the reading,
as the clause is ([Reading](reading.md#the-person-keeps-a-reading)). Keeping
it records the fact again under the person's name, with the same value and
no more certainty than before: they have said it is so, not measured it. The
case's `confirm` passes `recordedBy` the same way.

```
?v is given by the person in ?s
  iff  Situating: { ?g in givens of ?s ; ?g of: ?v ; ?g recordedBy: person }
```

That reading is what *cannot trade* comes to in this composition. A
conflict's candidates leave out a fact the person gave
([Propagation](propagation.md#when-assertions-cannot-hold-together)): the
building being a hospital is not one of the things to give up, so the
question offers the choices that conflict with it, or, where only one does,
no question at all and the refusal on record. The model may not assert over
it or withdraw it ([Conduct](conduct.md#the-permissions)), and a reading of
the model's proposes no answer on it
([Reading](reading.md#a-reading-becomes-a-clause-and-its-answer-a-choice)).
A fact the model estimated and nobody has kept is the model's, as a reading
is, and can be given up or read again.

## The person surveys a fact

```
sync APersonSurveysAFact
when  { Copiloting/gesture: [ act: "survey" ; fact: ?f ; value: ?x ] => [] }
where { Specifying: { ?s in open }
        Situating: { ?g in givens of ?s ; ?g of: ?f } }
then  { Situating/survey: [ party: person ; given: ?g ; value: ?x ] }

sync APersonSurveysAFact
when  { Copiloting/gesture: [ act: "survey" ; fact: ?f ; value: ?x ] => [] }
where { Specifying: { ?s in open }
        Situating: { ?f in facts }
        not Situating: { ?g in givens of ?s ; ?g of: ?f }
        bind a fresh identity as ?g' }
then  { Situating/record: [ situation: ?s ; party: person ; fact: ?f ;
          value: ?x ; given: ?g' ]
        Situating/survey: [ party: person ; given: ?g' ; value: ?x ] }

sync ASurveyedFactReachesTheAssertions
when  { Situating/survey: [] => [ situation: ?s ; fact: ?v ; value: ?o ;
          party: ?p ] }
where { Cataloguing: { ?v offers: ?o }
        not Asserting: { ?s asserted: ?v -> ?o } }
then  { Asserting/assert: [ party: ?p ; spec: ?s ; variable: ?v ; option: ?o ] }
```

One gesture, two blocks on the state: a fact already given is surveyed, and
one nobody has given is recorded and surveyed in one move, so a storey
height a method only presumed can be measured without first being guessed.
A surveyed fact the solver takes reaches it as the person's assertion, by
the rule above; the given is not recorded again, since it already says what
was measured.

Nobody surveys but the person. There is no `TheModelMaySurvey`, and the
person's own agent surveys as the person
([Conduct](conduct.md#the-persons-own-agent-acting-as-the-person)): a
measurement is a claim about the site, and the model has not been there.

## What rests on a given is worked out again, and marked

```
sync ASurveyedQuantityIsWorkedOutAgain
when  { Situating/survey: [] => [ situation: ?s ; fact: ?f ; value: ?x ] }
where { Deriving: { ?d for: ?c ; ?d method: ?m ; ?m needs: ?f ; ?m yields: ?y }
        ?d is the latest derivation for ?c yielding ?y
        ?d took ?f as something other than ?x, stated or assumed
        Specifying: { ?s clauses: ?c }
        ?stated maps each quantity ?s gives to its value
        ?m' is the first method yielding ?y that ?stated is enough for
        bind a fresh identity as ?d' }
then  { Deriving/derive: [ method: ?m' ; for: ?c ; stated: ?stated ;
          derivation: ?d' ] }

sync AChangedGivenStalesWhatRestsOnIt
when  { Situating/survey: [] => [ situation: ?s ; given: ?g ; fact: ?f ;
          value: ?x ] }
where { Deriving: { ?d for: ?c ; ?d method: ?m ; ?m needs: ?f ; ?m yields: ?y }
        ?d is the latest derivation for ?c yielding ?y
        ?d took ?f as something other than ?x, stated or assumed
        Binding: { ?sel for: ?s ; ?ch in choices of ?sel ;
                   ?ch answers: ?c ; ?ch value: ?o }
        Cataloguing: { ?y offers: ?o } }
then  { Staling/flag: [ item: ?ch ; basis: [ given: ?g ] ] }

sync AChangedGivenStalesWhatRestsOnIt
when  { Situating/strike: [] => [ situation: ?s ; given: ?g ; fact: ?f ] }
where { … as above, whatever ?d took ?f as }
then  { Staling/flag: [ item: ?ch ; basis: [ given: ?g ] ] }
```

A method that needed the fact, whether it took it from a given or presumed
it, made a derivation for some clause, and that clause's answer is the
option the result fell in. When the measurement differs from what that
derivation took the fact as, the number is worked out again, so the canvas
can show what it now comes to, and the answer is marked with the given as
its basis, so that the person sees *the storey height was measured at
4.2 m since this was worked out* beside it. It is not replaced: nothing is
recomputed into currency, and an answer the person may have kept is not
re-decided for them ([Staling](staling.md)). The person answers the clause
with the option the new derivation names, or clears the mark. A survey that
confirms the value the derivation used changes nothing and marks nothing,
and the comparison is against what was used rather than against the given's
last value, because a height a method only presumed had no given to compare
with until it was measured.

The derivation is made for the clause the reading became, as the first one
was, so the canvas shows both under the same words. A derived quantity is
proposed as an answer only where the clause has none
([Reading](reading.md#a-quantity-read-is-worked-out)), which is why the
second derivation proposes nothing while the marked answer stands.

## The person drops a given

```
sync APersonDropsAGiven
when  { Copiloting/gesture: [ act: "drop" ; given: ?g ] => [] }
where { Situating: { ?g in givens of ?s ; ?g of: ?v }
        Asserting: { ?s asserted: ?v -> _ } }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }

sync APersonDropsAGiven
when  { Copiloting/gesture: [ act: "drop" ; given: ?g ] => [] }
where { Situating: { ?g in givens of ?s ; ?g of: ?f }
        not Asserting: { ?s asserted: ?f -> _ } }
then  { Situating/strike: [ given: ?g ] }
```

A fact the solver holds is dropped by withdrawing it, which strikes the
given by the rule above; a quantity, which the solver never held, is struck
outright, and what rested on it is marked. Striking is the inverse `record`
would otherwise lack.

## A completion waits for the situation

```
sync TheModelMayProposeACompletion
where { … and every fact of the situation that Cataloguing offers
          options for is given in ?s }

sync AChosenGoalFinishesTheSpecification
where { … the same }
```

Both rules are in [Conduct](conduct.md#what-a-completion-is-finished-for-is-the-persons-to-say),
with one conjunct added here. The optimiser chooses the cheapest option for
every variable left open, and the cheapest building type is not a finding
about the building. A completion is therefore not computed while a fact of
the situation the solver takes is open; the tool says which, and the model
asks. That is the sentence *state the context before anything else* taken
out of the prompt and made a condition a rule reads.

## What the canvas reads

A given sits beside the value or the quantity it is a given of, not in a
list of its own. On a value the solver holds, the line says it is a fact of
the building and whether the person has checked it, and offers to check it;
on a derivation, each quantity it rested on or assumed is marked as stated
or measured, and can be measured there. The situation as a whole is a read
over `Situating` for the model's `review`, under `situation`, with what is
still open.

## What is not here

_No `pending` given._ The case's `Situating` records a fact with no value
yet, as pending a survey. Here a fact nobody has given is *open*, which the
canvas already says; a second way to say it would
be the same fact under two names.

_No `pin`, and no `constrains`._ The case pins a given to a target and
solves backwards from it. Here the solver takes assertions, and a given
constrains the specification by being asserted, through
[Propagation](propagation.md); nothing is pinned by hand, and the reverse
query is not built.

_No rule carries a given into the solver on its own._ A fact the solver
takes is asserted first and recorded as given off the assertion, never the
other way round, so that `Asserting` stays the one path into the solver
([Propagation](propagation.md#assertions-reach-the-solver)).

_No certainty on a value read from words._ The model does not say how firmly
a quantity it read is known; every given it records is an estimate, and only
a survey makes one measured. Reading *about five floors* as less certain than
*five floors* would be the model's judgment on record with nothing to check
it against.

_Nothing marks an offer._ An open quote whose given moved is already marked
by the assertion the survey makes
([Staling](staling.md#what-has-a-basis-here)); a quantity that changed
reaches the offer only through an answer, which is marked here.

## See also

- [Situating](../concepts/situating.md) — the concept
- [Reading](reading.md) — where a quantity is read, and worked out over the situation's givens
- [Conduct](conduct.md) — the model's permissions, narrowed by a fact the person gave
- [Propagation](propagation.md) — the conflict question, which does not offer such a fact
- [Staling](staling.md) — the mark a changed given puts on what rested on it

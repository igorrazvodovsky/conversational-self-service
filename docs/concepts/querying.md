# Querying

A domain [concept](../method/concept.md) of the elevator configurator.

```
concept Querying [Question, Record]

purpose
  to retrieve the records that answer a question posed in the
  asker's own words

state
  text:    Question -> string
  matched: Question -> set Record

actions
  ask [ question: Question ; text: string ]
    => [ question: Question ]
    record the text of the question
    determine which records bear on it
    record those as matched for the question

  ask [ question: Question ; text: string ]
    => [ error: string ]
    if the text cannot be interpreted as a question over the records
    return the error description

operational principle
  after ask [ question: q ; text: "revenue by category" ] => [ question: q ]
  then matched of q is a set R
  and every record in R bears on revenue by category
  and after ask [ question: q' ; text: "headcount by region" ] => [ question: q' ]
  then matched of q' is a set R' which is not R
```

## There is no `answer` action

There was one, and it was a getter: it changed nothing and returned `matched`,
which `ask` had already computed. WYSIWID §6.4 puts that on the read side of
the line, and [Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic)
makes the argument in full for the same reason — nobody performs *compute the
total*, and nobody performs *answer* either. The act was `ask`; the records are
a read over `matched`.

The line is whether the observation is something a person would recognise as an
act. [`Constraining/complete`](constraining.md) also changes nothing and stays,
because *work out the cheapest buildable lift* is a thing somebody does, the way
`check` on a password is. `answer` is not, so it went.

## In the code

`query_data(query: str)` (`agent/src/query.py:12`) accepts the question and ignores it. It logs the first 60 characters (`:20`) and returns `_cached_data` — the entire CSV, read once at import (`:8-10`) — regardless of what was asked (`:22`).

The last clause of the operational principle is the one the implementation fails. Two different questions match identical records, so the concept's purpose is not fulfilled by any execution of it.

## Why this is worth writing down

It is a demo stub, and as a stub it is fine. What the vocabulary buys is the ability to say precisely what kind of stub it is: the action's name and signature promise an interpretation the body does not perform. MSM §5.1.2 names this class of failure — the act the caller believes it is invoking and the act the system performs are not the same act.

`search_flights` (`agent/src/a2ui_fixed_schema.py:39`) is the same error, more starkly. It does not search. It takes `flights: list[Flight]` — the results — as its input, and renders them (`:57-62`). The model invents the flights and passes them to a function named for retrieving them.

Under MSM §5.1.2's framing that is the implementation of one concept, rendering, under the name of another, searching. In a demo the cost is nil. The point of recording it is that a vocabulary in which it can be said is the precondition for noticing it when the cost is not nil — which is the same argument the paper makes about enshittification in §5.1.3, where "the user's action does not change; the concept behind it does."

## A note on the type parameter

`Record` is polymorphic and unconstrained, so `Querying` works against CSV rows, database tuples or documents without knowing which. The current implementation hard-codes both the source and the shape (`agent/src/db.csv`), which is the ordinary cost of a fixture and not a design error — but it means the concept as written is not yet reusable, and would need the data source to arrive as a parameter or through a [synchronization](../method/synchronization.md).

## See also

- [Action](../method/action.md) — the general form of actions named for what they do not do
- [Concept](../method/concept.md) — on why charts are not concepts but renderings of this one's state

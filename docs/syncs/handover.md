# Handover

How a specification is put into the seller's hands. See [the index](README.md).

## The rules

```
sync APersonHandsOver
when  { Copiloting/gesture: [ act: "handover" ; spec: ?s ; reason: ?why ] => [] }
then  { HandingOver/send: [ item: ?s ; from: person ; to: seller ; reason: ?why ] }

sync TheModelMayHandOver
when  { Copiloting/invoke: [ tool: "handover" ; spec: ?s ; reason: ?why ] => [] }
then  { HandingOver/send: [ item: ?s ; from: person ; to: seller ; reason: ?why ] }
```

Two rules, one action, and the same `then` down to the parties, as
[`APersonRequestsAQuote`](gestures.md#a-quote-is-requested) and
[`TheModelMayRequestAQuote`](conduct.md#the-permissions) share theirs. A
handover goes *from the person* whoever performed it, because the
specification is the person's and the seller is the only party here it can
go to; `seller` is the party [Seeding](seeding.md#the-sellers-side)
introduces at boot. What tells the two apart is the provenance edge, which
the canvas reads: *you handed this to the seller* and *the assistant handed
this to the seller, at your word* are one action under two rules. The
person's own agent reaches the gesture under its own actor, as it reaches
every other ([Conduct](conduct.md#the-persons-own-agent-acting-as-the-person)),
so a handover it makes reads as its.

`handover` joins the tools
[`TheCanvasIsShownBeforeItChanges`](conduct.md#the-permissions) names: a
handover is a fact the canvas shows, and a person who cannot see the canvas
watches nothing happen.

## What travels

Nothing is frozen. The item handed over is the specification itself, and
what the seller needs to take it up is read, not carried: which values were
asked for and which followed, who asserted each and in reply to what, which
requirements were read from a document and which the person kept as their
own, what is unmet and what is still open, what was asked and what the
person replied. Every one of those is a provenance edge or an utterance the
log already holds, and the view at the moment of the handover is the view
at that point in the log (`GET /at`). A quote freezes its item because an
offer must hold still; a handover's purpose is that the recipient takes the
specification up, and what they take up is the specification as it is,
with the log saying how it got there.

That is constraint 6 of the case, and it is the difference between this and
a handover that carries only the values. A seller who receives an assignment
cannot tell *asked for* from *followed from that*, and has to ask the person
to restate their situation, which is the question the whole canvas exists to
answer. Here they read it the way the person's own agent does, through
`review`, each item in its kind.

The reason is the one thing the handover holds that nothing else does: what
the seller is being handed the specification *for*. It is the sender's
words, and when the model writes it, the prompt tells it to write what the
person asked for or what it found it had no rule to do, never a reason of
its own invention. That is a sentence in a prompt, which this repository
treats as a finding, as it does for a name the model is told not to invent
([Conduct](conduct.md#the-permissions)).

## When the assistant hands over

The rule is unconditional, and the condition is the person's. Asked for
someone at the seller, the assistant hands over in that turn, and the
reason is what they asked for. There is no state the rule could read that
says the person asked, so the permission is not gated, and the only thing
that would gate it is a reply that puts them off, which the prompt declines
to write. A configurator that can reach a seller and will not is the
phone-tree failure, and nothing in the specification or the catalogue makes
it worth the labour saved.

Unasked, the assistant offers a handover and does not make one. It offers
when it has run out of rule: what the person wants is something no rule
lets it do and no gesture lets them do either. Two of those are facts of
the state, and the suggestion strip reads them the same way it reads a
conflict or an incomplete specification
([The suggestions](../moves.md#the-suggestions)):

```
?s has reached the seller's door
  iff  Asserting: { ?s asserted: ?v -> ?o }
       and  ?v -> ?o is not met in ?s
       and  ?v is held for a reason in ?s by a clause ?c
       and  Specifying: { ?c negotiability: "fixed" }
  or   ?r is [ spec: ?s ; about: "conflict" ] and ?r is pending
       and  the last utterance about the question put for ?r
              is the person's reply, not an answer
```

The first is a requirement the person stated and will not relax, which the
catalogue cannot build as stated: the person has nothing to give, and the
assistant has no rule that moves the catalogue. The second is a conflict the
person replied to in words and left open, because the decision is not theirs
to make at the screen — *I'll ask facilities* — and a seller who knows the
building may know the answer. Both are read by the view, never by a rule,
and neither hands over on its own: they put *ask the seller* under the
composer, and the person says so or not.

The rest are not on the log. A question `look_up` cannot answer from the
seller's record, a term the stipulations do not cover, a discount, a date
the programme cannot reach: each is known in the turn and recorded nowhere,
so the prompt carries them. It tells the assistant to say what the record
does not settle and that someone at the seller can, in the same sentence,
and to hand over only when the person takes that up. What the prompt must
not do is offer the seller as the answer to a question the record does
settle, which is the referral the `look_up` instruction already forbids.

Strain is not a fact either. A person who has asked the same thing three
times is a reading over `Conversing` the assistant can make in the turn, and
the prompt tells it to offer the seller then, as it would in a shop. No rule
counts.

## Nothing is locked

A handover takes nothing away from the person. The specification stays
theirs to change, the open questions stay open, and a quote can still be
requested, because none of those rules reads `HandingOver`. A handover made
and then overtaken by the person's own work is still on record, with its
reason, and a second handover is a second record. The seller who takes one
up finds the specification as it is, which is the point of not freezing it.

## What is not here

_No rule performs `receive`._ The seller is a party and not an actor: no
surface of this application is theirs, as none is the catalogue manager's
([Gestures](gestures.md#what-a-gesture-is-not-allowed-to-be)), so nothing
carries a stimulus to `HandingOver/receive`. A handover here is a record the
person can see and link to, and the plan's own measure of it is one the
seller reports without instrumentation: whether they had to ask the person
to restate their situation. The action is in the concept so that a seller's
surface, when there is one, performs it under a rule of its own and the
canvas can say the handover was taken up.

_No rule hands over to anyone but the seller._ `to` is a constant in both
rules. The person who can relax an interval target is often not the person
at the screen, and the case notes that handover is not only to sales; a
third party is a party [Profiling](../concepts/profiling.md) does not hold
and a surface this application does not have, and the type parameter is
there for when it does.

_No rule asks the person before the model hands over._ The permission is
not an `ask`, and the turn does not wait on it. A handover is not a
question the turn cannot go past: it changes no value, and the person who
did not want it sees it on the canvas and says so. Making it an `ask`
would put the floor on hold for a confirmation of what they just said.

## See also

- [Handing over](../concepts/handing-over.md) — the concept
- [Conduct](conduct.md) — the model's other permissions, and what is withheld
- [Gestures](gestures.md) — the person's moves, as root actions
- [The moves](../moves.md) — which surface carries the offer and the record

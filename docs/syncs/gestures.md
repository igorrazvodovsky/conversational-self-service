# Gestures

What a person may do. See [the index](README.md).

Written in the same form as [the model's permissions](conduct.md), and meant to
be read beside them: the difference between the two lists is the whole of what
the model may not do.

## The rules

```
sync APersonStartsASpecification
when  { Copiloting/gesture: [ act: "start" ; spec: ?s ] => [] }
then  { Asserting/start: [ spec: ?s ] }

sync APersonSays
when  { Copiloting/gesture: [ act: "say" ; text: ?t ] => [] }
then  { Conversing/say: [ party: person ; text: ?t ] }

sync APersonAssertsAValue
when  { Copiloting/gesture: [ act: "assert" ;
          spec: ?s ; variable: ?v ; option: ?o ] => [] }
then  { Asserting/assert: [ party: person ;
          spec: ?s ; variable: ?v ; option: ?o ] }

sync APersonWithdrawsAnAssertion
when  { Copiloting/gesture: [ act: "withdraw" ; spec: ?s ; variable: ?v ] => [] }
then  { Asserting/withdraw: [ spec: ?s ; variable: ?v ] }

sync APersonDiscardsTheSpecification
when  { Copiloting/gesture: [ act: "discard" ; spec: ?s ] => [] }
then  { Asserting/discard: [ spec: ?s ] }

sync APersonAnswersAQuestion
when  { Copiloting/gesture: [ act: "choose" ;
          request: ?r ; option: ?o ] => [] }
then  { Deciding/choose: [ request: ?r ; option: ?o ] }

sync APersonDeclinesToAnswer
when  { Copiloting/gesture: [ act: "decline" ; request: ?r ] => [] }
then  { Deciding/decline: [ request: ?r ] }

sync APersonFocusesASurface
when  { Copiloting/gesture: [ act: "focus" ; surface: ?surface ] => [] }
then  { Moding/focus: [ workspace: workspace ; surface: ?surface ] }
```

## Where a chat message enters

`APersonSays` is the rule that puts what a person said into the log ahead of
what the model did with it, and it is [Conversing](../concepts/conversing.md)'s
only entry.

The stimulus does not come from the browser. A chat message posted as a second
HTTP request would race the model's run, so the ordering the rule exists to
establish would hold by luck; it is performed instead in `agent/hearing.py`,
which runs before the model node of the graph, so the ordering is one the graph
enforces. Three surfaces now perform a root action — a click (`webapp.py`), a
tool call (`tools.py`) and a chat message (`hearing.py`) — and all three do the
same nothing with it.

Only a person says anything. `Conversing/say` takes a party and no rule invokes
it with the machine, so the assistant's replies stay in CopilotKit's thread and
out of the log. That is an absence in this file, not a property of the concept.

## The gesture vocabulary is ours

`Copiloting/gesture` takes whatever the browser sends and returns it; it holds
no state and decides nothing. So the `act` values above — `start`, `say`,
`assert`, `withdraw`, `discard`, `choose`, `decline`, `focus` — are not defined
in the bootstrap concept, and there is nowhere else they could be defined
either. This file is their definition.

That is worth saying out loud because
[the two-tier policy](../method/boundaries.md#what-the-policy-does-not-excuse)
already makes the same point about the model's three tool names: shaped by
CopilotKit's conventions, and ours all the same. The person-side root action is
the exact parallel, and its vocabulary was for a while the one thing in the
model with no home. Eight acts, each named for something a person does, and the
granularity is the same argument as the tools' — a log of these says what
happened.

## The one asymmetry

`APersonAnswersAQuestion` has no counterpart in [Conduct](conduct.md). No rule
carries a `Copiloting/invoke` to `Deciding/choose`.

That single absence is what makes the model's proposals proposals. It can
compute the cheapest buildable lift that honours every assertion; the
assignment comes back as an option of a question; and the question is answered
by a person or by nobody. There is no prompt instruction to that effect, and
there does not need to be one.

## Why a click is not an endpoint

There is one HTTP route for everything above — `POST /configurator/gesture`,
carrying an `act` — and none for any concept action.

The temptation is a route per action: `POST /asserting/assert` reading
straight through to the concept. It would work, and it would break WYSIWID
§7.2's fourth design rule, because the browser would then be a second
initiator alongside the bootstrap. What the person did is *click something on
the canvas*. What follows from a click is a question for these rules, and
keeping it a question for these rules is what lets the answer change without
the browser being redeployed.

The starter this replaces got the same thing wrong in the other direction: its
frontend tool handlers called `setMode` directly (`useFrontendTool` →
`setMode("app")`), so a model-initiated change reached component state without
passing through anything nameable. Two initiators, neither encapsulated.

## What a gesture is not allowed to be

No `act` reaches `Cataloguing`, `Pricing` or `Footprinting`. A person using the
configurator cannot list an option or change a price for the same reason the
model cannot: nothing carries the stimulus there. Those are actions of a
catalogue manager, who is a different actor with a different surface, and this
application does not have one.

## See also

- [Conduct](conduct.md) — the same list, for the model, and the absences that matter
- [Propagation](propagation.md) — what happens after a value is asserted
- [Conversing](../concepts/conversing.md) — the concept `APersonSays` writes into
- [Code of conduct](../method/conduct.md) — why permissions rather than prohibitions

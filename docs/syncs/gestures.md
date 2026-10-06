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

sync APersonFilesADocument
when  { Copiloting/gesture: [ act: "file" ; name: ?n ; text: ?t ] => [] }
then  { Filing/file: [ party: person ; name: ?n ; text: ?t ] }

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

sync APersonShowsAFacet
when  { Copiloting/gesture: [ act: "show" ; facet: ?f ] => [] }
then  { Showing/show: [ lens: workspace ; facet: ?f ] }

sync APersonHidesAFacet
when  { Copiloting/gesture: [ act: "hide" ; facet: ?f ] => [] }
then  { Showing/hide: [ lens: workspace ; facet: ?f ] }

sync APersonFramesTheCanvas
when  { Copiloting/gesture: [ act: "frame" ; frame: ?f ] => [] }
then  { Framing/frame: [ lens: workspace ; frame: ?f ] }

sync APersonUnframesTheCanvas
when  { Copiloting/gesture: [ act: "unframe" ] => [] }
then  { Framing/unframe: [ lens: workspace ] }

sync APersonIntroducesThemselves
when  { Copiloting/gesture: [ act: "introduce" ; name: ?n ; organisation: ?o ;
          address: ?a ; email: ?e ; phone: ?p ] => [] }
then  { Profiling/introduce: [ party: person ; name: ?n ; organisation: ?o ;
          address: ?a ; email: ?e ; phone: ?p ] }

sync APersonEntitlesTheJob
when  { Copiloting/gesture: [ act: "entitle" ; spec: ?s ; title: ?t ; site: ?where ] => [] }
then  { Naming/entitle: [ item: ?s ; title: ?t ; site: ?where ] }

sync APersonStatesAClause
when  { Copiloting/gesture: [ act: "require" ; spec: ?s ; text: ?t ] => [] }
where { bind a fresh identity as ?c }
then  { Specifying/require: [ spec: ?s ; party: person ; text: ?t ; clause: ?c ] }

sync APersonSettlesAClause
when  { Copiloting/gesture: [ act: "settle" ; clause: ?c ; negotiability: ?n ] => [] }
then  { Specifying/settle: [ clause: ?c ; negotiability: ?n ] }

sync APersonRelaxesAClause
when  { Copiloting/gesture: [ act: "relax" ; clause: ?c ; text: ?t ] => [] }
then  { Specifying/relax: [ clause: ?c ; text: ?t ] }

sync APersonStrikesAClause
when  { Copiloting/gesture: [ act: "strike" ; clause: ?c ] => [] }
then  { Specifying/strike: [ clause: ?c ] }

sync APersonRewordsAClause
when  { Copiloting/gesture: [ act: "reword" ; clause: ?c ; text: ?t ] => [] }
then  { Specifying/reword: [ clause: ?c ; text: ?t ] }

sync APersonMovesAClause
when  { Copiloting/gesture: [ act: "move" ; clause: ?c ; before: ?b ] => [] }
then  { Specifying/move: [ clause: ?c ; before: ?b ] }

sync APersonRequestsAQuote
when  { Copiloting/gesture: [ act: "quote" ; spec: ?s ] => [] }
where { Constraining: { ?s settled: ?holds }
        every variable in Constraining.range is settled for ?s
        Asserting: { ?s asserted: ?v -> ?o } implies
          ?v -> ?o is met in ?s   — Propagation's calculation
        ?amount, ?months, ?recurring are Pricing's total over the values
          of ?holds on the catalogue basis, and it is complete
        Profiling: { person name: ?n }  — the proposal is addressed
        Naming: { ?s site: ?site }      — and says where the lift goes
        ?stipulated is the terms on the catalogue basis
        ?item is [ spec: ?s ; holds: ?holds ;
                   requires: the requirements of ?s ;
                   grounds: the grounds of ?holds in ?s ]
        ?terms is [ months ; recurring ; seller: the profile of seller ;
                    customer: the profile of person ;
                    title: Naming's title of ?s ; site: ?site ;
                    programme: Stipulating's programme on the catalogue
                      basis for the values of ?holds over ?months ;
                    ?stipulated… ]
        ?until is today plus ?stipulated's validity in days }
then  { Quoting/quote: [ item: ?item ; to: person ;
          amount: ?amount ; terms: ?terms ; until: ?until ] }

sync APersonCommitsToAQuote
when  { Copiloting/gesture: [ act: "commit" ; quote: ?q ] => [] }
where { ?on is today }
then  { Quoting/commit: [ quote: ?q ; party: person ; on: ?on ] }

sync APersonRevokesAQuote
when  { Copiloting/gesture: [ act: "revoke" ; quote: ?q ] => [] }
then  { Quoting/revoke: [ quote: ?q ] }
```

## Where a chat message enters

`APersonSays` is the rule that puts what a person said into the log ahead of
what the model did with it, and it is how a chat message enters
[Conversing](../concepts/conversing.md). The model's question and the
person's reply to it enter through the floor's rules
([Conduct](conduct.md#asking-and-waiting-for-the-answer)).

The person's stimulus does not come from the browser. A chat message posted as a second
HTTP request would race the model's run, so the ordering the rule exists to
establish would hold by luck; it is performed instead in `agent/hearing.py`,
which runs before the model node of the graph, so the ordering is one the graph
enforces. The person's own agent is the exception, and it orders the two
itself ([The person's own agent speaks in the chat](#the-persons-own-agent-speaks-in-the-chat)).
A click (`webapp.py`), a tool call (`tools.py`) and a chat message
(`hearing.py`) each perform a root action, and each does the same nothing
with it.

The `say` a chat message becomes carries the message's id and the
conversation's thread in its stimulus. No rule reads either. The view does:
the id is how the transcript finds the utterance a message became, so the
words in the chat have the utterance's address, and the thread is which
conversation to open to reach them, so the canvas can link to words said in
a conversation other than the one open ([What a view is](../ui.md#what-a-view-is)).
Words the person's agent said by gesture carry the thread too; their
message's id is the flow itself.

In the chat, only a person, or their own agent as them, says anything here.
`Conversing/say` takes a party, and the one rule that invokes it with the
machine records a question the model put, not its reply, so the assistant's
replies stay in CopilotKit's thread and out of the log. That is an absence
in the rules, not a property of the concept.

A document attached to the message enters beside it. `APersonFilesADocument`
carries it into [Filing](../concepts/filing.md), performed by the same module
in the same flow, after the words and before the model runs, so that a
reading of the document can cite it and the trace joins the two. What the
model reads from either is [Reading](reading.md).

### The turn is one flow

<a id="the-turn-is-one-flow"></a>
A person's message and the tool calls the model makes in reply are one
occasion, as the catalogue's arrival at boot is one, so the `say` opens a flow
and `agent/tools.py` performs every root action of that turn in it
(`agent/hearing.py` keeps the token per thread and hands it to the tools).
That is what makes the model's reading of the person's words a fact rather
than a sentence in its reply: *the person said "hospital, six storeys"* and
*the model asserted `building_type:hospital`* carry the same flow token. The
canvas reads the utterance off the assertion's flow (`agent/views.py`) and
shows it beside the value under the `how` facet — *the assistant read
"hospital, six storeys" as this* — in place of *the assistant asked for this*.
When the value answers a clause the model stated from those same words, the
clause beside it already carries them, and the sentence says only who read it
and where; the words come back the moment the value stops answering the clause.
No field records the link and no rule writes one; the trace holds it, which is
where the case's catalogue booked the record when it declined a concept for
the model call.

Three shapes were possible and two were declined. A relation in
[Conversing](../concepts/conversing.md) fails the purpose test: the concept's
purpose is order, and *what an utterance was taken to mean* is a second
purpose, so the note would need an "and". A concept of its own would be
written by a rule on `Copiloting/invoke` reading the latest utterance in its
`where`, which is the inference the flow already records, kept twice and
claiming more than is known: not that the model parsed those words into that
value, only that it asserted the value in reply to them. The shared flow
states exactly that claim, and it is read rather than recorded, so the actor
table in `CLAUDE.md` gains no row.

A gesture of the person's own agent opens a flow of its own, so nothing
joins it to any words and the canvas says *your agent asked for this* with
none. Nothing declines it, because nothing was asked. A person's click is the
same: a gesture opens its own flow, and a value the person asserted or
adopted carries no words.

### The person's own agent speaks in the chat

<a id="the-persons-own-agent-speaks-in-the-chat"></a>
The person's agent may also address the assistant, as the person would in
the composer. Its words take the other route in: the page performs them as
a `say` gesture under the actor `browser`, which `APersonSays` carries into
`Conversing/say` as it carries any `say`, and only once that has completed
does the page add the words to the chat as a message and run the assistant.
The message's id is the flow the `say` opened. Nothing races: the run starts
after the words are on record, because the page awaits the one before
starting the other.

`agent/hearing.py` then meets a message whose words are already on record.
It does not record them again. It takes the flow named by the message's id,
checks that a `Conversing/say` there carries the same words, and makes that
flow the turn's, as it does for [a reply in words](conduct.md#the-floor-is-carried-by-an-interrupt):
every tool call the assistant makes in reply runs in it. A message whose id
names no such utterance is heard as anything else in the chat is, as the
person's words.

So the trace reads the same for both speakers, and the actor on the `say`
is what tells them apart: the canvas says *the assistant read your agent's
"…" as this*, and an utterance a requirement was read from is shown as what
the person's agent said. No rule is added and none matches on the actor.

What a tool returns to the model is scoped the same way: the effects it
reports are those that followed the call, not everything in the turn's flow.

## A quote is requested

<a id="a-quote-is-requested"></a>
`APersonRequestsAQuote` is the rule with the longest `where` in this
application, and every line of it is a decision rather than transcription.
The readings it shares are named: `TheModelMayRequestAQuote` reads them
all, and the canvas reads the profile.

```
the profile of ?p
  =  [ name ; organisation ; address ; email ; phone ]
       each read from Profiling: { ?p name: _ ; … } where recorded,
       and left out where never given

the terms on ?b
  =  [ validity ; warranty ; approval ; installation ]
       read from Stipulating: { ?b validity: _ ; … }
     with byOthers: Stipulating: { ?b byOthers: _ }
     and  stages: for each ?st in Stipulating: { ?b stages: _ }, in order,
            [ upon ; event ; share ] of ?st
     and  clauses: for each ?cl in Stipulating: { ?b clauses: _ }, in order,
            its text, grouped under its section
```

```
the requirements of ?s
  =  for each ?c in Specifying: { ?s clauses: _ }, in order,
       [ clause: ?c ; text ; negotiability ;
         answeredBy: the values of Binding: { ?ch answers: ?c } ]

the grounds of ?holds in ?s
  =  for each ?v -> ?o in ?holds,
       [ standing: asked    when Asserting: { ?s asserted: ?v -> ?o }
                            and ?v -> ?o is met in ?s
                   yielded  when ?v was asserted softly and gave way
                   follows  when nothing is asserted for ?v ;
         asked:     the option asserted for ?v, when it differs from ?o ;
         party:     Asserting: { ?s assertedBy: ?v -> _ } ;
         owing:     each rule in Constraining: { ?s owing: ?v -> _ },
                      with its because ;
         following: Constraining: { ?s following: ?v -> _ } ;
         capital:   Pricing: { ?o capital: _ } ;
         monthly:   Pricing: { ?o monthly: _ } ]
```

None of these is a method of the concept it reads. `Profiling` and `Stipulating`
expose their relations, and assembling a record from them is the reader's
business, as it is in WYSIWID §5.5's `RegistrationResponse`. The rule reads
`Naming`'s title and site the same way. `agent/syncs/readings.py` holds the
one implementation the rules and the canvas share. The canvas also reads the
requirements and the grounds of the specification as it stands, so the quote
surface can compare an issued offer with what a quote requested now would
freeze.

The case catalogue's `Quoting.quote` *requires `valid` and `priced`*, and this
`where` is what that means here, with z3 standing in for the real solver: every variable settled,
nothing asserted left unmet, and [Pricing](../concepts/pricing.md)'s total
complete — which it is exactly when a term has been chosen rather than
presumed. A value held softly counts as met whether it was honoured or
yielded: a preference that gave way is not a requirement the offer fails,
and the proposal's basis of design shows the clause beside what the offer
supplies for it. A quote on a presumed term would be an offer resting on an assumption
the person has not made. A proposal is also *addressed*, so the `where` asks
more of it: that the person has given a name
([Profiling](../concepts/profiling.md)) and that the job has a site
([Naming](../concepts/naming.md)). When the `where` does not bind, the rule
declines to fire and the gesture does nothing, which is the ordinary meaning
of a `where`; the view says which condition failed, and the surface shows it
as the reason the control is disabled, so nobody presses a button that goes
nowhere.

The item is a value, not a reference: the specification's identity and its
settled assignment, copied, so that the offer says the same thing tomorrow
whatever the specification does. With the assignment go the requirements as
they stood, each with what answered it, and the grounds of every value: whether
it was asserted, gave way, or follows, who asserted it, the rules that force it
with their reasons, the assertions it rests on, and what it added to the price.
All of it is copied rather than read again later, because the catalogue is read
afresh at every boot and its rules and prices may differ by the time anybody
looks at the offer. The grounds are what lets the offer be read against what
was asked, the canvas's own question put to the specification as it stood. Who
performed each assertion, and whether it was adopted from a proposal, is a
provenance edge on the log and is not copied: the log does not change, and the
view reads it up to the record that issued the quote.

The amount is one sum — the equipment supplied and installed — read from
Pricing's arithmetic on the catalogue basis. The line prices in the grounds sum
to it; the proposal sent to the customer prints the sum and not the lines. The terms are copied the
same way: the seller's stipulations from
[Stipulating](../concepts/stipulating.md), both parties' profiles, and the
job's title and site as they stood, so that the document renders from the
offer alone and a change to any of them next month does not change a quote
issued this month.

The programme is copied too, as the answer Stipulating's `programme` gave at
issue: each milestone with its week from order, and the months of warranty
and maintenance after acceptance. Copying the periods it is reckoned from
would not be enough. The arithmetic that turns a handover promise and an
installation period into a dispatch week is the seller's, and a quote read
next year must place dispatch where the seller placed it when the offer was
made, whatever the seller reckons by then. With the stages' events beside it,
the offer can say what falls due when, and what the person must have done
by then, without anyone reading a date out of a label. A quote that holds no
programme is read as having none, and nothing reckons one for it.

The validity period is the seller's stipulation, read from the same basis.
`Quoting` holds no clock and takes the date as an argument, so the rule adds
the stipulated days to today and the concept would serve a different period
unchanged.

`APersonIntroducesThemselves` and `APersonEntitlesTheJob` are the addressee's. `APersonIntroducesThemselves`
carries whatever details the form sent — each field is optional, and a field
left alone stays as it was — and `APersonEntitlesTheJob` does the same for
the title and the site. Both are partial because a person gives their name in one message and
their company in the next, and a form is filled in one field at a time.

`APersonCommitsToAQuote` supplies `today` for the same reason, and the concept
does the comparison. `APersonRevokesAQuote` carries nothing but the identity.

## What the canvas shows is chosen

`APersonShowsAFacet` and `APersonHidesAFacet` carry a tick in a menu into
[Showing](../concepts/showing.md). They change no
fact of the specification: a facet names something a concept already holds,
and the act decides whether the canvas reads it. The lens is the workspace,
as the surface's workspace is in `APersonFocusesASurface`. Both have
counterparts in [Conduct](conduct.md#what-the-canvas-shows) on identical
terms, which makes them permissions both actors hold alike.

`APersonFramesTheCanvas` and `APersonUnframesTheCanvas` are the same shape
one concept over, into [Framing](../concepts/framing.md): which *items* the
canvas shows rather than which facts about each. The frame is a value the
click passes and the read side interprets, and the rule carries it without
looking inside. The values read are `[ by: "assertion" ; variable: ?v ]`,
which the page offers no control for — what an assertion forced is beneath
it on its line — and which the person's own agent may pass, `[ by: "clause" ; clause: ?c ]`,
from a control on a clause, and `[ by: "gap" ; gap: ?g ]`, from the filters
over the specification. Rules in
[Propagation](propagation.md#a-frame-goes-with-what-it-framed) take a frame
away when what it framed goes; a gap frame names no item, so nothing takes it
away, and once the gap closes it selects nothing and the canvas says so.

<a id="the-canvas-is-narrowed-to-one-requirement"></a>
### The canvas is narrowed to one requirement

A frame on a clause selects the variables whose asserted value answers it,
the values that follow from those, and every variable still open, since any
of them could answer it next. The read is `agent/views.py`'s, as the
assertion frame's is: the requirement's line with its answers and what they
forced beneath each, and the open variables that could still answer it at the
list's tail.

The same frame is the answering mode. While a clause frames the canvas, a
pick on an open variable is `APersonAnswersAClause` with that clause, and a
pick that changes a value already answering it is `APersonSubstitutesAnAnswer`;
with no clause framed, a pick is the bare `assert`. Which gesture the click
sends is decided on the surface from the frame it can see — the mode is a
fact of `Framing`, recorded, survives a reload, and reads the same whoever
put it there. The model may frame a clause
([Conduct](conduct.md#what-the-canvas-shows)) to bring one requirement in
front of the person; it cannot answer one, because no rule carries its
`invoke` into `Binding`, and framing does not change that.

<a id="the-canvas-is-narrowed-to-one-gap"></a>
### The canvas is narrowed to one gap

A gap is what the specification still lacks, and each kind is a frame value:
`open`, the variables nothing has settled; `unanswered`, the
clauses nothing answers, those left open on purpose excepted; and `unbound`,
the values asserted with no clause behind them, with what they forced. Each
is a rule over the current state, read in `agent/views.py`, so a frame on a
gap follows the state as it moves: answer the last unanswered clause and the
frame selects nothing.

What was asked for, what follows from it and what is open are kinds
of fact, not places on the canvas. Each item says which it is where it
stands — a value that follows sits under the assertions it
rests on, with the rule — but they are not three places. The specification
is one list: a line per requirement with what answers it, a line per value
answering none, and the open variables at its tail. A kind of fact is a
filter over that list, and a filter is a frame because it is a choice about
which items are shown, recorded, and the same for both parties.

## A clause is stated in the person's words

The rules on [Specifying](../concepts/specifying.md) carry a document's
edits and decide nothing: the concept holds the text as written, treats a
clause as fixed until it is settled otherwise, and refuses a relax on a
fixed clause itself. Nothing is asked of a clause as it is typed. What it is
for and how firmly it is meant come later, if at all: a line is a clause the
moment it has words, and the structure is added where it matters rather than
at entry. `APersonStatesAClause` names the party in its `then`, as
`APersonAssertsAValue` does, because `statedBy` is a fact the concept holds
and a rule that says who is stating is the readable form of it.

The person edits the specification as a document, and the editor's
transactions are stimuli and not writes: a block that appears is `require`,
one that vanishes is `strike`, changed text is `reword`, a changed order
`move`, a changed negotiability `settle`, and *relax* is a control pressed
on purpose. The mapping from
transaction to act is in `src/components/configurator/specification.tsx`
and it holds no state: the document renders the clauses, and holding its
JSON in a concept would be a whole-list setter one level up.

The words may name the catalogue. A `@` in the document offers its
individuals and values, and one picked is a reference in the clause, written
into the text as `[[id|label]]` — a variable's name, or an option's, which
names its variable already — and shown as a chip wherever the clause is
quoted. To `Specifying` it is words:
no relation of the concept points at a variable or an option, and nothing
here reads the token. A reference names; it does not answer. The person who
writes *at least [[1250 kg]]* has said what they mean in the catalogue's
terms without yet saying the lift must have it. What answers the clause is
still `answer`, below; the value's chip offers that act where the value was
named, and shows when it holds.

One more act on this side, `answer`, is the one that reaches
[Binding](../concepts/binding.md), and it is written up with its consequences
in [Binding](binding.md#a-person-answers-a-clause) because which rule
it fires is a fact of that concept's state. It is the slice 1 counterpart of
`assert`: the same click on the same option, carrying the clause it answers.

## The gesture vocabulary is ours

`Copiloting/gesture` takes whatever the browser sends and returns it; it holds
no state and decides nothing. So the `act` values above — `start`, `say`,
`file`, `assert`, `withdraw`, `discard`, `choose`, `decline`, `focus`, `introduce`,
`entitle`, `quote`, `commit`, `revoke`, `require`, `settle`, `relax`, `strike`,
`reword`, `move`, `show`, `hide`, `frame`, `unframe`, `answer` in
[Binding](binding.md), `keep` in [Reading](reading.md), and `reply` in
[Conduct](conduct.md#asking-and-waiting-for-the-answer) — are not defined in the bootstrap
concept, and there is nowhere else they could be defined either. This file is
their definition.

That is worth saying out loud because
[the two-tier policy](../method/boundaries.md#what-the-policy-does-not-excuse)
already makes the same point about the model's tool names: shaped by
CopilotKit's conventions, and ours all the same. The person-side root action is
the exact parallel. Each act is named for something a person does, and the
granularity is the same argument as the tools' — a log of these says what
happened.

## What only a person may do

<a id="the-two-asymmetries"></a>
`APersonAnswersAQuestion` has no counterpart in [Conduct](conduct.md). No rule
carries a `Copiloting/invoke` to `Deciding/choose`.

That single absence is what makes the model's proposals proposals. It can
compute the cheapest buildable lift that honours every assertion; the
assignment comes back as an option of a question, and each value in it the
rules leave open as a question of its own; and a question is answered by a
person or by nobody. There is no prompt instruction to that effect, and
there does not need to be one.

`APersonCommitsToAQuote` has the same shape one step later. The model may request a quote, as it may propose a completion; no rule
carries a `Copiloting/invoke` to `Quoting/commit`, so an offer is accepted by
the person or by nobody. Between them the absences say what the model is
for here: it can work out what to build and what it would cost, and it can make
neither of those yours.

### Whoever acts for the person

Every rule here matches on the act, never on the actor, so an act the
person's own agent sends is the person's act. That agent reaches the same
root action under the actor `browser`, and the asymmetries above hold
between the person and the seller's assistant, not between the person and
whoever they have asked to act for them. How much they delegate is theirs to
decide, in their own agent. See
[Conduct](conduct.md#the-persons-own-agent-acting-as-the-person).

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

The CopilotKit starter gets the same thing wrong in the other direction: its
frontend tool handlers call `setMode` directly (`useFrontendTool` →
`setMode("app")`), so a model-initiated change reaches component state without
passing through anything nameable. Two initiators, neither encapsulated.

## What a gesture is not allowed to be

No `act` reaches `Cataloguing`, `Pricing`, `Footprinting` or `Stipulating`.
A person using the configurator cannot list an option, change a price or
rewrite the seller's payment terms for the same reason the model cannot:
nothing carries the stimulus there. Those are actions of a catalogue manager
or a seller, who is a different actor with a different surface, and this
application does not have one. The person's own profile is the one thing on
the letterhead they can write, and the seller's is seeded at boot.

## See also

- [Conduct](conduct.md) — the same list, for the model, and the absences that matter
- [Binding](binding.md) — the `answer` gesture, and what follows from a clause being answered
- [Propagation](propagation.md) — what happens after a value is asserted
- [Conversing](../concepts/conversing.md) — the concept `APersonSays` writes into
- [Quoting](../concepts/quoting.md) — the concept the quote rules reach
- [Code of conduct](../method/conduct.md) — why permissions rather than prohibitions

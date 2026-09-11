# What is wrong with this one

Written now, because a conceptual model kept as a living artifact is the only
thing that makes a later substitution visible (MSM §5.1.3).

_The estimates are approximations wearing the clothes of results._ `Pricing`
reckons recurring charges over a presumed term; `Footprinting` charges a use
phase to three variables at once so no axis goes unweighted. Both are stated
in the notes and both are the sort of thing that gets quietly retuned while the
number on the screen keeps its name. The formulas are written down where they
can be diffed, which is the only defence available.

_Adoption has no inverse._ Adopting a completion states thirty-odd requirements
in one gesture and no single action unstates them. MSM §5.1.2's asymmetry test —
*is there an inverse action, and does it cost what the original cost?* — fails
here, and it is the cheapest real finding in this document.

_`Constraining` is two concepts sharing a purpose statement._ Its state splits
without residue: `range`, `scope`, `allows` and `because` are a rule book about
the product line, and `assumed`, `inclined`, `possible`, `settled`, `owing` and
`refused` are the state of solving one specification. The actions split the same
way — `offer`, `withhold`, `tabulate`, `imply` against `consider`, `assume`,
`incline`, `release`, `complete`, `forget` — and so do the actors. The first
group belongs to a catalogue manager, which is the exact reasoning that keeps
`Cataloguing`, `Pricing` and `Footprinting`
[out of the gesture list](syncs/gestures.md#what-a-gesture-is-not-allowed-to-be);
it was not applied here because the two groups share a concept, and nothing
after boot invokes the first. The purpose survives the ["and" test](method/objects.md#bad-smells)
only because it is written at the level of the whole. Splitting into a rule-book
concept and a per-spec solving concept would also dissolve the duplication that
[the ranges section](concepts/constraining.md#why-the-ranges-are-here-as-well-as-in-the-catalogue)
currently has to argue for. Not taken, because it is a redesign of the concept
the solver lives in rather than a repair.

_`Cataloguing`'s purpose has a comma doing an "and"'s work._ "To say what may be
ordered, in terms a person can recognise" is availability and recognisability,
and `offers`/`list`/`delist` do the first while `heading`, `family`, `label`,
`note`, `describe` and `annotate` do the second. That the note applying the
smell test most sharply — to `elevator.json`, all three smells — does not apply
it to itself is the sort of thing this section exists for. The counter-argument
is real: a catalogue is arguably one coherent thing, and naming an option nobody
may order is of no use. Recorded unresolved, and tied to the split above, since
moving availability into the rule book is what would settle it.

_A conflict question outlives the conflict._ Withdraw one of two clashing
requirements directly, rather than by answering the question about them, and the
question stays open offering a requirement that is already gone. Discarding the
specification withdraws its questions
([`ADiscardedSpecificationsQuestionsAreWithdrawn`](syncs/propagation.md#a-discarded-specification-leaves-the-solver));
nothing does the same when the conflict merely stops being one. The machinery to
fix it exists — `Deciding/withdraw`, and a rule on `Asserting/withdraw` — and
what is missing is a decided answer to *when does a question stop needing an
answer*, which is a design question rather than an oversight.

_One specification, no name, no revisions, no comparison._ A configurator sold
to anyone needs all four, and each is a concept rather than a field.
Deliberate scope, [recorded](concepts/README.md#not-concepts) rather than
overlooked. Since 2026-09-11 a [quote](concepts/quoting.md) holds the one
snapshot the application cannot do without, and it shows where the scope
decision bites: two quotes can be read side by side, and nothing can say what
changed between them except a person reading two lists.

_A quote outlives the specification that produced it, and nothing says so on
the canvas._ Discard the specification and start again and the quotes from
before are still there, every one of them differing from the empty canvas in
every value. That is correct — an issued offer is not unissued by the buyer
starting over — and it is also the first place where *one specification per
session* is visibly a lie, since the quotes are the record of there having
been more than one. The repair is a name for a specification, which is the
concept above.

_The seller is a letterhead and not an actor._ Since the proposal was made
real (2026-09-11, later the same day) the seller has a name, an address and
a set of stipulated terms, all seeded at boot from the catalogue file and
reached by no gesture and no tool. A quote is still issued by a rule, to the
person, whoever asked, and `revoke` is still performed by the same person the
offer was made to — a buyer declining rather than a seller withdrawing. What
changed is that the absence is now visible on the page: the proposal is signed
for by a company nobody in this application can act as. A seller's surface
would be the third actor, and it is the same third party
[§9.3](#9-against-the-cases-catalogue) says would settle `assertedBy`.

_A profile can be overwritten and not erased._ `Profiling/introduce` is
partial by design and has no inverse, so a person who gave a phone number
cannot take it back. MSM §5.1.2's asymmetry test fails, and it is left
failing because the repair — a `forget [party; detail]` — was not worth a
concept action nobody asked for. Recorded so that it is a decision.

_A choice's value is already in the model's vocabulary._ Since 2026-09-11 a
person can say what a value is for, and the value they say it of is a
catalogue option, picked from the canvas. `Binding.answers` therefore spans
the whole distance between the buyer's words and the model's on its own, and
the plan's first prediction — that a form yields values, not requirements —
is a property of this build by construction rather than something it can
disconfirm. The counts *unanswered* and *unbound* on the canvas are the
measure; what would change the finding is a `Value` that is not an option,
which is slice 3.

_The editor cannot undo a strike, and does not try._ The specification is
edited as a document (Tiptap, since 2026-09-11, later the same day), and a
document editor's undo is a change to the document, which here is a
rendering: undoing a strike would be a `require` of a new clause with the
old words and none of the old answers. So the editor carries no undo
extension, keyboard deletion is confined to one clause at a time, and the
inverse of `strike` stays missing in the concept where the asymmetry test
would put it. Recorded so that the missing action is a decision.

_Two clauses can be answered by one value, and one clause by several, and
nothing says whether that is right._ `answers` is many-to-one from choices,
so *fits a bed* and *carries sixteen* may both be answered by one rated load,
and *fits a bed* may be answered by a rated load and a car size together.
Both are legitimate and neither is distinguishable from a person clicking
twice. The catalogue's `affects` is where the second would be recorded, and
it is not built.

_The prompt still carries one sentence a rule cannot._ `TheModelMayIntroduceThePerson`
lets the model write the person's name, and nothing in the rule can tell a
name the person gave from one the model made up; *record only what they
said* is a sentence in `SYSTEM_PROMPT`. The case's `Reading` is what would
replace it — a candidate the person confirms — and it is slice 2.

_The facets are the developer's list, and the assistant's reshaping of the
canvas is a permission with no gate._ Since 2026-09-11 (later still) a person
chooses which facts the canvas shows beside each item, and the model may do
the same when asked ([Showing](concepts/showing.md)). Two things to say
against it. The seven facets are named at boot by the application, and a
person cannot compose one — which is Min et al.'s complaint at one remove,
since the developer still decides what *can* be shown; it is left so on
purpose, because a facet the model could invent would be a computed
attribute, and a number the model produced is the thing this design keeps
out. And `TheModelMayShowAFacet` is the first permission granted on the
model's own reading of a request, with no question put to the person: a
hidden facet is one click back, so the asymmetry that gates a completion was
not worth its banner here. Whether a person experiences the assistant
reshaping their canvas as help or as intrusion is not something a rule can
settle, and the log now records enough to look.

_The engine is a subset._ It provides the log, flows, provenance and
once-only firing; it does not parse `when`/`where`/`then`. A reader therefore
holds two representations of every rule — the notation in
[`syncs/`](syncs/README.md) and the function in `agent/syncs/` — and nothing
checks that they agree. That is the honest cost of not building a matcher.

_Persistence is replay, and the once-only edges never earn their keep._
WYSIWID's engine keeps concept state in a database and re-evaluates the log at
reboot, and the edge guard is what makes that safe. Here concept state is a
Python dictionary, so since 2026-09-11 the log is the only thing kept
(`agent/journal.py`): the file is replayed at boot with every rule silent,
because every derived completion is already in it, and the edges are restored
for a re-evaluation that never happens. Two consequences worth stating. The
journal starts at the boot mark, so a catalogue edited under a journal is
applied to a specification made against the old one, with the concepts
validating nothing and only a completion that now fails where it once
succeeded reported. And a journal is one file per running instance, which is
the same scope decision as one specification per instance
([`wiring.py`](../agent/wiring.py)) and will have to move with it.

_Recomputation is quadratic in the worst case._ Adopting a completion issues
about thirty `assert`s, each triggering a full propagation, and takes roughly
two seconds. Acceptable for a deliberate action, and it is a consequence of
insisting that thirty requirements are thirty actions rather than one.

_Three of the four design rules are satisfied by construction._ The engine
makes them awkward to break, which is a property of the engine and not
evidence about the concepts.

## 9. Against the case's catalogue

<a id="9-against-the-cases-catalogue"></a>
This repository is one artefact of a discovery case, and from 2026-09-08 it is
read that way: the case's discovery represented in code. The case lives in an
Obsidian vault at
`~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/`,
and its concept layer — twenty-two concepts in `Ontology/Concept catalogue/`,
composed in `Ontology/Synchronisations.md`, built in the order
`Prototype plan.md` gives — is the source this repository's `docs/concepts/`
are downstream of.

The rule of precedence, stated once. The case is built from the *job*: the
buyer's work, means-free, and what it needs the machine to hold. This
repository is built from the *software*: a starter's code, its misalignments,
and what a configurator has under the hood. Both are true and the job wins.
A divergence between the two enters the case's catalogue by one of three lanes
and by no other route: grounded in the job, and the catalogue changes;
a fact about software, and it lands in the case's software phenomena or its
step 1 table, never in the catalogue directly; grounded in neither, and this
repository conforms at whichever slice the catalogue's concept is built.

### 9.1 The mapping

| Here | In the catalogue | What differs |
|---|---|---|
| `Specifying` | `Specifying` | Built 2026-09-11 from the catalogue. `text`, `discipline`, `statedBy`, `negotiability`, `formerly`; no `quantity`, `class` or `serves`, each left for the slice whose action produces it. The action is `require` because the engine owns `state`. `strike` added on the asymmetry test. No `Situation`: the givens are still variables |
| `Binding` | `Binding` — the defining concept | Built 2026-09-11 from the catalogue. `for`, `against`, `choices`, `value`, `answers`, `decidedBy`, `replaces`, `reason`; no `affects`. `Value` instantiated with a catalogue option, so the mapping is the identity and `Mapping` is not needed — the plan's *mapping is done by the person*. `retract` added on the asymmetry test. Every choice is the person's; no `Suggesting` on top |
| `Asserting` (was `Specifying`) | `Asserting` — the concept the catalogue took from this build | Conformed 2026-09-08, notes and code. Holds a value in the model's vocabulary with who asserted it; the catalogue's `Specifying` holds a clause in the buyer's. `prefer` gone; `assertedBy` added and read by nothing. Since 2026-09-11 reached from `Binding/propose` by `AChoiceReachesTheAssertions`, the catalogue's `ApplyMapping` with the mapping the identity |
| `Constraining` | `Configuring` | `because` is provenance as a sentence, not a `Kind`; `complete` with a cost function has no counterpart; §8 already says this is two concepts, and the rule-book half is the model's authoring side, outside the case |
| `Cataloguing` | `Configuring.inDomain` plus model metadata | This is the case's step 1 row *attribute semantics beyond a label*, answered for a stand-in engine: labels and a family, nothing more |
| `Pricing`, `Footprinting` | `Configuring.price`; nothing | Service level and support term are variables here, which confirms the case's reading that the market models terms as attributes |
| `Deciding` | `Suggesting` | Instantiated for a conflict and for a completion, not for an inferred clause or an interpreter-proposed choice. Its conflict answer is *withdraw an assertion*; the catalogue's is `Binding.substitute`, which keeps the requirement and needs `answers` and `serves` |
| `Quoting` | `Quoting` — the product's own, one line, never specified | Built 2026-09-11 for the stand-in engine, as `Constraining` is for `Configuring`. `quote` and `commit` under the catalogue's names; `from` holds a *value* — the settled assignment copied — because there is no `Configuration` to point at; `revoke` added on the asymmetry test; `commit` performed on the canvas where the product has it outside. `Agreeing` deliberately not built — see below |
| `Stipulating` | `Quoting.terms`, one fact | The catalogue folds the conditions of an offer into one relation of the quote. Here they are a standing concept on Pricing's `Basis` — payment stages, warranty, programme, work by others, clauses — copied into each quote at issue. A fact about what a proposal contains, read from two real ones; offered as *a fact about software* |
| `Profiling`, `Naming` | `Account` (outside the case); nothing | The letterhead half of an account, and a title and site for the one specification. Neither is in the catalogue; both are what a proposal needs before it can be addressed. `Naming` is the §8 *one specification, no name* concept, built |
| `Copiloting` — `gesture`, `invoke` | `Conversing` — one symmetric `say` | Two root actors here; the model still initiates. Since 2026-09-08 the buyer's `say` *is* in the log — `Conversing` is built — but it is not the only entry, and no rule invokes the machine's half. Recorded in the case as a rival composition |
| in the system prompt | `Reading`, `Mapping`, `Situating`, `Stepping` | *State the context first; a city implies a region; a storey count implies a travel height* — a task model, a mapping and the given/attribute split as English to a model, which §7 of this document (finding 4) names as the starter's failure |
| absent | `Staling`, `Revising`, `Agreeing`, `Handing over` | §8's *adoption has no inverse* and *one specification, no revisions* |
| the canvas | `Rendering` with one `move` | The ledger as an object; the case's Direction question 3 answered by default. Since 2026-09-11 the requirement ledger is a section above the three, and the same read frozen into a quote is the proposal's basis of design |
| `Showing` | `Rendering`'s content, held | Which facts the canvas shows beside each item, chosen by the person or the model and kept. The case's `Rendering` is stateless by design and a shown facet persists, so this is state beside it that `render` would read. Taken from Min et al. (CHI '25) and Meridian (UIST '25), not from the case; what bears on the case is their finding that twelve people given one default made twelve overviews, which turns the case's Direction question 3 — the ledger as an object or per move — from a default into something the log can measure |
| `Framing` | `Rendering` with one `move` narrowed | Which items the canvas shows: what followed from one assertion, or everything. The frame is a value; one kind is built. This is the case's Direction question 3 answered a second way — the ledger as an object *and* per question — with the log recording which a person reaches for. The read behind it, `Constraining.following`, is the entailment traced back to the assertion it rests on, which principle 1 asks for and the null build could not show |
| `Moding`, `Theming`, `Scheduling`, `Querying` | — | Starter surface, outside the case |

### 9.2 Coverage

Three verdicts per concept of the case's catalogue: *built* (a concept module
and rules), *in prompt* (the behaviour exists as a sentence in `SYSTEM_PROMPT`
or in a tool description), *absent*. The `concept-coverage` skill re-runs this.

| Verdict | Concepts |
|---|---|
| built | `Configuring` (as `Constraining` + `Cataloguing` + `Pricing`), `Asserting`, `Specifying`, `Binding`, `Conversing`, `Suggesting` (as `Deciding`, two of its four uses), `Rendering` (one move, with the ledger column since 2026-09-11), `Quoting` |
| in prompt | `Reading` (the model reads the message and calls `assert_value`), `Mapping` (*a city implies a region*; for the person's own picks the mapping is the identity and needs no concept), `Situating` (context as variables, stated first), `Stepping` (*state the context before anything else*) |
| absent | `Diagnosing` beyond the *model rule* kind (`refused`, `culprits`), `Staling`, `Revising`, `Agreeing`, `Handing over`, `Deriving`, `Narrowing`, `Recalling`, `Complying` |

`Specifying` and `Binding` moved from *absent* to *built* on 2026-09-11, by
§9.4's item 5, and with them this build became the case's slice 1 in concept
set — six of the catalogue's concepts plus the ones the proposal needed —
though not in composition, since the model is still a root actor (item 4).
`agent/concepts/specifying.py` holds `open`, `clauses`, `text`, `discipline`,
`statedBy`, `negotiability` and `formerly` with `open`, `require`, `settle`,
`relax`, `strike` and `close`; `agent/concepts/binding.py` holds `selections`,
`for`, `against`, `choices`, `value`, `answers`, `decidedBy`, `replaces` and
`reason` with `begin`, `propose`, `substitute`, `retract` and `abandon`. Four
gestures in `agent/syncs/gestures.py` reach `Specifying`; the `answer`
gesture and nine rules in `agent/syncs/binding.py` carry a person's pick into
`Binding`, a choice into `Asserting`, and a withdrawn, overwritten or struck
answer back out. No rule reaches either concept from a `Copiloting/invoke`.
The read side — the ledger, the `answers` on each variable, the `unanswered`
and `unbound` counts, the `required` list in the model's digest — is in
`agent/views.py`; the canvas gains a *Required* section
(`src/components/configurator/clauses.tsx`) with an answering mode, and a
quote's item carries the clauses as they stood so the proposal's basis of
design renders from them (`document.tsx`). Verified through the engine for
the whole chain, including the three retractions and a quote, and in the
browser for the person's path: a clause stated, answered with a car size
from the canvas, the assertion shown as *answers a requirement* with the
clause beside it, and the entailments following. The proposal's basis of
design has been read from the view and not yet looked at as a page.

Later the same day the form became a document. `Specifying` gained
`reword`, `classify` and `move` — a correction, a change of discipline, a
change of order, none of which the form had needed and all of which a
document does at once — and the canvas renders the ledger as a Tiptap editor
whose schema is clause nodes only (`src/components/configurator/specification.tsx`).
The editor's transactions are mapped to gestures on settle or blur, in
document order, and the view is written back into it only while it is not
focused. Verified in the browser: two clauses typed with Enter between them
became two `require`s on blur, a change to the text a `reword`, a click on a
discipline a `classify`, and select-all with Backspace struck both clauses —
which is what a document does and not what a specification should, and is
now refused from the keyboard. Whether a buyer *reorders* is what `move`
now lets slice 1 observe; the catalogue holds clauses as a set, and the
finding is offered as *grounded in the job*.

The caveat that goes with the verdict, and it is the plan's own: a choice's
value is a catalogue option, so `answers` carries the whole distance between
the two vocabularies on its own, and whether a person given a place to say
what a value is for uses it is what slice 1 measures. The two counts exist
for that.

`Quoting` moved from *absent* to *built* on 2026-09-11, by §9.4's item 8.
`agent/concepts/quoting.py` holds `quotes`, `from`, `issuedTo`, `amount`,
`terms`, `until`, `committed` and `revoked` with `quote`, `commit` and
`revoke`; `APersonRequestsAQuote`, `APersonCommitsToAQuote` and
`APersonRevokesAQuote` in `agent/syncs/gestures.py` and
`TheModelMayRequestAQuote` in `agent/syncs/conduct.py` reach it, and no rule
reaches `commit` from a `Copiloting/invoke`. The read side — standing,
`differs`, `quotable` — is in `agent/views.py`. The offer is the second
surface `Moding` offers, beside the canvas (the chat left `Moding` later the
same day; see [Moding](concepts/moding.md#what-is-not-a-surface)):
`src/components/configurator/quotes.tsx` shows one quote at a time as a
commercial proposal (`document.tsx`), `AnIssuedQuoteIsShown` in
`agent/syncs/propagation.py` gives it the viewer's attention when a quote is
issued, and the same document is printable on its own at
`src/app/quotes/[quote]/page.tsx`. Later the same day the proposal was made
to read as a real one, against two manufacturers' documents: three concepts
were added for what it needed — `Stipulating` (the seller's terms, seeded),
`Profiling` (both parties, the seller's seeded and the person's written by
gesture or tool) and `Naming` (the job's title and site) — and the issuing
rule's `where` now requires a name and a site and copies all three into the
offer. Verified through the engine and in the browser for the person's path;
the prompt sentences for `quote`, `introduce` and `entitle` were added to
`SYSTEM_PROMPT` at the same time, and whether the model uses the tools well
is not something this section can say.

The caveat that goes with the verdict: the catalogue's `Quoting` is *existing*
— a concept the product has — so building it here is building a stand-in, as
`Constraining` is, and the verdict says the stand-in exists. It says nothing
about Tacton's quote API, which is the same **[unknown]** the catalogue's note
stops at.

Both `Asserting` and `Conversing` changed row on 2026-09-08, by §9.4's items 2
and 3, but only one of them changed verdict.

`Asserting` was already *built*; what moved is its evidence, since it is now
built under its own name. `agent/concepts/asserting.py` holds `open`,
`asserted` and `assertedBy` with `start`, `assert`, `withdraw` and `discard`;
`APersonAssertsAValue` and
`TheModelMayAssertAValue` in `agent/syncs/gestures.py` and
`agent/syncs/conduct.py` invoke the second, and `AssertionsReachTheSolver` in
`agent/syncs/propagation.py` carries it to `Constraining/assume`. The caveat
that goes with the verdict rather than against it: an assertion still answers
nothing, because no clause exists to answer.

`Conversing` is the verdict that moved, from *absent* to *built*.
`agent/concepts/conversing.py` holds `utterances`, `by` and `text` with one
action `say`; `APersonSays` in `agent/syncs/gestures.py` invokes it; and
`agent/hearing.py` performs the stimulus before the graph's model node, so the
log's first completion for a turn is `Conversing/say` by the person and the
model's `Copiloting/invoke` comes after it. Verified through the whole path —
CopilotKit runtime, AG-UI, the graph — and not only by calling the hook.

Three caveats, and the third is the one that matters. It is a single instance
where the catalogue has `Conversing[?s, ?p]`. No rule invokes `say` with the
machine as the party, so the assistant's half of the conversation is still
CopilotKit's thread and not the record. And *only a chat message is a `say`*:
a click on the canvas is a `Copiloting/gesture [act: "assert"]` reaching
`Asserting/assert` directly, so the property this concept was built for — the
log's first entry for a turn is what the person said — holds for typed turns
and not for clicks, which are how most values actually get set. That last one
is a divergence from a named rule and is written up as such below.

The structural audit in §3 passes and this one does not, and that is the
reason both exist. Four of the case's concepts are sentences in a prompt, which
the four design rules cannot see.

### 9.3 Where this build sits, and what the case took from it

Neither the case's step 2 (the null: chat, a model, tools wired to the solver)
nor its slice 1 (six concepts with `Binding` at the top). The null's chain with
three additions — the assertion held apart from the entailment, a conflict and
a completion put to the person, provenance on every action — and `answers`
absent. The case's `Prototype plan` runs its five pre-registered predictions on
the build *as it stood* — which since 2026-09-08 means the branch
`null-with-attribution`, at the commit before items 2 and 3 below were carried
out, and not `main`. That branch is the only place the
`say → (model) → require → assume` chain still exists to be measured, and it is
kept reachable for that reason and no other. `main` has items 2 and 3 done and
items 1 and 4 to 7 outstanding, so it is neither the null nor slice 0: the
buyer's words are in the log and the model is still a root actor.

Three things the case took from the build, each by its lane. *Grounded in the
job:* the assertion apart from the entailment, which the job's fact table
already kept apart and the catalogue had folded into `Binding` — now the
concept `Asserting`, and a slice 0 beneath slice 1. *A fact about software:*
that the product's `holds` conflates set and solved values; that a solver may
or may not offer `clear`, soft constraints and an optimise call — four new rows
in step 1, and the probe reframed as a diff of `Constraining`'s signatures
against Tacton's API. *Grounded in neither:* the model as a root actor, which
is the framework's default and is recorded as a rival composition, declined.

What the regeneration found that the specifications had not anticipated, on
2026-09-08. Three things, in descending order of how much they would change if
taken to the case. First, `Asserting.assertedBy` is written by every rule that
asserts and read by nothing — not by a `where` clause, not by `views.py`, not
by a component. The canvas's three sentences come off the provenance edge, and
the edge is *finer* than the relation: `APersonAssertsAValue` and
`AnAdoptedCompletionBecomesAssertions` are two different things a person did
and both write `person`, so in this build `assertedBy` carries no information
the log does not already hold, and holds it more coarsely. That is a question
for the case's `Asserting` note rather than a verdict on it — the note justifies
the relation as *`assertedBy (assertion, interpreter)` for the configurator's
audit*, and with a trace that carries the rule name, party-at-grain is derivable
from the trace in the working composition too, where `ApplyMapping` writes
`party: interpreter` and the rule name already says so. Recorded as state that
earns its place prospectively rather than now, and the thing that would settle
it is a third party. Second, removing `prefer` left a rule that is
registered and reached by nothing, and there was no third option between
deleting `Constraining/incline` and keeping an action the specification no
longer has — so the dead rule is kept with its reason written into
[`docs/syncs/propagation.md`](syncs/propagation.md#the-rule-that-is-registered-and-reached-by-nothing),
against the case's step 1 answering whether the real solver takes a soft
constraint at all. It costs a tuple comparison per dispatch and nothing else,
and it is the first thing in this repository that is deliberately unreachable.
Third, and the one to take to the case: a click does not go through
`Conversing`. `Synchronisations` states the slice 0 rule outright — *one more
rule lets a person assert directly from a rendered component: `Conversing/say`
with structured text naming an attribute and a value, `then Asserting/assert`,
and it is the rule slice 1 replaces*. This build does not have that rule. A
click is a `Copiloting/gesture [act: "assert"]` carried straight to
`Asserting/assert` by `APersonAssertsAValue`, and `Conversing` is reached only
by a typed message. So the log records what a person *typed* before the model
acted on it, and records nothing at all of what a person *clicked* — which is
the majority of how values are set here, and which is exactly the half the
concept was meant to cover. Not built now on purpose: item 3 says nothing else
fires from the say yet, and rerouting the click is item 4's chain. It is a
divergence from a named rule and it needs a lane. The reading offered, for the
case to accept or reject: *grounded in neither* — the catalogue's `Conversing`
note already says a structured form and a click on a rendered component are
both a buyer's `say`, so the catalogue covers it and this repository is the
thing that should conform, at whichever slice the rule is built.

A fourth, smaller: `Conversing` could not be entered from the browser at all.
A chat message posted as a second HTTP request races the CopilotKit run, so the
ordering the concept exists to establish would have held by luck; it is
performed in `agent/hearing.py`, before the graph's model node, which makes
`hearing.py` a third surface performing a root action beside `webapp.py` and
`tools.py`. A fact about the framework rather than about the concept.

What building `Quoting` found, on 2026-09-11. Four things, each with the lane
it is offered in.

First, and the one to take to the case: *the catalogue's `Quoting` cannot be
written against a mutable configuration.* Its `from: Quote -> Configuration`
presumes that a configuration is something a quote can point at and find
unchanged later, which is true of a product that versions configurations and
false of this build, which has one. The concept here therefore holds the
assignment as a *value*, copied at issue, and `Item` is a type parameter so
that a product with versioned configurations could pass a reference instead.
Which of the two the real product does is a step 1 row — *retention of a
previous configuration state* — that the catalogue already has, and this is a
second thing that row decides. Offered as *a fact about software*.

Second, `commit` is performed inside this build and outside the product. The
catalogue records `commit` as *outside the product* on the Lino source, and
here it is a gesture on the canvas, because there is nowhere else for it to
be. That is the same kind of fact: where the product's boundary falls, not
what the concept is. Offered as *a fact about software*, and it would land in
the seam table as a row.

Third, `revoke` is not in the catalogue, and the asymmetry test put it here.
Whether it is the seller withdrawing an offer or the buyer declining one is
undecidable in a build with no seller; [§8](#what-is-wrong-with-this-one) says
so. Offered as *grounded in neither* — this repository conforms to whatever the
case decides, and the case decides it by observing a dealer, which is step 0.

Fourth, `Agreeing` was considered and not built, on the catalogue's own
argument: `void` fires when the item changes, and a quote never changes. The
one thing this build wanted from `Agreeing` — a qualified acceptance — is the
thing that needs conditions with owners and dates, which need `Binding` to be
about anything. The dependency arrow held, and the concept stays on the
horizon. Not a divergence; recorded so that the next person who wants an
*agreement* concept here finds the reason it is `Quoting.commit`.

What building `Specifying` and `Binding` found, on 2026-09-11. Five things,
each with the lane it is offered in.

First, and the one to take to the case: *the catalogue's `Specifying.state`
cannot be an action name in this engine*, because `state` is the method every
concept exposes its relations through and the engine reads it for every
`where`. The action is `require` here, on the precedent of `Naming/entitle`.
A fact about software, and a small one; recorded because the catalogue's
name will be read against this code.

Second, *the mapping is the identity, and no `Mapping` was needed.* The plan
says slice 1's mapping is done by the person, and in code that means the
person picks an option, `Value` is instantiated with it, and one rule reads
which variable offers it. `Mapping.realises` would be a relation whose value
is always its key. Offered as *grounded in the job*: it is the plan's own
first prediction — that a buyer given a form states values, not requirements,
so `answers` restates the value — made structural, and the two counts on the
canvas are the instrument for it. The concept arrives with slice 3 as
designed, when the value stops being an option.

Third, *two actions the catalogue lacks and the asymmetry test demanded*:
`Specifying/strike` and `Binding/retract`. Neither is reached by the model.
`retract` is reached by no gesture either — three rules invoke it, on a
withdrawn value, an overwritten value and a struck clause — and the second of
those is where the model's standing as a root actor shows: a model assertion
on a variable whose value answered a clause retracts the person's answer, by
rule, with the edge saying so. That is constraint 7 met by a rule and not a
gate. Both offered as *grounded in the job*.

Fourth, *the root did not move.* The catalogue's `BeginConfiguring` opens the
configuration from the selection; here `Asserting/start` is still the boot's
root and `Specifying/open` and `Binding/begin` hang off it. Same shape, other
direction, and the direction changes when a person's first words open a
specification — slice 2. *Grounded in neither*; this repository conforms
then.

Fifth, *§9.4's item 4 conflated two slices*, and the plan itself is ambiguous
in the same place. Item 4 called demoting the model *slice 1*; the plan's
ladder has slice 1 without `Reading` and puts `Reading` in slice 2, while its
step 2 says the build becomes *slice 0* by demoting the model. Read together:
slices 0 and 1 have no language model in them at all, and the model returns
as a function in slice 2. So item 5 could precede item 4, and did. Item 4 is
reworded below; the plan's step 2 is the case's to reword.

### 9.4 What to change, in order

Each item names the skill that does it. Specification first, then regenerate;
do not patch `agent/` by hand.

1. **Run the null's measurements before anything else.** *Outstanding; run on
   the branch `null-with-attribution`, not on `main`.* Against one product model
   and one dealer task, take the five observables in the case's `Prototype plan`
   step 2 from the build as it was. That branch is the only place the
   `say → (model) → require → assume` chain still exists to be measured. Throw
   the numbers into the case, not the code.
2. **Regenerate `Asserting` from its specification** (`concept-generate`). *Done 2026-09-08 — see §9.2 and the last paragraph of §9.3.*
   `agent/concepts/specifying.py` becomes `asserting.py`: class `Asserting`,
   state `open`, `asserted`, `assertedBy`; actions `start`, `assert_`,
   `withdraw`, `discard`; `prefer` and `preferred` removed. Python reserves
   `assert`, so `wiring.py` registers `setattr(instance, "assert", instance.assert_)`
   after discovery; `agent/engine/` is not edited. Every rule in
   `agent/syncs/` that names `Specifying` or `require` follows
   (`concept-sync`), and the rule names may follow the vocabulary —
   `APersonAssertsAValue`, `TheModelMayAssertAValue`, `AssertionsReachTheSolver`
   — with `views.py`'s `HOW` map updated to match. `PreferencesReachTheSolverSoftly`
   and `Constraining/incline` stay in the code but no rule reaches them until
   the case's step 1 says the real solver has soft constraints; note the dead
   rule in `docs/syncs/propagation.md`. `agent/tools.py`: `require` becomes
   `assert_value` or similar, `prefer` goes, and the docstrings stop saying
   *requirement*. The canvas strings in `src/components/configurator/` change
   from *You asked for* to *Asserted*. 
3. **Record the buyer's words.** *Done 2026-09-08.* Add a concept `Conversing` per the case's
   catalogue — one action `say [party, text] => [utterance]`, state a sequence
   with `by` and `text` — and make the submitted chat message a
   `Copiloting/gesture [act: "say"]` that a rule carries into `Conversing/say`,
   before the model sees it. Until step 4, nothing else fires from it; the point
   is that the log's first entry for a turn is what the person said, not what
   the model did with it. (`concept-spec`, then `concept-sync`, then generate.)
4. **Demote the model.** This is the case's slice 2 — not slice 1, as this
   item said until 2026-09-11; see the fifth finding in §9.3 — and it
   changes the graph.
   The model's tools go; in their place `Reading.read` is one structured call
   per utterance, invoked by a rule `Hear` whose `when` is a person's
   `Conversing/say` and whose `where` binds what the spec already holds, and
   which returns candidate clauses. Rules propose the candidates into
   `Specifying` and mark them in `Suggesting`; a confirmed clause becomes a
   `Binding/propose`; the person's pick in a component becomes a
   `Binding/propose` that names its clause; `Mapping` is the person until slice
   3; `ApplyMapping` invokes `Asserting/assert`, and only
   `AssertionReachesTheSolver` invokes `Constraining/assume`. `Copiloting/invoke`
   stops being a root action. Keep the current shape on a branch: the case
   records it as the rival to fall back to if one call per utterance does not
   read as well as the loop at the latency the case needs.
5. **Add `Specifying` and `Binding`** per the case's catalogue. *Done
   2026-09-11, before item 4 and without it — see §9.2 and §9.3.* Clauses in
   the buyer's words with `text`, `discipline`, `negotiability`, `formerly`;
   choices with `value`, `answers`, `decidedBy`, `replaces`, `reason`. Left
   for their slices: `quantity` and `class` (slices 2 and 3), `serves` and
   `affects` (the substitution move), and the re-reading of `Deciding` —
   its conflict use as `Diagnosing.arise` plus `OfferSubstitutes` where
   `serves` is known, its completion use as thirty `Binding/propose`
   answering one commercial clause gated by `Suggesting` — which needs
   `serves` and so waits. The canvas has its column: *Required*, above the
   three, with what answers each clause and *answers no stated requirement*
   on every value that does not.
5a. **Transcribe one real RFQ into `Specifying`'s state by hand.** *Outstanding,
   and not code.* The plan's step 0 asks what a dealer has in hand, and a
   tender's clauses are the likeliest answer; writing one into `text`,
   `discipline` and `negotiability` says whether the state fits before any
   upload is built, and says it about the concept rather than about a parser.
   If it fits, the document upload is slice 2's `Reading` at document grain
   with the gate applied once; if it does not, the concept is wrong before
   the reading is.
6. **Move the prompt's sentences into rules.** *State the context first* is
   `Stepping` (slice 4); *a city implies a region* is `Mapping` (slice 3);
   context as variables is `Situating` (slice 1). Each is removed from
   `SYSTEM_PROMPT` when its concept is built, and the coverage table in §9.2
   moves the verdict. A sentence that stays in the prompt after its concept
   exists is a finding.
7. **Reference the case from here, and re-run this section** whenever a
   concept is added or a verdict moves. The case's `Prototype plan` holds only
   what changed on its side; this section holds the reading of the code.
8. **Build `Quoting`.** *Done 2026-09-11 — see §9.2 and the last paragraphs
   of §9.3.* The catalogue's existing concept, specified for the stand-in
   engine in `docs/concepts/quoting.md`: `quote`, `commit`, `revoke`; the
   item a value; validity a date passed in. Three gestures and one model
   permission, and no rule from `Copiloting/invoke` to `Quoting/commit`,
   which is the second asymmetry beside adoption. Out of the ladder's order —
   the plan has `Quoting` on the horizon because the product already has
   it — and built now because the end of a configuration is an offer, and a
   prototype whose canvas ends at *still open* demonstrates a configurator
   rather than the thing a person came for. The four findings are in §9.3;
   the first is the case's to classify.
9. **Make the proposal read as a real one.** *Done 2026-09-11.* Read against
   an Otis bid letter and a Clark installation agreement: lump sum rather than
   line prices, a schedule of values, a programme, a warranty, work by others,
   exclusions, conditions, parties and site. Three concepts added —
   `Stipulating`, `Profiling`, `Naming` — with the seller's side seeded from
   the catalogue's `vendor` and `terms` blocks and the person's side written
   by two gestures and two tools. The financing model stays on the canvas and
   off the proposal, because no proposal has one. §8 gained the seller as a
   letterhead, the profile without an inverse, and the prompt sentence about
   not inventing names.

## Sources

- MSM: `2606.11051v1.pdf` — _Making Software Meaningful_, Meng, Namazov, Schare, Cunha & Jackson, arXiv:2606.11051v1 [cs.SE], June 2026.
- WYSIWID: `What You See Is What It Does.pdf` — _What You See Is What It Does: A Structural Pattern for Legible Software_, Meng & Jackson, Onward! '25, arXiv:2508.14511v2, doi:10.1145/3759429.3762628.
- Jackson, _Why Concepts Aren't Objects_, blog post, 2026, <https://essenceofsoftware.com/posts/concepts-and-oop/> — cited as MSM reference [21] in support of footnote 6, and the authority for [gerund naming](method/concept.md#naming) and the [bad smells](method/objects.md#bad-smells).
- Background: Daniel Jackson, _The Essence of Software: Why Concepts Matter for Great Design_, Princeton University Press, 2021. Superseded on synchronizations by WYSIWID §3 and on naming by the blog post above.
- On what the canvas shows: Min, Chen, Cao & Xia, _Malleable Overview-Detail Interfaces_, CHI '25, doi:10.1145/3706598.3714164; Min & Xia, _Meridian: A Design Framework for Malleable Overview-Detail Interfaces_, UIST '25, doi:10.1145/3746059.3747654. The source of [Showing](concepts/showing.md); the content dimension taken, layout and composition declined.
- The elevator domain: EN 81-20/50 (safety and dimensions), EN 81-70 (accessibility), EN 81-72 (firefighters lifts), ASME A17.1 and ADA. The catalogue's rules cite them; the figures in it are illustrative and are not a verified assessment of any real product.

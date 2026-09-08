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
overlooked.

_The engine is a subset._ It provides the log, flows, provenance and
once-only firing; it does not parse `when`/`where`/`then`. A reader therefore
holds two representations of every rule — the notation in
[`syncs/`](syncs/README.md) and the function in `agent/syncs/` — and nothing
checks that they agree. That is the honest cost of not building a matcher.

_Recomputation is quadratic in the worst case._ Adopting a completion issues
about thirty `require`s, each triggering a full propagation, and takes roughly
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
| `Asserting` (was `Specifying`) | `Asserting` — the concept the catalogue took from this build | Name conformed 2026-09-08; code not yet. Holds a value in the model's vocabulary with who asserted it; the catalogue's `Specifying` holds a clause in the buyer's |
| `Constraining` | `Configuring` | `because` is provenance as a sentence, not a `Kind`; `complete` with a cost function has no counterpart; §8 already says this is two concepts, and the rule-book half is the model's authoring side, outside the case |
| `Cataloguing` | `Configuring.inDomain` plus model metadata | This is the case's step 1 row *attribute semantics beyond a label*, answered for a stand-in engine: labels and a family, nothing more |
| `Pricing`, `Footprinting` | `Configuring.price`; nothing | Service level and support term are variables here, which confirms the case's reading that the market models terms as attributes |
| `Deciding` | `Suggesting` | Instantiated for a conflict and for a completion, not for an inferred clause or an interpreter-proposed choice. Its conflict answer is *withdraw an assertion*; the catalogue's is `Binding.substitute`, which keeps the requirement and needs `answers` and `serves` |
| `Copiloting` — `gesture`, `invoke` | `Conversing` — one symmetric `say` | Two root actors here; the model initiates. The catalogue's interpreter is rules and never initiates; the buyer's `say` is the only entry. Recorded in the case as a rival composition |
| in the system prompt | `Reading`, `Mapping`, `Situating`, `Stepping` | *State the context first; a city implies a region; a storey count implies a travel height* — a task model, a mapping and the given/attribute split as English to a model, which §7 of this document (finding 4) names as the starter's failure |
| absent | `Binding.answers`, `Specifying`, `Staling`, `Revising`, `Agreeing`, `Handing over` | §8's *adoption has no inverse* and *one specification, no revisions* |
| the canvas | `Rendering` with one `move` | The ledger as an object; the case's Direction question 3 answered by default |
| `Moding`, `Theming`, `Scheduling`, `Querying` | — | Starter surface, outside the case |

### 9.2 Coverage

Three verdicts per concept of the case's catalogue: *built* (a concept module
and rules), *in prompt* (the behaviour exists as a sentence in `SYSTEM_PROMPT`
or in a tool description), *absent*. The `concept-coverage` skill re-runs this.

| Verdict | Concepts |
|---|---|
| built | `Configuring` (as `Constraining` + `Cataloguing` + `Pricing`), `Asserting` (as `Specifying` in code), `Suggesting` (as `Deciding`, two of its four uses), `Rendering` (one move) |
| in prompt | `Reading` (the model reads the message and calls `require`), `Mapping` (*a city implies a region*), `Situating` (context as variables, stated first), `Stepping` (*state the context before anything else*) |
| absent | `Specifying`, `Binding`, `Conversing` (the thread is the framework's; no `say` in the log), `Diagnosing` beyond the *model rule* kind (`refused`, `culprits`), `Staling`, `Revising`, `Agreeing`, `Handing over`, `Deriving`, `Narrowing`, `Recalling`, `Quoting`, `Complying` |

The structural audit in §3 passes and this one does not, and that is the
reason both exist. Four of the case's concepts are sentences in a prompt, which
the four design rules cannot see.

### 9.3 Where this build sits, and what the case took from it

Neither the case's step 2 (the null: chat, a model, tools wired to the solver)
nor its slice 1 (six concepts with `Binding` at the top). The null's chain with
three additions — the assertion held apart from the entailment, a conflict and
a completion put to the person, provenance on every action — and `answers`
absent. The case's `Prototype plan` now runs its five pre-registered predictions
on this build *as it stands*, then conforms it into slice 0 by the first two
items below.

Three things the case took from the build, each by its lane. *Grounded in the
job:* the assertion apart from the entailment, which the job's fact table
already kept apart and the catalogue had folded into `Binding` — now the
concept `Asserting`, and a slice 0 beneath slice 1. *A fact about software:*
that the product's `holds` conflates set and solved values; that a solver may
or may not offer `clear`, soft constraints and an optimise call — four new rows
in step 1, and the probe reframed as a diff of `Constraining`'s signatures
against Tacton's API. *Grounded in neither:* the model as a root actor, which
is the framework's default and is recorded as a rival composition, declined.

### 9.4 What to change, in order

Each item names the skill that does it. Specification first, then regenerate;
do not patch `agent/` by hand.

1. **Run the null's measurements before anything else.** Against one product
   model and one dealer task, take the five observables in the case's
   `Prototype plan` step 2 from the build as it is. This is the only moment the
   `say → (model) → require → assume` chain exists to be measured. Throw the
   numbers into the case, not the code.
2. **Regenerate `Asserting` from its specification** (`concept-generate`).
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
3. **Record the buyer's words.** Add a concept `Conversing` per the case's
   catalogue — one action `say [party, text] => [utterance]`, state a sequence
   with `by` and `text` — and make the submitted chat message a
   `Copiloting/gesture [act: "say"]` that a rule carries into `Conversing/say`,
   before the model sees it. Until step 4, nothing else fires from it; the point
   is that the log's first entry for a turn is what the person said, not what
   the model did with it. (`concept-spec`, then `concept-sync`, then generate.)
4. **Demote the model.** This is the case's slice 1 and it changes the graph.
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
5. **Add `Specifying` and `Binding`** per the case's catalogue, at that point:
   clauses in the buyer's words with `text`, `discipline`, `class`, `serves`,
   `negotiability`; choices with `value`, `answers`, `decidedBy`, `replaces`,
   `reason`, `affects`. `Deciding` is then re-read: its conflict use becomes
   the catalogue's `Diagnosing.arise` plus `OfferSubstitutes` where `serves` is
   known and the concession question where it is not; its completion use
   becomes thirty `Binding/propose` answering one commercial clause, gated by
   `Suggesting`. The canvas gains its column: *what this is for*.
6. **Move the prompt's sentences into rules.** *State the context first* is
   `Stepping` (slice 4); *a city implies a region* is `Mapping` (slice 3);
   context as variables is `Situating` (slice 1). Each is removed from
   `SYSTEM_PROMPT` when its concept is built, and the coverage table in §9.2
   moves the verdict. A sentence that stays in the prompt after its concept
   exists is a finding.
7. **Reference the case from here, and re-run this section** whenever a
   concept is added or a verdict moves. The case's `Prototype plan` holds only
   what changed on its side; this section holds the reading of the code.

## Sources

- MSM: `2606.11051v1.pdf` — _Making Software Meaningful_, Meng, Namazov, Schare, Cunha & Jackson, arXiv:2606.11051v1 [cs.SE], June 2026.
- WYSIWID: `What You See Is What It Does.pdf` — _What You See Is What It Does: A Structural Pattern for Legible Software_, Meng & Jackson, Onward! '25, arXiv:2508.14511v2, doi:10.1145/3759429.3762628.
- Jackson, _Why Concepts Aren't Objects_, blog post, 2026, <https://essenceofsoftware.com/posts/concepts-and-oop/> — cited as MSM reference [21] in support of footnote 6, and the authority for [gerund naming](method/concept.md#naming) and the [bad smells](method/objects.md#bad-smells).
- Background: Daniel Jackson, _The Essence of Software: Why Concepts Matter for Great Design_, Princeton University Press, 2021. Superseded on synchronizations by WYSIWID §3 and on naming by the blog post above.
- The elevator domain: EN 81-20/50 (safety and dimensions), EN 81-70 (accessibility), EN 81-72 (firefighters lifts), ASME A17.1 and ADA. The catalogue's rules cite them; the figures in it are illustrative and are not a verified assessment of any real product.

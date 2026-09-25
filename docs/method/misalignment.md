The diagnostic vocabulary. MSM §5.1.

The premise is that users deprived of a stated meaning construct their own:

> Folk theories are accounts of what the system is doing that fit the available evidence well enough to predict what to do next. They are often the only resource a user has, and they keep working until they do not. When they fail, the failure is hard to report: the user knows something has gone wrong but lacks the words to say what.

## Conflation

<a id="conflation"></a>
The first and commonest failure, and the one this repository exhibits.

> The action a user wants to perform does not exist as an action of the system. Distinct concepts have been conflated under a single gesture, and the work of design is to pull them apart.
>
> — MSM §5.1.1

Two worked cases. _Cloud file systems:_ renaming may rename for everyone or only for you, depending on whether the rename is a fact about the file or about your view of it; sharing may mean granting access, sending a copy, or creating a link; deleting may mean removal from a view, transfer to a trash with an opaque retention policy, or destruction. "The user is asked to act through one vocabulary — rename, share, delete — that the software implements via several concepts at once."

_Git branches:_ the terminology invites reading a branch as a context you can suspend and resume, but switching branches rewrites the working tree, so uncommitted work must first be committed or stashed. The developer "is therefore obliged to operate a second concept (`stash`) whose name does not suggest its use for context management." `worktree` is the correct repair — it separates working state from branching — and MSM's aside about it is worth keeping: "That the fix sits two pages into the documentation, and that the workaround continues to be taught to new developers, shows how reluctantly such conceptual mistakes are unmade."

The diagnosis is the same in both, and it is the one this application is built around: the actions are there in the user's head and absent from the system. Note the direction of the repair — *pulling apart*, not adding. `worktree` is the model.

The related tell from [the objects piece](objects.md#bad-smells) is the cheapest way to detect this without reading code: if the purpose needs an "and", the concept is two concepts.

## Dark concepts

MSM's second category, and a sharpening of the dark-patterns literature — which "tends to stay at the level of the screen: a button too small, a confirmation too aggressive, a cancellation path too deeply buried."

> These are usually just symptoms of a deeper malaise: a mismatch between the action the user thinks they are taking and the action the system records.

Facebook's angry reaction is the case. The interface invites an act of expression; the system for years treated the click as a strong engagement signal, weighted above a like by a documented factor of five. "The act the user performed and the act the system recorded were not the same act. From the screen alone the discrepancy was undetectable; what changed was the shape of the feed."

The naming move is the contribution:

> "Dark pattern" leaves the kind of misalignment open; calling angry-as-amplification the implementation of one concept (engagement weighting) under the guise of another (sentiment expression) locates the offense at the level of meaning.

The same form covers cancellation flows routed through pages of dissuasion, and free trials "whose registration is a single action and whose revocation is governed by no comparable one." That asymmetry test — *is there an inverse action, and does it cost what the original cost?* — is a small, checkable design question.

## Concept substitution

The third category is the same offense extended over time. MSM reads Doctorow's enshittification not as new dark patterns layered on a stable system but as substitution behind an unchanged surface:

> Searching on a marketplace once retrieved the items most relevant to the query; on a mature platform it retrieves the items the seller has paid most to surface. Following once meant subscribing to a creator's posts; on the same platform later in its life it means receiving them in an algorithmically thinned trickle. The user's action does not change; the concept behind it does.

It "can be sustained for as long as users keep acting on the old reading. A vocabulary in which both readings have names is what allows the substitution to be noticed."

This is the argument for keeping a conceptual model as a living artifact rather than a one-time analysis. A substitution is invisible against code and obvious against a written purpose.

## What the vocabulary is for

Three further uses, each of which is a reason this project keeps the notes it keeps.

_Bug reports._ "'This feels broken' is hard to act on; '`React.angry` seems to participate in two reactions, one feeding ranking and one notifying the author, and the two weight it differently' is something a developer can investigate directly."

_User stories._ The canonical agile form leaves the action as "a placeholder, a piece of prose the development team will negotiate into something implementable," in private and untraceably. With a concept vocabulary the story names real elements: "as a poster, I want an action on `Posting` that schedules a post for a future time, with a reaction that publishes it when the time arrives." More demanding to write, and "it leaves much less room for interpretation."

_LLM-assisted development._ MSM is pointed about the limits of prose prompting:

> Such models generate syntax from prose, which is useful, but they do not generate a vocabulary in which the user can reason about what the software does. A user who asks a model to "add a feature" and receives a working patch is no better placed than before to say what the software now means.

The repair is to make requests at the level of meaning — a new reaction, an additional fact, a new action of an existing concept — and read the result in the same terms. That is [the generation loop](implementation.md#generation), stated as a usability property rather than an engineering one.

§5.1.6 extends all of this to contested meaning, where an engineer reading a system through its evaluation pipeline and a critic reading it through its consequences "are not disputing each other's claims. They are disagreeing about what the algorithm means." MSM claims only that a shared vocabulary is a prerequisite for that argument, not a resolution of it.

## In this repository

The vocabulary is mostly used here to say what the design avoids rather than
what it does. That is a weaker kind of claim and worth marking as such: a
conflation that never happened leaves no evidence, and the only honest test is
whether the actions a person wants exist as actions of the system.

_The conflation refused._ Every configurator has to record two things about a
variable — what somebody asked of it, and what the rules make of that — and the
industry standard is one field holding whichever was written last. Under that
shape the action *take back what I asked for* does not exist, because there is
nothing to distinguish it from *overwrite this slot*, and a person watching
values change under their cursor cannot tell which ones they chose. Here they
are [Asserting](../concepts/asserting.md) and
[Constraining](../concepts/constraining.md), and the difference between
`required` and `assumed` is rendered as a section of the canvas.

_The dark-concept test, applied to the assistant._ MSM §5.1.2's question is
whether the act the user performed and the act the system recorded are the same
act. The sharpest version here is the proposed completion: a model that
computed a whole assignment and wrote it in would be recording
*the person specified this lift*, and the person performed nothing of the kind.
So `Constraining/complete` writes nothing, and the only path from an assignment
into a specification is `Deciding/choose`. See
[Conduct](../syncs/conduct.md#what-is-not-here-and-why-that-is-the-enforcement).

_The asymmetry test._ "Is there an inverse action, and does it cost what the
original cost?" `assert` costs one click; `withdraw` costs one click, from the
card the assertion is displayed on. Adopting a completion makes an assertion for every open variable at once and there is no single action that unmakes them, which is
a genuine asymmetry and the one place the test currently fails.

_Substitution risk, live._ The estimates are the exposure. `Pricing` reckons
recurring charges over a presumed term and `Footprinting` charges a use phase to
three variables at once; both are approximations, both are stated in the
notes, and both are the kind of thing that gets quietly retuned later while the
number on the screen keeps its name. That is §5.1.3's shape exactly, and writing
the formulas down where they can be diffed is the only defence there is.

_Two stubs whose names still lie._ `query_data` accepts a question and returns
the whole CSV; `search_flights` does not search but renders results handed to
it. Both are demo features of the starter, both are kept, and both remain
instances of §5.1.2. Recorded rather than fixed, because a template is copied
and a stub whose name lies is copied with everything else.

## See also

- [Objects](objects.md#bad-smells) — the three tells, checkable without code
- [Concept](concept.md) — purpose as the unit that conflation destroys
- [Code of conduct](conduct.md) — the other half of MSM's applications
- [Asserting](../concepts/asserting.md) — the conflation this application refuses, in full

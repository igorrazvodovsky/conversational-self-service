# The moves

What either party can do in a turn, what it changes, and which surface carries
it. The canvas and the chat are two surfaces over one specification, and every
question of the form *should this be a message or a section?* is answered here,
move by move, rather than by a rule of thumb.

This is a placement note. It changes no concept, action or rule; where a move
reaches state, the rule that carries it is linked, and the rule is the
authority.

## The two surfaces

The canvas is a view over concept state (`agent/views.py`). It shows what is
the case: what the person requires, what was asserted and by whom, what
follows and from which rule, what is still open, what is being asked, what
was offered. It survives the thread, the reload and the restart, because the
state it reads is reconstructed from the log.

The chat is where the two parties address each other. The person's message is
recorded first, as an utterance ([Conversing](concepts/conversing.md)) that
opens the turn's flow, and the model's reply is a turn: an interpretation, an
explanation, an argument, a question, a proposal. That is what the chat is for, and a configurator whose
chat only takes instructions has given up the thing a conversational
interface is worth having for.

The two jobs are different, and the test for which surface a thing belongs on
is this:

> Could you delete the transcript and still have everything the person needs
> to check?

If deleting the transcript would lose something the person needs to *check*,
that thing is a fact and belongs on the canvas. If it would lose something the
person needs to *understand*, that is what the chat was for. Neither surface
does the other's job: the chat does not restate the canvas, and the canvas
does not carry reasoning about intent. The chat may point at the canvas,
though: every item there has an address, and a reply that refers to one links
the word rather than reciting the item.

## The person's moves

The person acts on the canvas by gesture, or in the chat by saying something
the model then acts on. Both reach the same actions by way of rules; the
difference is provenance, which the canvas shows. A gesture is the person's
own act. A tool call made after they asked for it is the model's act, made at
their request, and reads that way in the log.

| Move | Where | What it reaches | What the chat carries |
|---|---|---|---|
| Describe the situation — "a hospital, six storeys, in Lyon" | chat | `Conversing/say`, then the model's `assert_value` calls through [`TheModelMayAssertAValue`](syncs/delegation.md), as far as the person has let it go, in [the flow the words opened](syncs/gestures.md#the-turn-is-one-flow); the canvas shows the words beside each value asserted in reply | the model's reading of it, so it can be corrected: *I took that as a hospital, six stops, and a European code regime* |
| State a requirement in the chat — "a bed must fit, with a porter" — or attach a document that states them | chat | `Conversing/say` and `Filing/file`, then the model's `read` calls through [`TheModelMayReadARequirement`](syncs/reading.md): a clause stated by the model, cited to its source, and its answer asserted — or, at less latitude, the reading put to the person ([Delegation](syncs/delegation.md#the-model-suggests-within-the-latitude)) | what it read and what it found nothing for; a later requirement that displaces an earlier answer, said so, with the earlier clause left for the person |
| State, relax, reword or strike a requirement, in their own words | canvas | [`Specifying`](concepts/specifying.md) through the clause gestures | nothing; the model cannot strike, reword or answer a clause, and states one only by reading it from a source, which the person keeps, rewords or strikes |
| Say how firmly a requirement is meant — fixed, negotiable, or left open | canvas | `Specifying/settle`; a value answering only negotiable clauses reaches the solver softly ([Propagation](syncs/propagation.md#which-of-the-first-two-fires-is-a-fact-of-the-state)) and reads as *yielded* where the rules could not honour it | what gave way and why; the model cannot change how firmly a clause is meant, and does not withdraw a yielded value |
| Look at one requirement — what answers it, what that forced, what could still answer it | canvas, or chat | [`Framing`](concepts/framing.md), with a clause as the frame ([Gestures](syncs/gestures.md#the-canvas-is-narrowed-to-one-requirement)); the configuration comes forward ([Propagation](syncs/propagation.md)) | one sentence saying the canvas is narrowed to it; the model may frame a clause and cannot answer one |
| Say which value answers a clause | canvas | a pick made while a clause frames the canvas is [`Binding`](concepts/binding.md)'s `answer`, then `Asserting` | nothing |
| Assert or withdraw a value | canvas, or chat | `Asserting/assert` or `withdraw`, by gesture or by the model's tool | on the canvas, nothing — the model is not run; in the chat, what followed and why |
| Ask why — "why can't I have 630 kg?" | chat | nothing; `review` reads state | the rule's own sentence, and the argument if the person pushes back. This lives in the chat and only there |
| Ask what a choice cost | chat, or canvas | [`Framing`](concepts/framing.md) | one sentence saying what the narrowed canvas now shows |
| Answer a conflict question | canvas, or chat | `Deciding/choose` or `decline` by gesture; in the chat, the model withdraws the conceded assertion at the person's word, under its own actor | the model saying what it withdrew and what came back |
| Take a proposed value, or the whole proposal | canvas only | `Deciding/choose`, then [`AnAdoptedValueBecomesAnAssertion`](syncs/conduct.md#proposing-and-not-adopting) | the model may say what it proposed and that it is waiting; it cannot adopt any of it |
| Say who they are, where the lift goes | canvas, or chat | `Profiling`, `Naming` | acknowledgement only if something is still missing for a quote |
| Request a quote | canvas, or chat | `Quoting/quote` when the specification is complete and addressed | what is missing, if anything, and where the proposal is |
| Accept or revoke a quote | canvas only | `Quoting/commit`, `revoke` | nothing; the model cannot accept |
| Choose what the canvas shows beside each item | canvas, or chat | [`Showing`](concepts/showing.md) | nothing; the point of the move is that the figure is on the canvas rather than recited |
| Set how far the assistant may go, act by act | canvas only | [`Delegating`](concepts/delegating.md) | nothing; the model cannot change it |
| Take back what the assistant did with a message | canvas only | [`Rewinding`](concepts/rewinding.md), then the rules that put each value and clause back | nothing |
| Discard the specification | canvas | `Asserting/discard` | nothing |

## The model's moves

The model has two kinds of move: the tool calls [Conduct](syncs/conduct.md)
permits, which reach state, and the reply, which reaches nobody's state and is
what the chat exists for. The reply's moves:

| Move | When | What it says | What it must not do |
|---|---|---|---|
| Interpretation | after reading the person's words into assertions | what it took them to mean, in the model's vocabulary, inviting correction — the canvas holds the words beside each value asserted in reply, the chat explains the reading | present the reading as the person's choice; recite the words the canvas shows |
| Consequence | after an assertion, when the rules forced something | what followed and the rule's sentence — the canvas shows the edge, the chat explains it | list every entailment; restate the canvas |
| Argument | when asked why | the rule, in its own words, and what would have to give | compose a reason no rule states |
| Asking | when a conflict is open, or a completion needs a choice the rules do not settle | the question, addressed to the person, with the answers open | answer it; treat its own turn as the person's answer |
| Proposing | when the specification is incomplete and the person seems done stating context | the offer to work out the rest, or what a proposal assumed | say the proposal was adopted |
| Declining | when asked to do something no rule permits — adopt, accept, change a price | that it cannot, and who can | do it another way |
| Silence | when the person acted on the canvas | nothing — the model is not run on a gesture | narrate a gesture after the fact |

The last row is by construction rather than by instruction: a gesture is
performed against the engine directly (`agent/webapp.py`) and never enters the
graph. Asking a model for an empty reply is an instruction it can fail to
follow; here there is no turn to be silent in.

## The conflict, as the worked case

A conflict is the move that lives on both surfaces, and it shows why the
placement is not a duplicate.

On the canvas it is a fact: a `Deciding` request, asked by
[`AConflictIsPutToThePerson`](syncs/propagation.md#when-assertions-cannot-hold-together)
whenever a solve fails, holding the rules' sentences as its reason and the
assertions that could give way as its options. It stays until it is answered,
declined or withdrawn, and it is there after a reload. It is asked the same
way whoever caused it — the person by a click, the model by a tool, a browser
agent over WebMCP — which is why it cannot live in the chat: two of those three
have no turn to attach it to.

In the chat it is a question: the model says which rules refuse the value and
asks which assertion gives way. The person may answer with a click, in which
case the model was never involved, or in words, in which case the model
withdraws the conceded assertion — a permitted move, made at the person's
word, recorded under the model's actor — and
[`AResolvedConflictWithdrawsItsQuestion`](syncs/propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)
takes the question off the canvas once every assertion holds again. The chat
poses; the canvas holds; either settles.

What the chat must not do: state that a rejected value was recorded, walk
the options the canvas already lists, or decide for the person. Each is a
turn standing in for a fact, and the first is the model reporting a state it
never checked. The prompt's rule is against withdrawing *unasked*;
withdrawing at the person's word is the person's answer, carried out.

## The suggestions

The strip under the composer offers moves. Each pill is a message ready to
send, so a pill is an affordance on `Conversing/say` and nothing more
([Concept](method/concept.md#what-is-deliberately-not-a-concept)); pressing
one is the person saying that, and the model's reply is the turn it would be
had they typed it.

Which pills are offered is a read over the same view the canvas renders
(`src/components/chat/suggestions.tsx`). Nothing is asked of the model to
produce them, for two reasons. A read is the same on every reload and costs no
turn. And a pill written by the model could offer a move the chat does not
carry — *adopt the proposal*, *accept the quote* — which the model would then
have to decline; a read draws only from the rows of the table above where the
chat is a surface. So a conflict offers *why can't these hold together* and
*give up this one*; a proposal offers *what did it assume*, never *take it*;
a displaced or unanswered requirement offers to look at it; a settled value
offers its argument; an incomplete specification offers a completion; a
complete one offers a quote, and an issued one asks what has moved since. The
openers appear only while nothing has been asserted or required, and the
welcome screen reads the same fact: an empty thread over a specification
already under way says so.

## What is not yet in place

- *The model's reply is specified only in the prompt.* The table above is the
  first place the reply's moves are written down; `agent/main.py` carries them
  as instructions, and nothing measures whether they are followed.

## See also

- [Conduct](syncs/conduct.md) — which of the model's moves reach state, and which do not exist
- [Gestures](syncs/gestures.md) — the person's moves, as root actions
- [Propagation](syncs/propagation.md#when-assertions-cannot-hold-together) — how a conflict becomes a question
- [The UI vocabulary](ui.md) — what the surfaces are built from

# The moves

What either party can do in a turn, what it changes, and which surface carries
it. The canvas and the chat are the surfaces over one specification, and every
question of the form *should this be a message or a section?* is answered here,
move by move, rather than by a rule of thumb.

This is a placement note. It changes no concept, action or rule; where a move
reaches state, the rule that carries it is linked, and the rule is the
authority.

## The surfaces

The canvas is a view over concept state (`agent/views.py`). It shows what is
the case: what the person requires, what was asserted and by whom, what
follows and from which rule, what is open, what is being asked, what
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
the word rather than reciting the item. Two offers compared are a place too,
so a reply can put a comparison in front of the person by linking it, and
nothing is recorded: which pair is shown stays the viewer's. A link is the
page's URL too, so the person can send one to a colleague, and their own agent
can link its work from a chat of its own ([Links](ui.md#links)).

The person's own agent has a chat of its own, and when the person's client
renders MCP Apps the canvas reaches into it: the specification or an offer,
rendered beside the agent's reply from the read the agent made, each item in
its kind and linked back to the page. The test above holds there too. The
view is the canvas's, holding what is the case, and the agent's reply around
it is the chat's. A gesture made in that view is the person's
([Conduct](syncs/conduct.md#in-the-persons-own-chat-the-facts-stay-facts)).

## The person's moves

The person acts on the canvas by gesture, or in the chat by saying something
the model then acts on. Both reach the same actions by way of rules; the
difference is provenance, which the canvas shows. A gesture is the person's
own act. A tool call made after they asked for it is the model's act, made at
their request, and reads that way in the log.

| Move | Where | What it reaches | What the chat carries |
|---|---|---|---|
| Describe the situation — "a hospital, six storeys, in Lyon" | chat | `Conversing/say`, then the model's `assert_value` calls through [`TheModelMayAssertAValue`](syncs/conduct.md), in [the flow the words opened](syncs/gestures.md#the-turn-is-one-flow); the canvas shows the words beside each value asserted in reply | the model's reading of it, so it can be corrected: *I took that as a hospital, six stops, and a European code regime* |
| State a requirement in the chat — "a bed must fit, with a porter" — or attach a document that states them | chat | `Conversing/say` and `Filing/file`, then the model's `read` calls through [`TheModelMayReadARequirement`](syncs/reading.md): a clause stated by the model, cited to its source, and its answer asserted | what it read and what it found nothing for; a later requirement that displaces an earlier answer, said so, with the earlier clause left for the person |
| State, relax, reword or strike a requirement, in their own words | canvas | [`Specifying`](concepts/specifying.md) through the clause gestures | nothing; the model cannot strike, reword or answer a clause, and states one only by reading it from a source |
| Keep the assistant's reading of a requirement as their own | canvas | `Specifying/adopt` through [`APersonKeepsAReading`](syncs/reading.md#the-person-keeps-a-reading); rewording a reading keeps it too | nothing; the model cannot make a reading the person's, and cannot change a value that answers a requirement the person stated |
| Say how firmly a requirement is meant — fixed, negotiable, or left open | canvas | `Specifying/settle`; a value answering only negotiable clauses reaches the solver softly ([Propagation](syncs/propagation.md#which-of-the-first-two-fires-is-a-fact-of-the-state)) and reads as *yielded* where the rules could not honour it | what gave way and why; the model cannot change how firmly a clause is meant, and does not withdraw a yielded value |
| See what each value is for, and what it forced | canvas | nothing; the specification's one list is the [ledger](syncs/binding.md#the-ledger-is-a-read), each requirement's line holding its words, its choices and their consequences, a line with an empty requirement for each value answering none, and what is open | a link to the choice, at `#choice:<id>`, rather than the answer recited |
| Look at one requirement — what answers it, what that forced, what could still answer it | canvas, or chat | [`Framing`](concepts/framing.md), with a clause as the frame ([Gestures](syncs/gestures.md#the-canvas-is-narrowed-to-one-requirement)); the configuration comes forward ([Propagation](syncs/propagation.md)) | one sentence saying the canvas is narrowed to it; the model may frame a clause and cannot answer one |
| See what is left — what is open, what nothing answers, what answers nothing | canvas, or chat | [`Framing`](concepts/framing.md), with a gap as the frame ([Gestures](syncs/gestures.md#the-canvas-is-narrowed-to-one-gap)); the configuration comes forward ([Propagation](syncs/propagation.md)) | one sentence saying the canvas is narrowed to it |
| Say which value answers a clause | canvas | a pick made while a clause frames the canvas is [`Binding`](concepts/binding.md)'s `answer`, then `Asserting` | nothing |
| Assert or withdraw a value | canvas, or chat | `Asserting/assert` or `withdraw`, by gesture or by the model's tool | on the canvas, nothing — the model is not run; in the chat, what followed and why |
| Ask why — "why can't I have 630 kg?" | chat | nothing; `review` reads state | the rule's own sentence, and the argument if the person pushes back. This lives in the chat and only there |
| Ask what a choice cost | chat, or canvas | [`Framing`](concepts/framing.md) | one sentence saying what the narrowed canvas now shows |
| Answer a conflict question | chat | `Deciding/choose` or `decline` by gesture, from the question in the chat; or in words, and the model withdraws the conceded assertion at the person's word, under its own actor | the question and its answers, in the turn that ran into it or in a conversation opened for it; then the model saying what it withdrew and what came back |
| Talk to the assistant through their own agent — the person's agent says what the person would type | the person's agent, shown in the chat as theirs | `Conversing/say` under the agent's actor, then the assistant's turn in [the flow the words opened](syncs/gestures.md#the-persons-own-agent-speaks-in-the-chat), as for the person's own words | the assistant's reply, returned to the agent as well; a question it put comes back with it, for the agent to answer or hand back |
| Reply to a question the assistant asked, in words — "keep the hospital", or "that one is for facilities" | chat, or the person's agent | `Conversing/say` about the question as put, through [`APersonRepliesToAQuestion`](syncs/conduct.md#asking-and-waiting-for-the-answer); the question stays on the canvas until something settles it | the model carrying the answer out, or saying it will wait |
| Take a proposed value, or the whole proposal | canvas only | `Deciding/choose`, then [`AnAdoptedValueBecomesAnAssertion`](syncs/conduct.md#proposing-and-not-adopting) | the model may say what it proposed and that it is waiting; it cannot adopt any of it |
| Say who they are, where the lift goes | canvas, or chat | `Profiling`, `Naming` | acknowledgement only if something is still missing for a quote |
| Request a quote | canvas, or chat | `Quoting/quote` when the specification is complete and addressed | what is missing, if anything, and where the proposal is |
| Ask about the product — "which access control systems does the lobby badge work with?", "is the integration in the price?", "does remote monitoring need our network?" | chat | nothing; `look_up` reads what the seller publishes about a variable and its options — [`Detailing`](concepts/detailing.md)'s particulars, and the clauses of [`Stipulating`](concepts/stipulating.md) that hold where an option is chosen | an answer to every part, as the seller, from that record and linked to the variable; where the record is silent, that it is, and never a guess or a referral to "the supplier" |
| Ask about an offer — "why is the battery backup in No. 2?", "what does it cost me over the term?", "what do I pay on dispatch?", "what do I have to provide?" | chat | nothing; `open_quote` reads the offer as it was frozen at issue | the answer, with the offer's own lines linked — the value, the clause, the milestone — rather than recited |
| Accept or revoke a quote | canvas only | `Quoting/commit`, `revoke` | nothing; the model cannot accept |
| Choose what the canvas shows beside each item | canvas, or chat | [`Showing`](concepts/showing.md) | nothing; the point of the move is that the figure is on the canvas rather than recited |
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
| Explaining an offer | when asked about an issued quote | what the offer holds and why, as it was frozen: the grounds of a value, what a line added, when a payment falls due, what the customer provides — linking the offer's lines at `#quote:` addresses | read the offer against the specification as it stands without saying so; recite the proposal; accept or revoke it |
| Asking | when its own turn ran into a conflict | the question, put with `ask`, and nothing after it: the turn waits until the person answers, replies or leaves it ([Conduct](syncs/conduct.md#asking-and-waiting-for-the-answer)) | answer it; treat its own turn as the person's answer; ask again what was already asked and not yet answered |
| Proposing | when the specification is incomplete and the person seems done stating context | the offer to work out the rest, or what a proposal assumed | say the proposal was adopted |
| Declining | when asked to do something no rule permits — adopt, accept, change a price | that it cannot, and who can | do it another way |
| Resuming | when the question it asked was answered, replied to or left, wherever that happened | one sentence on what followed, or carrying out a reply in words | narrate the click; ask the question again |
| Silence | when the person acted on the canvas and no question of the model's was waiting | nothing — the model is not run on a gesture | narrate a gesture after the fact |

The last row is by construction rather than by instruction: a gesture is
performed against the engine directly (`agent/webapp.py`) and never enters the
graph. Asking a model for an empty reply is an instruction it can fail to
follow; here there is no turn to be silent in.

Resuming is the exception, and it is not a turn started on a gesture. The
person's message opened the turn, the model's question paused it, and the
gesture that answers the question lets the same turn finish, as a
salesperson who asked *which one gives?* says *then the car is 1,275 kg*
once the customer has pointed. A gesture with no question waiting resumes
nothing.

## The conflict, as the worked case

A conflict is the move with the most chat-like shape: something has to give,
the person may want to know why before they choose, and the choice is
theirs. So the question is put in the chat, and the canvas holds only the
fact.

The fact is a `Deciding` request, asked by
[`AConflictIsPutToThePerson`](syncs/propagation.md#when-assertions-cannot-hold-together)
whenever a solve fails, holding the rules' sentences as its reason and the
assertions that could give way as its options. It is asked the same way
whoever caused it — the person by a click, the model by a tool, a browser
agent over MCP — and it stays until it is answered, declined or withdrawn.
What the canvas shows of it passes the test above: where the specification
stands says it is not buildable as asked, each assertion that cannot be met
says so on its own line, and a link takes the question into the chat. Delete
the transcript and nothing the person needs to check is lost; the question
is the request, and can be put again.

The question is put in one of two places, depending on whether there is a
turn to put it in.

When the model's own turn ran into the conflict, the question is in that
turn: the model says which rules refuse the value, asks which assertion gives
way, and waits. The question is recorded as the model's, addressed to the
person, and the turn is paused on it
([Conduct](syncs/conduct.md#asking-and-waiting-for-the-answer)). The chat
shows the question with its answers, each answer a gesture with what it
would do beside it. The person may answer with a click or leave it for now,
and the turn resumes with one sentence on what followed. Or they answer in
words, typed while the question waits, and the words are a reply to the
question rather than a new turn; the model withdraws the conceded assertion
at their word — a permitted move, recorded under the model's actor — and
[`AResolvedConflictWithdrawsItsQuestion`](syncs/propagation.md#a-conflict-resolved-another-way-takes-its-question-with-it)
takes the question away once every assertion holds again. A value that
answers a requirement the person stated is not the model's to withdraw, so
that answer is given with its button.

When a gesture caused it — the person's on the canvas, or their agent's —
there is no turn. The model is not run on a gesture (*Silence*, below), so
nothing asks. The canvas's link offers a conversation for it instead, and
following it opens a new conversation that starts with the question and its
answers, put by the configurator rather than by the assistant. The person
answers there with a click, or writes, and their words open a turn like any
other: the model reads the open question in `review` and can explain the
rules, ask, or withdraw at their word. The conversation in progress is never
pulled away. Following the link again returns to the conversation opened for
that conflict, while it is still the one open.

The person's own agent meets the same question in `review`, with who asked it
and the words it was asked in, and answers it the person's way: it chooses,
leaves it, or replies. A reply is how it hands a decision back without
settling it — *that one is for the client* — and the question stays open with
the reply beside it, for the person it was meant for.

What the chat must not do: state that a rejected value was recorded, walk
the options the question already lists, or decide for the person. Each is a
turn standing in for a fact, and the first is the model reporting a state it
never checked. The prompt's rule is against withdrawing *unasked*;
withdrawing at the person's word is the person's answer, carried out.

## The specification, read

`review` is the canvas for the readers off the page: the assistant, and the
person's agent. It returns the same units the canvas arranges, each with the
address the canvas gives it under `at`: a requirement and the item it was
read as, a value asserted, followed or open, an open question, a document,
an item the person struck, and an issued quote. A reply that refers to one
links it rather than reciting it, and the person's agent can name the item
it means. Like `open_quote`, it records nothing.

## An offer, read

An issued quote holds what was true when it was made: the values, the
requirements as they stood with what answered each, why each value held and
what it added to the price, the programme as the seller reckoned it, and the
payments and the work by others the terms set. The quote surface lays that
out for the person. Every other reader reads it through `open_quote`, which
the assistant has as a tool and the person's agent has on the page's model
context, and both get the same record: the offer as frozen, its sentences in
the canvas's own words, addressed to the person. Reading it records nothing and needs no rule,
because a read is not an action. `review` lists the
quotes issued with where each stands and which values have moved since, and
`open_quote` is the offer itself.

The assistant reads an offer to explain it. Why a value is in the offer is
its grounds: asked for, given way, or following from a rule, with the rule's
sentence. What it costs over the term is the sum and the monthly charge the
offer fixed. When a payment falls due is the stage's share of the sum, at the
week the programme placed its milestone. What the customer must provide is
the work by others. Each of those is a line of the offer with its own
address, so the reply links the line and explains it, as it does for the
canvas. Accepting or revoking stays the person's: no rule lets the
assistant commit to an offer, and asked to, it says so and points to where
the person does it (*Declining*).

The person's agent reads an offer to check it, which is a job a person
hands over readily: does this offer answer what I asked for, and what does
it leave unanswered? Reading the offer and checking it against the
requirements is the agent's, once the person has asked. Accepting is the
person's decision. The agent holds the person's `commit` and `revoke`, and
performs them when the person has handed it that decision; otherwise it
reports what it found and leaves the offer for the person to accept.

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
chat is a surface. So a conflict offers *why can't these hold together*, and
not the answers, which the question beside it already carries; a proposal offers *what did it assume*, never *take it*;
a displaced or unanswered requirement offers to look at it; a settled value
offers its argument; an incomplete specification offers a completion; a
complete one offers a quote, and an issued one asks what has moved since,
whether it answers what was asked, and what changed from the one before. The
openers appear only while nothing has been asserted or required, and the
welcome screen reads the same fact: an empty thread over a specification
already under way says so.

## What is not yet in place

- *The model's reply is specified only in the prompt.* The table above is the
  first place the reply's moves are written down; `agent/main.py` carries them
  as instructions, and nothing measures whether they are followed.
- *Only a conflict is asked.* A completion that needs a choice, and a quote
  that needs a name and a site, are the same move: a question the turn cannot
  go past. Neither is put with `ask` yet.
- *The person's agent talks to the assistant only through the page.* It
  speaks in the chat the person has open, and the assistant's reply reaches
  it from there. An agent connected to the MCP server with no page open can
  act as the person, but has no conversation to speak in.

## See also

- [Conduct](syncs/conduct.md) — which of the model's moves reach state, and which do not exist
- [Gestures](syncs/gestures.md) — the person's moves, as root actions
- [Propagation](syncs/propagation.md#when-assertions-cannot-hold-together) — how a conflict becomes a question
- [The UI vocabulary](ui.md) — why the views are arranged as they are, and the decisions that run across them

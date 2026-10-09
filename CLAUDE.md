# CopilotKit + LangGraph elevator configurator

## Purpose

This repository is a showcase and template for building AI agents with
CopilotKit and LangGraph, using a product configuration as the primary
example, with z3 doing the constraint solving. It demonstrates CopilotKit
driving interactive UI beyond chat.

## Read this first

This repository is one artefact of a discovery case — the case's discovery
represented in code — and its concept notes are downstream of the case's
catalogue. The case: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/`
(an Obsidian vault; start at `Prototype plan.md`, then `Ontology/Concept catalogue.md`).

The application is grounded in two papers on concept design — _Making Software
Meaningful_ (MSM) and _What You See Is What It Does_ (WYSIWID) — plus Jackson's
_Why Concepts Aren't Objects_. That work lives in [`docs/`](docs/):

- [`docs/method/`](docs/method/README.md) — the vocabulary: individuals, values, actions, facts, concepts, synchronizations, and how they map to code
- [`docs/concepts/`](docs/concepts/README.md) — the concepts, specified
- [`docs/syncs/`](docs/syncs/README.md) — the rules, the only way two concepts interact
- [`docs/moves.md`](docs/moves.md) — what either party can do in a turn, and which surface carries it: the canvas holds what is the case, the chat is where the parties address each other

_The notes are the source, and the code is generated from them._ WYSIWID
§7.3: the prompt for the implementation is exactly the concept design spec. If
you want to change behaviour, edit the specification and regenerate — do not
patch the generated code. Project skills carry the procedures:
`concept-spec`, `concept-sync`, `concept-generate`, `concept-audit`, `concept-coverage`.

The UI is the exception: its code is the source, with the reasons in
comments beside it. [`docs/ui.md`](docs/ui.md) holds only what no one
component can say, and never re-describes the code or another note.

General-purpose concept-design material predates the synchronization scheme
used here — see [`docs/method/synchronization.md`](docs/method/synchronization.md#this-scheme-replaced-an-earlier-one).

## The one idea

> What a person asked for and what follows from it are two different kinds of
> fact, and a configurator that keeps them in one field cannot answer the
> question a person most often has.

Ask for a hospital lift and the usage profile becomes near-continuous, the
rescue system becomes a full battery backup, and most of the rated loads
disappear. None of that was chosen. The canvas therefore tells three kinds of
fact apart — _asked for_, _follows from that_ (with the rule that forces
it), and _open_ — and which kind an item is, is a property of the
current state, not of the catalogue. Each item says which it is where it
stands, rather than in a section of its own: a value that follows sits under
each assertion it rests on, and a kind of fact is a filter over one list.

## Architecture

A Next.js frontend at the root, a Python agent in `agent/`, and the concept
layer beside the agent.

```
├── src/
│   ├── app/
│   │   ├── page.tsx                      # wires the providers together
│   │   ├── quotes/[quote]/               # one quote, as a printable document
│   │   ├── webmcp-relay/[file]/          # the MCP-B relay's embed script, served from the package
│   │   └── api/
│   │       ├── copilotkit/[[...slug]]/   # CopilotKit runtime
│   │       └── configurator/[...path]/   # proxy onto the concept layer
│   ├── components/
│   │   ├── ui/                           # shadcn primitives — installed, never hand-written
│   │   ├── chat/                         # CopilotChat, composed from them through slots
│   │   ├── configurator/                 # the canvas
│   │   │   ├── provider.tsx              # reads /view, performs gestures
│   │   │   ├── index.tsx                 # the specification surface: one list, filtered by gap
│   │   │   ├── ledger.tsx                # the values: one row per variable in the catalogue's order, each saying which kind of fact it is and for which requirement
│   │   │   ├── standing.tsx              # where the specification stands: quotable or not, and the running price and carbon
│   │   │   ├── specification.tsx         # the one list and its filters: the requirements as a Tiptap document, a clause and the rows answering it per line; edits become gestures, a stated clause runs the assistant
│   │   │   ├── sources.tsx               # the documents and words the model read from, item by item, under the ledger
│   │   │   ├── clauses.tsx               # the clause vocabulary, and the answering mode (the clause frame)
│   │   │   ├── question.tsx              # the open Deciding questions
│   │   │   ├── log.tsx                   # the log by turn, behind the bell: what each turn changed and on whose authority, opening on the other party's changes
│   │   │   ├── quotes.tsx                # the quote surface: every offer issued, two compared, the addressee, one proposal at a time
│   │   │   ├── document.tsx              # a quote laid out as a commercial proposal
│   │   │   ├── grounds.tsx               # a quote read against what was asked, as the specification stood at issue
│   │   │   ├── comparison.tsx            # two offers compared: only the values that differ, and whose choice each was
│   │   │   ├── timeline.tsx              # a quote along time: the programme's milestones and the payment stages on them
│   │   │   ├── drawing.tsx               # the car and shaft as quoted, a plan and a section, to scale
│   │   │   ├── life.ts                   # the stages of the lift's life, and the catalogue's families read against them
│   │   │   ├── showing.tsx               # which facts the canvas shows beside each item (Showing)
│   │   │   ├── address.tsx               # every item's address, and links between them
│   │   │   ├── link.tsx                  # the page's URL as its state: the view, the frame, the facets, the item
│   │   │   ├── references.tsx            # the catalogue's vocabulary, offered inside a clause as it is typed
│   │   │   ├── format.ts                 # number and date formatting shared by the canvas and the proposal
│   │   │   ├── tone.ts                   # a status badge's hue, laid over the primitive
│   │   │   ├── webmcp.tsx                # the person's agent's tools, read from the MCP server and registered on the page (WebMCP)
│   │   │   └── variables.tsx             # an answer and what it forced, a row that follows, an open row
│   │   ├── example-layout/               # the artifact panel (the specification or the quotes, from Moding) and the chat's geometry (view state)
│   │   └── generative-ui/                # other showcase features
│   ├── apps/                             # the MCP Apps views: the specification and an offer, in the person's own client
│   └── hooks/
├── agent/
│   ├── concepts/          # one module per concept — MSM §5.2.1
│   ├── syncs/             # seeding, gestures, binding, propagation, reading, situating, conduct, handover, staling
│   │   └── readings.py    # named readings over exposed state, shared by the rules and the read side
│   ├── engine/            # log, flows, provenance, dispatch — never edited for a behaviour
│   ├── catalogue/         # elevator.json
│   ├── wiring.py          # discovers concepts, wires rules, boots with the catalogue
│   ├── views.py           # the read side (WYSIWID §6.4) — invokes nothing
│   ├── webapp.py          # POST /gesture, GET /view, GET /at, GET /digest, and /mcp — mounted by langgraph.json
│   ├── delegate.py        # the person's own agent's tools, as an MCP server, with the MCP Apps views
│   ├── apps/              # the views, built from src/apps/ by `npm run build:apps`
│   ├── tools.py           # the model's tools
│   ├── hearing.py         # the chat message and its attachments, as a person's `say` and `file` gestures
│   ├── instance.py        # the one engine every actor shares
│   ├── journal.py         # the log, kept: appended as written, replayed at boot
│   └── main.py            # the graph
└── docs/                  # the method, the concepts, the rules, the moves, the UI note, connecting an agent
```

### The rules that make this work

_Concepts never import each other._ Every interaction is a rule in
`agent/syncs/`. If you find yourself wanting to read another concept's state
from inside a concept, that is a synchronization you have not written yet.

_Only the bootstrap concept initiates._ `Copiloting.gesture` (a person),
`Copiloting.invoke` (the model) and `Copiloting.boot` (the application starting,
with its catalogue) are the only root actions. The catalogue's arrival reaches
every concept by a seeding rule, like anything else. There is no HTTP
route per concept action and no tool that changes state directly — a tool
records that the model asked, and a rule decides what follows.

_Reads are not actions._ The price total and the carbon footprint are
queries in the Pricing and Footprinting notes: calculations over each concept's
own state that record nothing. A record assembled from exposed state is not
even that; the rules and `agent/views.py` read it as a `where` would. Nobody
performs *compute the total*.

_Do not edit `agent/engine/` to get a behaviour._ MSM §5.2.4 observed that
no case of an agent modifying engine code to get a behaviour was ever
legitimate. Behaviour belongs in a concept or a rule. The engine changes only
when its own contract does, such as a new kind of stimulus for the bootstrap
concept, and then on purpose, with the reason in the change. Correcting its
comments is ordinary maintenance.

### The root actors, and what each may do

Whose agent it is decides the column, not where it runs. The model is the
seller's assistant, in the page. The person's agent is one the person brings,
such as a WebMCP-capable browser or a chat client the person adds the
configurator's MCP server to. It finds the person's gestures as that server's
tools, or registered on the page's `document.modelContext`, performs them as
`Copiloting.gesture` under its own actor, and the person's rules decide what
follows. Where the client renders MCP Apps, the specification and the offer
come with views, and a gesture the person makes in one is theirs, by hand.
How much the person delegates is theirs to set, in their own agent.

|  | person | model | person's agent |
|---|---|---|---|
| state, relax or strike a requirement, in their own words | yes | no | yes |
| read a requirement from a document, the person's words, or a clause they stated, cited to its source | — | yes | yes, from a document it filed or a clause it stated |
| keep a reading as the person's own | yes | no | yes |
| attach a document | yes | no | yes |
| say which requirement a value answers | yes | no | yes |
| assert or withdraw a value | yes | yes, unless it answers a requirement the person stated | yes |
| propose a completion | — | yes | yes |
| say what a completion is to be finished for | yes | yes, at the person's word | yes |
| talk to the other in the chat | yes | yes | yes, as the person |
| put a conflict, or who the quote is for, to the person and wait for the answer | — | yes | no |
| reply to that question in words, leaving it open | yes | no | yes |
| adopt one, a value at a time or whole | yes | no | yes |
| say who the person is, and where the lift goes | yes | yes | yes |
| request a quote | yes | yes | yes |
| accept or revoke one | yes | no | yes |
| hand the specification to the seller, with the reason | yes | yes, at the person's word | yes |
| take the out-of-date mark off an answer or an offer | yes | no | yes |
| say a fact of the situation was checked on site, or drop one | yes | no | yes |
| choose which facts the canvas shows beside each item | yes | yes | yes |
| narrow the canvas to what followed from one assertion, to one gap, or to one step of the job | yes | yes | yes |
| change a price, the catalogue, or the seller's terms | no | no | no |

Every `no` is the absence of a rule, not a prohibition — the DSL has no way to
write one, and an action no rule invokes does not happen. So *can the assistant
change a price?* or *can it buy the lift?* is answered by reading the `then`
clauses of [`agent/syncs/conduct.py`](agent/syncs/conduct.py), not by
reasoning about what a language model might infer from a prompt.

### The log

Every action is recorded with its actor and the rule that authorised it. The
canvas reads those provenance edges directly: *you asked for this*, *the
assistant asked for this* and *adopted from a proposal* are different `via` values
on the same action, with no field anywhere recording which.

The log is also what survives a restart. Nothing serialises concept state:
every record after the boot mark is appended to `agent/.journal/actions.jsonl`
as it is committed, and at the next boot the catalogue is read afresh and the
file is replayed — each recorded input applied to its concept again, each
record put back with its identity, timestamp and provenance edge, no rule
firing. That is MSM §5.2.3's "the state of concepts can be reconstructed
entirely from the log" taken literally, in [`agent/journal.py`](agent/journal.py).
`AGENT_JOURNAL` moves the file; `npm run reset:agent` deletes it, which starts
over. The chat threads are kept separately by LangGraph's dev server.

## Tech stack

- Frontend: Next.js 16, React 19, TailwindCSS 4, shadcn/ui (Lyra style, zinc)
- Agent: LangGraph (Python), OpenAI
- Solver: z3-solver
- CopilotKit: React hooks for agent integration (v2)

## Development

```bash
npm install        # also sets up the agent
npm run dev        # frontend on 3000, agent on 8123
npm run dev:ui
npm run dev:agent
npm run build
```

```bash
cp .env.example .env    # then set OPENAI_API_KEY
```

The concept layer is mounted into the LangGraph server by `langgraph.json`'s
`http.app`, so it runs in the same process as the graph and shares one engine
with the model's tools. `AGENT_URL` points the frontend proxy at it.

`e2e/ledger-flow.cjs` compares the page's information architecture on two
builds side by side, driving one person's task through each; see
[`e2e/README.md`](e2e/README.md).

The person's own agent connects as an MCP client of the concept layer, over
WebMCP in the browser, or through the MCP-B relay from the desktop; the setup
for each is in [`docs/agents.md`](docs/agents.md).

## UI components

Every surface is built from shadcn/ui in `src/components/ui/`, added with
`npx shadcn@latest add <component>` and never hand-written; reach for a
primitive before writing a `className` string. Do not run `shadcn init`: it
rewrites `globals.css` and silently drops the `@theme inline` bridge, the
`shadcn/tailwind.css` import and the zero radius ramp. Read
[`docs/ui.md`](docs/ui.md) before editing that stylesheet.

## Design principles

1. _The specification comes first._ Argue the change in `docs/concepts/` or `docs/syncs/`, then regenerate.
2. _Pull apart rather than add._ MSM §5.1.1's repair for conflation is separation, and `worktree` is the model (see [misalignment](docs/method/misalignment.md)).
3. _State permissions, never prohibitions._ A prohibition is a permission you decline to write.

## When extending this

- Write the concept in [`docs/concepts/`](docs/concepts/README.md) first. Check it against the three [bad smells](docs/method/objects.md#bad-smells) — the cheapest is whether the purpose needs an "and".
- Write the rules in [`docs/syncs/`](docs/syncs/README.md). If two concepts need to know about each other, they do not; a rule does.
- Then generate. One concept's specification is the whole context for generating it.

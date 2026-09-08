# CopilotKit + LangGraph elevator configurator

## Purpose

This repository is a showcase and template for building AI agents with
CopilotKit and LangGraph, using a **product configuration** as the primary
example, with z3 doing the constraint solving. It demonstrates CopilotKit driving interactive UI beyond chat.

## Read this first

This repository is one artefact of a discovery case — the case's discovery
represented in code — and its concept notes are downstream of the case's
catalogue. The case: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/`
(an Obsidian vault; start at `Prototype plan.md`, then `Ontology/Concept catalogue.md`).
The rule of precedence and the reading of this code against that catalogue are
[`docs/conceptual-model.md` §9](docs/conceptual-model.md#9-against-the-cases-catalogue),
which also lists what to change next, in order. A divergence from the catalogue
is a finding to classify there, not a fork.

The application is grounded in two papers on concept design — _Making Software
Meaningful_ (MSM) and _What You See Is What It Does_ (WYSIWID) — plus Jackson's
_Why Concepts Aren't Objects_. That work lives in [`docs/`](docs/):

- [`docs/method/`](docs/method/README.md) — the vocabulary: individuals, values, actions, facts, concepts, synchronizations, and how they map to code
- [`docs/concepts/`](docs/concepts/README.md) — the twelve concepts, specified
- [`docs/syncs/`](docs/syncs/README.md) — the twenty-six rules, the only way two concepts interact
- [`docs/conceptual-model.md`](docs/conceptual-model.md) — the alignment analysis, including §8 on what is wrong with this design

**The notes are the source, and the code is generated from them.** WYSIWID
§7.3: the prompt for the implementation is exactly the concept design spec. If
you want to change behaviour, edit the specification and regenerate — do not
patch the generated code. Five project skills carry the procedures:
`concept-spec`, `concept-sync`, `concept-generate`, `concept-audit`, `concept-coverage`.

General-purpose concept-design material predates the synchronization scheme
used here — see [`docs/method/synchronization.md`](docs/method/synchronization.md#this-scheme-replaced-an-earlier-one).

## The one idea

> What a person asked for and what follows from it are two different kinds of
> fact, and a configurator that keeps them in one field cannot answer the
> question a person most often has.

Ask for a hospital lift and the usage profile becomes near-continuous, the
rescue system becomes a full battery backup, and five of the seven rated loads
disappear. None of that was chosen. The canvas therefore has three sections —
**asserted**, **follows from that** (with the rule that forces it), and
**still open** — and that grouping is a property of the current state, not of
the catalogue.

Everything else in the design follows from taking that seriously:

- [`Asserting`](docs/concepts/asserting.md) records assertions a party made — the case's name for it; it was `Specifying` until 2026-09-08. It validates nothing and solves nothing.
- [`Conversing`](docs/concepts/conversing.md) records what a party said, in order. Nothing reads it yet; the point is that the log's first entry for a turn is the person's words rather than the model's tool call.
- [`Constraining`](docs/concepts/constraining.md) holds the rules and answers what they still allow. z3 lives here.
- An assertion that cannot be met is **still recorded**, and the conflict is put to the person through [`Deciding`](docs/concepts/deciding.md) rather than resolved by the last write winning.

## Architecture

A Next.js frontend at the root, a Python agent in `agent/`, and the concept
layer beside the agent.

```
├── src/
│   ├── app/
│   │   ├── page.tsx                      # wires the providers together
│   │   └── api/
│   │       ├── copilotkit/[[...slug]]/   # CopilotKit runtime
│   │       └── configurator/[...path]/   # proxy onto the concept layer
│   ├── components/
│   │   ├── configurator/                 # the canvas
│   │   │   ├── provider.tsx              # reads /view, performs gestures
│   │   │   ├── index.tsx                 # the three sections
│   │   │   ├── totals.tsx                # price and carbon
│   │   │   ├── question.tsx              # the open Deciding questions
│   │   │   └── variables.tsx             # asked / follows / open rows
│   │   ├── example-layout/               # chat + canvas, mode from Moding
│   │   └── generative-ui/                # other showcase features
│   └── hooks/
├── agent/
│   ├── concepts/          # one module per concept — MSM §5.2.1
│   ├── syncs/             # seeding, gestures, propagation, conduct
│   ├── engine/            # log, flows, provenance, dispatch — do not edit
│   ├── catalogue/         # elevator.json
│   ├── wiring.py          # discovers concepts, wires rules, reads the catalogue
│   ├── views.py           # the read side (WYSIWID §6.4) — invokes nothing
│   ├── webapp.py          # POST /gesture, GET /view — mounted by langgraph.json
│   ├── tools.py           # the model's four tools
│   ├── hearing.py         # the chat message, as a person's `say` gesture
│   ├── instance.py        # the one engine both actors share
│   └── main.py            # the graph
└── docs/                  # the method, the concepts, the rules, the analysis
```

### The rules that make this work

**Concepts never import each other.** Every interaction is a rule in
`agent/syncs/`. If you find yourself wanting to read another concept's state
from inside a concept, that is a synchronization you have not written yet.

**Only the bootstrap concept initiates.** `Copiloting.gesture` (a person) and
`Copiloting.invoke` (the model) are the only root actions. There is no HTTP
route per concept action and no tool that changes state directly — a tool
records that the model asked, and a rule decides what follows.

**Reads are not actions.** The price total and the carbon footprint are
calculations over exposed state, in `agent/views.py`. Nobody performs *compute
the total*.

**Do not edit `agent/engine/`.** MSM §5.2.4 observed that no case of an agent
modifying engine code to get a behaviour was ever legitimate. Behaviour belongs
in a concept or a rule.

### Two root actors, and what each may do

|  | person | model |
|---|---|---|
| assert or withdraw a value | yes | yes |
| propose a completion | — | yes |
| **adopt one** | **yes** | **no** |
| change a price or the catalogue | no | no |

Every `no` is the absence of a rule, not a prohibition — the DSL has no way to
write one, and an action no rule invokes does not happen. So *can the assistant
change a price?* is answered by reading the `then` clauses of
[`agent/syncs/conduct.py`](agent/syncs/conduct.py), not by reasoning about what
a language model might infer from a prompt.

### The log

Every action is recorded with its actor and the rule that authorised it. The
canvas reads those provenance edges directly: *you asked for this*, *the
assistant asked for this* and *adopted from a proposal* are three `via` values
on the same action, with no field anywhere recording which.

## Tech stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Agent**: LangGraph (Python), OpenAI
- **Solver**: z3-solver
- **CopilotKit**: React hooks for agent integration (v2)

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

## Design principles

1. **The specification comes first.** Argue the change in `docs/concepts/` or `docs/syncs/`, then regenerate.
2. **Pull apart rather than add.** MSM §5.1.1's repair for conflation is separation, and `worktree` is the model.
3. **State permissions, never prohibitions.** A prohibition is a permission you decline to write.
4. **Say what is wrong.** [`docs/conceptual-model.md`](docs/conceptual-model.md) §8 lists this design's own defects, and keeping that section current is what makes a later substitution visible.

## When extending this

- Write the concept in [`docs/concepts/`](docs/concepts/README.md) first. Check it against the three [bad smells](docs/method/objects.md#bad-smells) — the cheapest is whether the purpose needs an "and".
- Write the rules in [`docs/syncs/`](docs/syncs/README.md). If two concepts need to know about each other, they do not; a rule does.
- Then generate. One concept's specification is the whole context for generating it.
- Re-run [`docs/conceptual-model.md`](docs/conceptual-model.md) §3 against the change with the `concept-audit` skill, and say whether a verdict moved.

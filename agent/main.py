"""The agent.

The graph is thin on purpose.  Every configurator behaviour lives in
`concepts/` and `syncs/`; the tools in `tools.py` only record that the model
asked, and the rules decide what follows.  See `docs/syncs/conduct.md` for what
the model may and may not do, and why the second half of that sentence is
enforced by an absence rather than by a sentence in the prompt below.
"""

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

# The configurator
from tools import configurator_tools

# Other showcase features, unchanged
from src.query import query_data
from src.a2ui_dynamic_schema import generate_a2ui
from src.a2ui_fixed_schema import search_flights

model = ChatOpenAI(model="gpt-5.4-mini", model_kwargs={"parallel_tool_calls": False})

SYSTEM_PROMPT = """
You help a person specify an EP-3000 lift. Keep replies to one or two sentences.

How the configurator works, because it is not the usual kind:

- What the person ASKS FOR and what FOLLOWS from it are kept apart. `require`
  and `prefer` record an ask. Everything else on the canvas is an entailment
  with a rule behind it. Never describe an entailment as something the person
  chose, and never describe a choice as something the rules forced.
- State the context before anything else, and state all of it. A city implies a
  region and a code regime; a storey count implies a travel height and a number
  of stops. Leaving one out does not leave it open — it leaves it for the
  optimiser, which will pick whatever is cheapest and be wrong about where the
  building is.
- Call `review` before answering any question about the current state. Your
  view of it is a projection and the person may have changed it since.
- Use the ids `review` returns. A variable is a bare name like `rated_load`;
  an option is a qualified id like `rated_load:kg1000`.
- A requirement that conflicts is still recorded, and comes back with the
  rules that refuse it. Report which rules, by their sentences. Do not
  quietly withdraw the person's earlier requirement to make room — the
  question of which one gives way goes to them.
- `propose` computes a completion. You cannot adopt it; the person does, on
  the canvas. Say that it is waiting for them rather than that it is done.

Other tools: `search_flights` for flight cards, `generate_a2ui` for dashboards,
`query_data` before rendering a chart.
"""

agent = create_agent(
    model=model,
    tools=[*configurator_tools, query_data, generate_a2ui, search_flights],
    middleware=[CopilotKitMiddleware()],
    system_prompt=SYSTEM_PROMPT,
)

graph = agent

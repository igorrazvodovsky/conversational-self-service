"""main — discovers the concepts, wires the synchronizations, and reads the
catalogue in.

MSM §5.2.1's `src/main.ts`, which "discovers and registers all concepts" and
"wires all declared synchronizations".  It invokes no concept action.  The
catalogue's arrival is one stimulus of the bootstrap concept, `Copiloting/boot`,
and the rules in `syncs/seeding.py` carry it into the concepts, so every fact
the catalogue leaves reaches the log by way of a rule (MSM §5.2.3).

Why option identities are qualified.  The source file names options inside a
variable — `standard` is a service level, an energy package, a control panel
and a lead time, four different things spelled the same way.  An option is an
[individual](docs/method/individual.md), so it needs an identity that does not
collide, and `variable:value` is that identity.  WYSIWID §6.1 makes the same
move for the same reason and goes further, to full URIs.
"""

from __future__ import annotations

import json
from pathlib import Path

from concepts.asserting import Asserting
from concepts.binding import Binding
from concepts.cataloguing import Cataloguing
from concepts.constraining import Constraining
from concepts.conversing import Conversing
from concepts.deciding import Deciding
from concepts.deriving import Deriving
from concepts.detailing import Detailing
from concepts.filing import Filing
from concepts.footprinting import Footprinting
from concepts.framing import Framing
from concepts.handing_over import HandingOver
from concepts.moding import Moding
from concepts.naming import Naming
from concepts.pricing import Pricing
from concepts.profiling import Profiling
from concepts.quoting import Quoting
from concepts.reading import Reading
from concepts.showing import Showing
from concepts.specifying import Specifying
from concepts.staling import Staling
from concepts.stipulating import Stipulating
from engine import Engine
from engine.bootstrap import Copiloting
from syncs import binding, conduct, gestures, handover, propagation, reading, seeding, staling

CATALOGUE = Path(__file__).parent / "catalogue" / "elevator.json"

# One specification per running instance, and one workspace.  A configurator
# sold to anyone would need a specification per session, per customer and per
# revision; leaving that out is a scope decision, not a claim it does not
# matter.  See docs/concepts/README.md, "Not concepts".
SPEC = "spec"
WORKSPACE = "workspace"
GRIDS = {"grid_factor": "today", "grid_factor_decarbonising": "decarbonising"}
# The one basis the catalogue carries: the terms these figures are reckoned on.
# `Pricing` and `Footprinting` can hold a second, and this file seeds one.
BASIS = "catalogue"

# What is on by default is where a value comes from, which is what the canvas
# exists to tell apart; the rest waits to be asked for.  Seeded at boot like
# `Moding`'s surfaces: what a lens *can* show is the application's, what it
# *does* show is the viewer's.  See docs/concepts/showing.md.
FACETS: list[tuple[str, str, bool]] = [
    ("price", "what each option adds to the price, beside its label", False),
    ("carbon", "what each option adds to the carbon over the lift's life", False),
    ("excluded", "for each option ruled out, the rule that rules it out", False),
    ("consequences", "on a proposed value, what taking it would settle and cost", False),
    ("rules", "on a value that follows, the rule that forces it and the assertion it rests on", True),
    ("answers", "on an asserted value, the requirement it answers", True),
    ("how", "on an asserted value, who asserted it, and the words it was read from", True),
]


def build(path: Path = CATALOGUE) -> Engine:
    engine = Engine()
    for concept in (
        Copiloting(),
        Cataloguing(),
        Detailing(),
        Constraining(),
        Pricing(),
        Footprinting(),
        Asserting(),
        Specifying(),
        Binding(),
        Conversing(),
        # What a party brought, and what the model read from it or from
        # their words.  Neither is seeded: both start empty.
        Filing(),
        Reading(),
        # How a quantity read from the words is worked out, seeded with the
        # catalogue's methods.
        Deriving(),
        Deciding(),
        Quoting(),
        # The specification put into the seller's hands.  Nothing to seed,
        # and nothing receives one here (docs/syncs/handover.md).
        HandingOver(),
        # What is out of date, and by which change.  Nothing to seed.
        Staling(),
        Profiling(),
        Naming(),
        Stipulating(),
        Moding(),
        Showing(),
        # Nothing to seed: a lens with no frame shows everything.
        Framing(),
    ):
        engine.register(concept)
    _alias_assert(engine)
    engine.react(
        *seeding.rules,
        *propagation.rules,
        *binding.rules,
        *reading.rules,
        *gestures.rules,
        *conduct.rules,
        *handover.rules,
        *staling.rules,
    )

    catalogue = json.loads(path.read_text())
    engine.root(
        "Copiloting",
        "boot",
        actor="boot",
        catalogue=catalogue,
        basis=BASIS,
        grids=GRIDS,
        workspace=WORKSPACE,
        # The specification first: it is the one given attention, and it
        # holds what is asked for beside what answers it.  The quote is the
        # other: the offers, as they were made.  The conversation is not a
        # surface; where the chat sits is the person's view state, which no
        # rule reaches (docs/concepts/moding.md).
        surfaces=["canvas", "quote"],
        facets=[{"facet": f, "about": a, "shown": s} for f, a, s in FACETS],
        spec=SPEC,
    )

    engine.catalogue = catalogue
    engine.settled_at = engine.log.last_seq
    return engine


def _alias_assert(engine: Engine) -> None:
    """`Asserting/assert`, under the name the specification gives it.

    Python reserves `assert`, so the generated method is `assert_`.  The engine
    dispatches with `getattr(concept, action)` and is not edited for a language
    keyword — MSM §5.2.4 — so the alias is registered here, where the concepts
    are discovered.  Every rule invokes `assert`, and the log reads
    `Asserting/assert`.
    """
    asserting = engine.concepts["Asserting"]
    setattr(asserting, "assert", asserting.assert_)

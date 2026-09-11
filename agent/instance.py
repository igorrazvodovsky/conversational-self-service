"""The single running instance.

One engine, shared by the two root actors: the HTTP surface a person's browser
reaches (`webapp.py`) and the tools the model calls (`tools.py`).  Both go
through the same named actions and land in the same log, which is what makes
"who did this" answerable at all.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from journal import JOURNAL, keep  # noqa: E402
from wiring import SPEC, WORKSPACE, build  # noqa: E402

engine = build()

# What happened before this process started, applied again from the record of
# it, and everything from here on kept the same way.  See `journal.py`.
REPLAYED = keep(engine, JOURNAL)
if REPLAYED:
    print(f"journal: replayed {REPLAYED} records from {JOURNAL}", file=sys.stderr)

__all__ = ["engine", "SPEC", "WORKSPACE"]

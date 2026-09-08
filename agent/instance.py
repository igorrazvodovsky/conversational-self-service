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

from wiring import SPEC, WORKSPACE, build  # noqa: E402

engine = build()

__all__ = ["engine", "SPEC", "WORKSPACE"]

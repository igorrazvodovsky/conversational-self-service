# A11y Verification Report

This report compiles the compliance evidence for the configurator's interface: the artifact panel (requirements, configuration, quotes), the chat, and the printable proposal.

> This report is a **versioned project record** — never add it to `.gitignore`. Evidence hidden from version control is not evidence: QA and leadership verify it before release, and audits read it after.

> **Marking legend (mandatory):**
> `[x]` verified, with the evidence described beside it · `[!]` verified and **failed** (fix it, or open an entry in `EXCEPTIONS.md`) · `[~]` partially verified, with what is missing written down · `[ ]` **not verified** — the reason MUST be written beside it.
> Marking `[x]` without reproducible evidence invalidates the whole report.

---

## 📌 Validation Context
- **Feature/Epic:** Whole UI — artifact panel (requirements, configuration, quotes), chat, printable proposal (`/quotes/[quote]`)
- **Test Date:** 10/05/2026
- **Covers interface as of:** `dad1f67` plus the uncommitted accessibility changes of this revision
- **Standard version:** 2.2.0
- **Compliance Status:** ⚠️ CONDITIONAL — automated and keyboard checkpoints pass; screen reader and voice control have not been run by a person
- **Verification Independence:** fresh-context — *who verified: Claude Code agents with no access to the session that made the changes, in headless Chrome over the repository: one reproduced sections 1, 2 and 4 on the earlier revision, a second re-checked every fix made after it (landmark naming in all states, focus on `main`, clause-link focus, reflow at 320 px and 200 % text, ledger edge, status regions with the chat hidden, names, axe). The header-wrap fix that followed the second pass was re-measured by the generating session only (no overlaps at 320 px and 200 % text; desktop header one row).*
- **Static gate (`verify-a11y.py`):** FAIL (1 error, 35 warnings) — the error is the `InputGroupAddon` click-to-focus `div` in a shadcn primitive (`src/components/ui/input-group.tsx`), kept per `A11Y-DECISIONS.md`; the warnings are `outline-none` in primitives and the editor (each overridden by the app-wide `:focus-visible` outline, measured), and contrast hexes absent from the source because the tokens are oklch resolved at runtime — *run on: 10/05/2026.*

Profile: Standard (AA), taken as the A11Y.md default; recorded in `A11Y-DECISIONS.md`.

## 1. Technical Verification (Automated & Semantics)
- [x] **Axe-Core / Lighthouse:** axe-core (the chrome-devtools plugin's copy), tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa best-practice` plus `label-content-name-mismatch`, on each surface with every collapsible opened, light and dark, and on `/quotes/q3`. Zero critical. One serious `target-size` remains on the configuration, a false positive recorded in `A11Y-DECISIONS.md` (an inline clause link's box extends past its clipped line). On `/quotes/q3` the only findings are inside `cpk-web-inspector`, CopilotKit's development inspector, which is not this application's UI and is drawn on local runs only.
- [x] **HTML Semantics:** no `onClick` on a non-native element in app code; the quotes table's selectable row has a native button in its first cell and is no longer a tab stop. `verify-a11y.py` flags `InputGroupAddon` (shadcn primitive) whose click only focuses a field the keyboard reaches directly — recorded in `A11Y-DECISIONS.md`.
- [x] **Heading Hierarchy (H1-H6):** one visually hidden `h1` in the panel's `main`, rendered by the layout in every state (loading, empty, refused) and naming the `main`; the surfaces' headings start at `h2`, `h3` under them; the embedded proposal starts at `h3`, the printable page at `h1`. Measured from the rendered DOM.

## 2. Tab Order and Focus Management
- [x] **Focus Indicator:** one unlayered `:focus-visible` outline, 2px, `--ring`; measured on every stop of a 45-stop Tab run (`outline: solid/2px`). A link in a one-line clamped row unclips the row while focused, so its ring is whole (the verifier found it clipped to a 2px tick; fixed and re-measured). The panel's `main`, when it takes focus, is ringed inside its edge. `--ring` against every surface level: ≥4.28:1 light, ≥5.68:1 dark (table in §4).
- [x] **Logical Navigation:** fresh load → *Skip to the panel*, *Skip to the chat*, the panel nav, *Showing*, then the configuration card by card (Take back → clause links → Change → What followed). Skip links land on the panel's `main` (named by the surface's `h1`) and the composer. Nav to a surface lands on the `main`; nav to a section, or any address link, lands on the item. Moving a clause by its buttons keeps focus on the move button; striking one moves focus to the next clause; answering a question moves it to *Asserted* (canvas) or the composer (chat).
- [x] **Captured Focus (Modals/Overlays):** no modal dialogs in the app. Menus are Radix `DropdownMenu` (focus managed, Escape closes). The floating chat is deliberately not a dialog (no trap, canvas stays live), per `docs/ui.md`.

## 3. Behavior and Task Return
- [ ] **Screen Reader Test:** not run — the verifying agents have no screen reader. To be run by the product owner or a tester with NVDA + Firefox and VoiceOver + Safari, using the *Expected behavior* scenarios of `guide-generative-ui.md` (chat), `guide-navigation.md` (landmarks, skip links, surface change), `guide-tables.md` (quotes, comparison, milestones, proposal scope) and `guide-buttons.md`.
  - Pair(s) used: —
  - Who ran it and when: —
  - Scenarios run: —
- [~] **Voice Control:** names read against visible labels from the DOM: every control with visible text has a name that begins with it (hidden context is appended after, never substituted); `label-content-name-mismatch` reports nothing in app code. Not run with Voice Control or Voice Access.
  - Tool or method: read accessible names against visible labels (axe rule plus DOM dump)
- [~] **Interactive states inventoried:**
  - Collapsibles (Change, open rows, Breakdown, Addressee, Sources): navigated, `aria-expanded` live.
  - Dropdown menus (Showing, conversations, chat layout, clause firmness): code-read; radio state from Radix.
  - `@` reference list in the editor: code-read — `aria-controls`, `aria-autocomplete`, `aria-activedescendant` set on the editor while it is open; not navigated with a screen reader.
  - Question cards (conflict, completion): code-read, no question was pending during verification.
  - Request a quotation, unavailable: code-read (`aria-disabled` + visible reason via `aria-describedby`); the state was not reachable with the current journal.
  - Refused gesture alert: code-read; not triggered.
- [x] **Status Change (`aria-live`):** two polite `role="status"` regions mounted at load (canvas changes and questions; the assistant's run), the transcript a `role="log"` with `aria-busy` during a run, speaker text per turn, a refused gesture `role="alert"`. Verified present in the DOM with a loaded conversation; announcements not heard (see screen reader).
- [x] **Form Filling:** Addressee fields wrapped in `label`, `autocomplete` tokens (`name`, `organization`, `street-address`, `email`, `tel`), required ones marked in text and `aria-required`; composer and editor named (`aria-label`), the editor described by its key hint.

## 4. Visual Perception and Comprehension
- [x] **Text & UI Contrast:** token colours resolved to sRGB in the browser and computed with `tools/contrast-check.py`. Worst level shown for each pair.
  | Pair | Foreground | Background | Ratio | Floor | Result |
  | :--- | :--- | :--- | ---: | ---: | :--- |
  | body text, light | #09090b | #ffffff | 19.90:1 | 4.5:1 | ✅ |
  | secondary text on frame, light | #686872 | #f1f1f4 | 4.89:1 | 4.5:1 | ✅ |
  | secondary text on sunken, light | #686872 | #f1f1f3 | 4.88:1 | 4.5:1 | ✅ |
  | focus ring on frame, light | #71717b | #f1f1f4 | 4.28:1 | 3:1 | ✅ |
  | text-field edge on frame, light | #83838c | #f1f1f4 | 3.33:1 | 3:1 | ✅ |
  | text-field edge on card, light | #86868e | #ffffff | 3.61:1 | 3:1 | ✅ |
  | body text, dark | #fafafa | #09090b | 19.06:1 | 4.5:1 | ✅ |
  | secondary text on muted, dark | #9f9fa9 | #27272a | 5.68:1 | 4.5:1 | ✅ |
  | focus ring on card, dark | #9f9fa9 | #18181b | 6.75:1 | 3:1 | ✅ |
  | text-field edge on frame, dark | #808088 | #050506 | 5.20:1 | 3:1 | ✅ |
  | text-field edge on ground, dark | #82828a | #101012 | 4.99:1 | 3:1 | ✅ |
- [x] **Redundancy:** ruled-out options, the current value, a yielded value, a value chip that answers its clause, a ruled-out `@` offer, the moved mark and the selected quote each carry words (visible or visually hidden) besides strike, dimming or colour. No status uses colour (`docs/ui.md`).
- [~] **Scale / Zoom:** reflow at 320 CSS px: `scrollWidth` equals the viewport, no horizontal page scroll (the panel nav scrolls inside itself). Text spacing overrides (1.5 / 2em / 0.12em / 0.16em): no clipped container. 200% text zoom: at 320 CSS px with text at 200%, the panel's nav wraps onto its own lines and the chat's header shrinks its conversation label, so every place and control stays in view; suggestion pills wrap; nothing overlaps (measured, and checked by screenshot). Not checked with browser page zoom on a real display.

## 5. Time-Based Media and Motion
N/A — no time-based media. Motion: with `prefers-reduced-motion: reduce`, transitions and animations settle at once (button transition 0.15s → 0.00001s, spinner 1 iteration), measured in headless Chrome.

## 6. Cognitive Load and Flow
- [x] **Nothing to remember:** no authentication; the specification survives reloads and conversations.
- [x] **Nothing to retype:** the Addressee form is filled from what is on record and offers browser autofill.
- [x] **Help in the same place:** the chat is in the same place on every surface.
- [x] **Text spacing:** see §4.
- [x] **Timing:** no time limits; a quotation's validity is a commercial term, not an interface timeout.
- [x] **Conflicting needs:** none arbitrated.

---
## 📝 Assessment Notes or Known Blockers
- **Note 1:** No `EXCEPTIONS.md`: no WCAG SC was knowingly left failing.
- **Note 2:** The project has no ESLint configuration, so `eslint-plugin-jsx-a11y` was not run; axe and `verify-a11y.py` stand in for it.
- **Note 3:** Lower-severity items left as they are: a clause's source words exist only in `title` (the words are also on the sources list); a clamped clause line on a quote's *Against what was asked* shows its full text only in `title`.
- **Note 4:** The A2UI flight card's logo takes its `alt` from the payload's airline name, next to the same name as text. Whether it is decorative is a human decision not taken here.
- **Note 5:** The chat transcript's `role="log"` is mounted with the first message: an empty thread shows the welcome screen instead. The first message is the person's own; every later addition, the assistant's replies included, lands in a log already mounted, and the run announcer says when a reply starts and ends.
- **Note 8:** Loading the page with `#quotes` in the address shows the configuration: `quotes` is not an item address, and the surface is held by the concept layer. A behaviour question, not an accessibility failure.
- **Note 6:** axe's best-practice `region` rule notes the split handle (`role="separator"`, named *Resize the chat*) sits between the two landmarks; it belongs to neither.
- **Note 7:** Clause links in one-line rows are inline text on a short line pitch; SC 2.5.8's inline exception is relied on (`A11Y-DECISIONS.md`).

### Independent verification
A fresh agent, without this session's context, reproduced sections 1, 2 and 4 and reported, among others: clipped focus rings on clause links, suggestion pills overflowing at 320 px and 200 % text, focus sent to a visually hidden `h1`, the requirement ledger without a 3:1 edge, the panel nav scrolling sideways when narrow, identical consecutive announcements not repeated, an unnamed split handle and tab list, and two controls named *New conversation*. Each was fixed and re-measured in this revision, except the items recorded in the notes above. Its contrast figures matched this report's table. A second fresh agent confirmed those fixes and found one more overlap (the panel nav and *Showing* at 320 px and 200 % text), fixed by letting that row wrap.

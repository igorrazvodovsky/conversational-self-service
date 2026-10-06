/**
 * The ledger flow, end to end, on two builds of the app side by side.
 *
 * The same person's task is run through the page against each build, from
 * the same state: two requirements in the person's words and one value
 * asserted with nothing said about what for. The task is the one the case's
 * slice 1 is about — answer a requirement, check what the answer is for and
 * what it forced, find what is still unanswered and what answers nothing,
 * write a new requirement and answer it — and each step is a click or a
 * keystroke on the page, not a call to the API. Neither build is told where
 * to start: both begin where the app boots, and the person looks for each
 * requirement on the surface in front of them, going by the panel's nav only
 * when it is not there.
 *
 * What is compared is the information architecture, as properties of what
 * the page shows rather than of how it is drawn:
 *
 * - *the choice is one unit*: the requirement, the value answering it and
 *   what the value forced are inside one element that fits on the screen;
 * - *both gaps on one view*: the unanswered requirement and the value
 *   answering nothing are visible without changing surface;
 * - *a link from the chat lands on the choice*: following the address a
 *   reply would use puts the requirement, its answer and what it forced in
 *   view together;
 * - *a reading lands where it is shown*: when the assistant reads
 *   requirements from a document, the surface its read brings forward shows
 *   them, the one it answered and the one it found nothing for;
 * - *what it cost*: clicks and surface changes, step by step and in all.
 *
 * Each build runs against its own agent, with a throwaway journal
 * (`AGENT_JOURNAL`): an agent offers the surfaces its own frontend draws, and
 * the reset strikes every clause and discards the specification. See
 * `e2e/README.md`.
 *
 *   BEFORE=http://localhost:3101 AFTER=http://localhost:3102 node e2e/ledger-flow.cjs
 *
 * Exits non-zero when the new build lacks a property, or when the task
 * fails on either build. The old build lacking one is the finding, and is
 * reported, not failed.
 */

const fs = require("node:fs");
const path = require("node:path");

function loadPuppeteer() {
  try {
    return require("puppeteer-core");
  } catch {
    const cache = path.join(
      process.env.HOME,
      ".claude/plugins/cache/claude-plugins-official/chrome-devtools-mcp",
    );
    const version = fs.readdirSync(cache).sort().at(-1);
    return require(path.join(cache, version, "node_modules/puppeteer-core"));
  }
}

const puppeteer = loadPuppeteer();
const CHROME =
  process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BUILDS = {
  before: process.env.BEFORE ?? "http://localhost:3101",
  after: process.env.AFTER ?? "http://localhost:3102",
};
const OUT = process.env.OUT ?? path.join(__dirname, "out");

const BED = "A bed must fit, with a porter beside it";
const QUIET = "Quiet enough for night shifts on the ward";
const LOAD = "1600 kg";
const DRIVE = "Gearless traction, machine-room-less";
const STEEL = "Doors that stand up to trolleys";
const FINISH = "Brushed stainless steel";
const DOORS = "The doors must be brushed stainless steel.";
const SMOOTH = "The ride must feel smooth to a patient lying down.";
const TWOFOLD = "Centre-opening doors, 1100 mm clear, for beds.";

// -- the concept layer, for setting up and for checking what was recorded ----

async function api(base, route, body) {
  const response = await fetch(`${base}/api/configurator/${route}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${route}: ${response.status}`);
  return response.json();
}

const gesture = (base, g) => api(base, "gesture", g);
const view = (base) => api(base, "view");

/** The same starting state on either build, on the surface the app boots to. */
async function reset(base) {
  let v = await view(base);
  for (const clause of v.clauses) await gesture(base, { act: "strike", clause: clause.clause });
  await gesture(base, { act: "unframe" });
  await gesture(base, { act: "discard" });
  await gesture(base, { act: "start" });
  await gesture(base, { act: "require", text: BED });
  await gesture(base, { act: "require", text: QUIET });
  await gesture(base, { act: "assert", variable: "building_type", option: "building_type:hospital" });
  await gesture(base, { act: "focus", surface: "canvas" });
  v = await view(base);
  const asked = v.variables.filter((x) => x.asked).map((x) => x.name);
  if (v.clauses.length !== 2 || asked.join() !== "building_type")
    throw new Error(`reset left ${v.clauses.length} clauses and ${asked}`);
}

async function until(fn, what, ms = 30000) {
  const start = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// -- the page ------------------------------------------------------------------

/** The button starting with `label` nearest the words `within` on the surface, or anywhere on it. */
function findButton(page, label, within) {
  return page.evaluateHandle(
    ({ label, within }) => {
      const main = document.querySelector("main");
      const match = (b) => !b.disabled && b.textContent.trim().startsWith(label);
      if (!within) return [...main.querySelectorAll("button")].find(match) ?? null;
      const holder = [...main.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && e.textContent.includes(within) && e.offsetParent !== null,
      );
      for (let e = holder; e && e !== main; e = e.parentElement) {
        const b = [...e.querySelectorAll("button")].find(match);
        if (b) return b;
      }
      return null;
    },
    { label, within },
  );
}

const surface = (page) => page.evaluate(() => document.title.split(" · ")[0]);

const holds = (page, text) =>
  page.evaluate((t) => document.querySelector("main").textContent.includes(t), text);

/** Whether each of `texts` is on screen, inside the viewport. */
const inView = (page, texts) =>
  page.evaluate((texts) => {
    const main = document.querySelector("main");
    const seen = (t) =>
      [...main.querySelectorAll("*")].some((e) => {
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(t)))
          return false;
        const box = e.getBoundingClientRect();
        return box.height > 0 && box.bottom > 0 && box.top < window.innerHeight;
      });
    return Object.fromEntries(texts.map((t) => [t, seen(t)]));
  }, texts);

/**
 * The smallest element on the surface holding every one of `texts`, and
 * whether it fits on the screen: the measure of whether they are one unit.
 */
function smallestHolding(page, texts) {
  return page.evaluate((texts) => {
    const main = document.querySelector("main");
    const all = [main, ...main.querySelectorAll("*")].filter((e) =>
      texts.every((t) => e.textContent.includes(t)),
    );
    if (!all.length) return null;
    const e = all.at(-1);
    const box = e.getBoundingClientRect();
    return {
      tag: e.tagName.toLowerCase(),
      height: Math.round(box.height),
      fits: box.height <= window.innerHeight,
      isSurface: e === main,
    };
  }, texts);
}

/** One person, on one build: every click and every surface they pass through. */
function person(page) {
  const me = { clicks: 0, trail: [] };
  let current = null;
  const note = async () => {
    const s = await surface(page);
    if (me.trail.at(-1) !== s) me.trail.push(s);
  };
  me.begin = async () => {
    await note();
    current = { clicks: 0, start: me.trail.length - 1 };
  };
  me.end = () => ({
    clicks: current.clicks,
    surfaceChanges: me.trail.length - 1 - current.start,
    trail: me.trail.slice(current.start),
  });
  const count = () => {
    me.clicks++;
    if (current) current.clicks++;
  };
  me.press = count;
  me.click = async (label, within) => {
    // Controls are disabled while a gesture settles; a person waits.
    const b = await until(
      async () => {
        const h = await findButton(page, label, within);
        return (await h.evaluate((x) => !!x)) ? h : null;
      },
      `a button "${label}"${within ? ` near "${within}"` : ""}`,
      10000,
    );
    await b.evaluate((x) => x.click());
    count();
    await pause(400);
    await note();
  };
  /** Go to a place in the panel's nav, as a person does. */
  me.go = async (place) => {
    const went = await page.evaluate((place) => {
      const link = [...document.querySelectorAll('nav[aria-label="Panel"] a')].find((a) =>
        a.textContent.trim().startsWith(place),
      );
      link?.click();
      return !!link;
    }, place);
    if (!went) throw new Error(`no place "${place}" in the panel's nav`);
    count();
    await pause(1500);
    await note();
  };
  /**
   * Find what the person needs where they are — a requirement's Answer, or
   * the field requirements are written in — and failing that, go to the
   * place in the nav that names requirements, if the build has one.
   */
  me.find = async (words, label = "Answer") => {
    const here = () =>
      words
        ? findButton(page, label, words).then((h) => h.evaluate((x) => !!x))
        : page.evaluate(() => !!document.querySelector('main [aria-label="Your requirements"]'));
    if (await here()) return;
    const places = await page.evaluate(() =>
      [...document.querySelectorAll('nav[aria-label="Panel"] a')].map((a) => a.textContent.trim()),
    );
    if (!places.some((p) => p.startsWith("Requirements")))
      throw new Error(`"${words}" is nowhere the person can go`);
    await me.go("Requirements");
    if (!(await here())) throw new Error(`"${words ?? "the requirements"}" not on the requirements`);
  };
  /** Answer a requirement with an option of a variable, from where the person is. */
  me.answer = async (base, words, row, option, value) => {
    await me.find(words);
    await me.click("Answer", words);
    await until(async () => (await view(base)).frame?.by === "clause", "the clause frame");
    await until(() => holds(page, row), `the ${row} row`);
    await me.click(row);
    await me.click(option);
    await until(async () => {
      const v = await view(base);
      return v.clauses.find((c) => c.text === words)?.answers.some((a) => a.value === value);
    }, "the answer on record");
    await me.click("Show everything");
    await until(async () => !(await view(base)).frame, "the frame off");
  };
  return me;
}

/** The place in the nav for the part of the specification values are on. */
const valuesPlace = (surfaces) => surfaces.find((p) => p !== "Requirements" && p !== "Quotes");

// -- the run -------------------------------------------------------------------

async function run(name, base) {
  await reset(base);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // The MCP-B relay admits one origin, the app's own port; a build served
  // on another is refused by it, which says nothing about the page.
  page.on(
    "console",
    (m) => m.type() === "error" && !m.text().includes("webmcp-relay") && errors.push(m.text()),
  );
  const me = person(page);
  const shot = (stage) => page.screenshot({ path: path.join(OUT, `${name}-${stage}.png`) });
  const result = { build: name, base, ok: true, errors };

  try {
    await page.goto(base, { waitUntil: "networkidle2", timeout: 120000 });
    await until(() => holds(page, "Follows from that"), "the page", 120000);
    result.startsOn = await surface(page);
    result.surfaces = await page.evaluate(() =>
      [...document.querySelectorAll('nav[aria-label="Panel"] a')]
        .map((a) => a.textContent.replace(/\s*\d+$/, "").trim())
        .filter((p) => p === "Requirements" || p === "Quotes" || p.startsWith("Asserted") || p.startsWith("Asked for")),
    );

    // 1. Answer the bed requirement with 1600 kg.
    await me.begin();
    await me.answer(base, BED, "Rated load", LOAD, "rated_load:kg1600");
    result.answer1 = me.end();
    await shot("answered");

    // 2. What is the answer for, and what did it force? Read off the
    //    surface the task left the person on.
    const v2 = await view(base);
    const forced = v2.variables
      .filter((v) => v.standing === "follows" && v.following.some((f) => f.variable === "rated_load"))
      .map((v) => v.options.find((o) => o.id === v.value)?.label ?? v.value);
    const unit = await smallestHolding(page, [BED, LOAD, forced[0]].filter(Boolean));
    result.unit = { forced, holder: unit, one: !!unit && !unit.isSurface && unit.fits };

    // 3. What is still unanswered, and what answers nothing? On the surface
    //    the person is on, then on each other place in the nav.
    const seen = async () => ({
      unanswered: (await holds(page, QUIET)) && (await holds(page, "Not yet answered")),
      unbound:
        (await holds(page, "Hospital")) &&
        ((await holds(page, "answers no stated requirement")) ||
          (await holds(page, "Answering no stated requirement"))),
    });
    const gaps = { [await surface(page)]: await seen() };
    await shot("gaps");
    await me.begin();
    for (const place of result.surfaces.filter((p) => p !== "Quotes")) {
      await me.go(place);
      const title = await surface(page);
      if (!gaps[title]) gaps[title] = await seen();
    }
    result.looked = me.end();
    result.gaps = { gaps, together: Object.values(gaps).some((g) => g.unanswered && g.unbound) };

    // 4. Answer the other requirement, from where the values are.
    await me.go(valuesPlace(result.surfaces));
    await me.begin();
    await me.answer(base, QUIET, "Drive type", DRIVE, "drive:gearless_mrl");
    result.answer2 = me.end();

    // 5. Write a new requirement and answer it, from where it was written.
    await me.begin();
    await me.find(null);
    await page.evaluate(() => {
      const lines = document.querySelectorAll('main [aria-label="Your requirements"] [data-node-view-content]');
      const last = lines[lines.length - 1];
      last.closest('[contenteditable="true"]').focus();
      const range = document.createRange();
      range.selectNodeContents(last);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    me.press();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type(STEEL);
    // Leaving the line sends it, as a person moving on does.
    await page.evaluate(() => document.activeElement.blur());
    await until(async () => (await view(base)).clauses.some((c) => c.text === STEEL), "the new requirement");
    await pause(1000);
    await me.answer(base, STEEL, "Door finish", FINISH, "door_finish:brushed_ss");
    result.write = me.end();
    await shot("written");

    // 6. A reply links the answer to the bed requirement; the person
    //    follows it. Each build's reply uses the address its prompt names
    //    for a value: the variable before, the choice after.
    const v6 = await view(base);
    const bedChoice = v6.clauses.find((c) => c.text === BED).answers[0].choice;
    const hasChoice = await page.evaluate(() => !!document.querySelector('[id^="choice:"]'));
    const link = hasChoice ? `#choice:${bedChoice}` : "#variable:rated_load";
    await page.evaluate((link) => {
      const a = document.createElement("a");
      a.href = link;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, link);
    await pause(2500);
    const landed = await inView(page, [BED, LOAD, forced[0]].filter(Boolean));
    result.link = {
      link,
      surface: await surface(page),
      landed,
      together: Object.values(landed).every(Boolean),
    };
    await shot("linked");

    // 7. The keyboard on a control set into the ledger: Enter on a card's
    //    Change opens its options and adds no requirement.
    const clausesBefore = (await view(base)).clauses.length;
    const change = await findButton(page, "Change", LOAD);
    await change.evaluate((b) => b.focus());
    await page.keyboard.press("Enter");
    await pause(800);
    const opened = await change.evaluate((b) => b.getAttribute("aria-expanded") === "true");
    const clausesAdded = (await view(base)).clauses.length - clausesBefore;
    result.keyboard = { opened, clausesAdded, ok: opened && clausesAdded === 0 };
    await page.keyboard.press("Enter");
    await pause(500);

    // 8. The assistant reads requirements from a document the person
    //    attached, one it finds an answer for and one it finds nothing for.
    //    The call is the model's tool, made through `/invoke`, so no model
    //    runs. The page polls only while its own assistant runs, so it is
    //    loaded again on the state the reads left.
    await gesture(base, {
      act: "file",
      name: "brief.txt",
      text: `${DOORS} ${SMOOTH} ${TWOFOLD}`,
    });
    const file = (await api(base, "digest")).files.at(-1).file;
    await api(base, "invoke", { tool: "read", words: DOORS, answer: ["door_finish:brushed_ss"], file });
    await api(base, "invoke", { tool: "read", words: SMOOTH, answer: [], file });
    await until(async () => (await view(base)).clauses.length === clausesBefore + 2, "the readings as clauses");
    await page.reload({ waitUntil: "networkidle2" });
    await until(() => holds(page, "Follows from that"), "the page again", 60000);
    await pause(1000);
    result.read = {
      surface: await surface(page),
      answered: await holds(page, DOORS),
      unanswerable: await holds(page, SMOOTH),
    };
    result.read.both = result.read.answered && result.read.unanswerable;
    await shot("read");

    // 9. A requirement two values answer, framed on one of them: the other
    //    still stands, and the page must not say otherwise.
    await api(base, "invoke", {
      tool: "read",
      words: TWOFOLD,
      answer: ["door_type:center_2", "door_width:d1100"],
      file,
    });
    await gesture(base, { act: "frame", frame: { by: "assertion", variable: "door_width" } });
    await page.reload({ waitUntil: "networkidle2" });
    await until(() => holds(page, "Follows from that"), "the page once more", 60000);
    await pause(1000);
    const twofold = (await view(base)).clauses.find((c) => c.text === TWOFOLD);
    const calledWithdrawn = await holds(page, "no longer asserted");
    result.framed = {
      truthful: !!twofold && twofold.answers.every((a) => a.standing === "asked") && !calledWithdrawn,
    };
    await shot("framed");
    await gesture(base, { act: "unframe" });
    await page.reload({ waitUntil: "networkidle2" });
    await until(() => holds(page, "Follows from that"), "the page unframed", 60000);
    await pause(1000);

    // What the build is: whether the requirements are a surface, how many
    // ways to answer each requirement the page offers on all its surfaces,
    // and whether a requirement's wording is editable on the line its
    // answers are on.
    const countAnswers = () =>
      page.evaluate(
        (texts) =>
          Object.fromEntries(
            texts.map((t) => [
              t,
              [...document.querySelectorAll("main button")].filter((b) => {
                // The answering control is an icon on the new build, named by its label.
                const name = b.getAttribute("aria-label") || b.textContent.trim();
                if (!/^(Answer|Change answer|Answering|Look|Show everything again)/.test(name)) return false;
                const line = b.closest("[data-node-view-wrapper], [role=listitem]");
                return !!line && line.textContent.includes(t);
              }).length,
            ]),
          ),
        [BED, QUIET, STEEL],
      );
    const controls = await countAnswers();
    if (result.surfaces.includes("Requirements")) {
      await me.go("Requirements");
      const there = await countAnswers();
      for (const t of Object.keys(there)) controls[t] += there[t];
      await me.go(valuesPlace(result.surfaces));
    }
    const refused = await gesture(base, { act: "focus", surface: "requirements" });
    result.shape = {
      answerControls: controls,
      requirementsSurface: result.surfaces.includes("Requirements"),
      focusRequirementsRefused: !refused.did.some((d) => d.concept === "Moding" && !d.error),
      wordsBesideAnswers: await page.evaluate(
        ({ bed, load }) => {
          const line = [...document.querySelectorAll("main [data-node-view-wrapper]")].find((e) =>
            e.textContent.includes(bed),
          );
          return (
            !!line && !!line.querySelector("[data-node-view-content]") && line.textContent.includes(load)
          );
        },
        { bed: BED, load: LOAD },
      ),
    };
    await gesture(base, { act: "focus", surface: "canvas" });

    result.total = { clicks: me.clicks, surfaceChanges: me.trail.length - 1 };
    return result;
  } catch (e) {
    await shot("failed").catch(() => {});
    return { ...result, ok: false, error: String(e) };
  } finally {
    await browser.close();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = {};
  for (const [name, base] of Object.entries(BUILDS)) results[name] = await run(name, base);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));

  const yes = (b) => (b ? "yes" : "no");
  const step = (s) =>
    `${s.clicks} clicks, ${s.surfaceChanges} surface changes${s.surfaceChanges ? ` (${s.trail.join(" → ")})` : ""}`;
  const row = (label, f) =>
    `| ${label} | ${["before", "after"].map((b) => (results[b].ok ? f(results[b]) : "failed")).join(" | ")} |`;
  const table = [
    "| | before | after |",
    "|---|---|---|",
    row("Surfaces", (r) => `${r.startsOn} first; nav: ${r.surfaces.join(", ")}`),
    row("Answer the first requirement", (r) => step(r.answer1)),
    row("Answer the second, starting from the values", (r) => step(r.answer2)),
    row("Write a requirement and answer it", (r) => step(r.write)),
    row("Requirement, answer and what it forced in one unit", (r) =>
      `${yes(r.unit.one)} (${r.unit.holder ? `${r.unit.holder.isSurface ? "the whole surface" : r.unit.holder.tag}, ${r.unit.holder.height}px` : "not on the surface"})`,
    ),
    row("Unanswered requirement and unbound value on one surface", (r) => yes(r.gaps.together)),
    row("A link from the chat shows requirement, answer and forced together", (r) =>
      `${yes(r.link.together)} (\`${r.link.link.replace(/:ch.*/, ":…")}\`)`,
    ),
    row("A reading, answered and unanswerable, on the surface it brings forward", (r) => yes(r.read.both)),
    row("Enter on a card's Change opens it, and adds no requirement", (r) => yes(r.keyboard.ok)),
    row("A co-answer outside the frame reported truthfully", (r) => yes(r.framed.truthful)),
    row("Requirements a surface of their own", (r) => yes(r.shape.requirementsSurface)),
    row("Ways to answer each requirement", (r) => Object.values(r.shape.answerControls).join(", ")),
    row("Wording editable on the line its answers are on", (r) => yes(r.shape.wordsBesideAnswers)),
    row("In all", (r) => `${r.total.clicks} clicks, ${r.total.surfaceChanges} surface changes`),
    row("Page errors", (r) =>
      r.errors.length ? `${r.errors.length}: ${[...new Set(r.errors)].map((e) => e.slice(0, 40)).join("; ")}…` : "0",
    ),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "comparison.md"), table + "\n");
  console.log(table);

  const failures = [];
  for (const b of ["before", "after"]) if (!results[b].ok) failures.push(`${b}: ${results[b].error}`);
  const after = results.after;
  if (after.ok) {
    const want = {
      "the choice is one unit": after.unit.one,
      "both gaps on one surface": after.gaps.together,
      "a link lands on the choice": after.link.together && after.link.link.startsWith("#choice:"),
      "a reading is on the surface it brings forward": after.read.both,
      "the keyboard works inside the ledger": after.keyboard.ok,
      "a co-answer outside the frame is reported truthfully": after.framed.truthful,
      "no requirements surface": !after.shape.requirementsSurface && after.shape.focusRequirementsRefused,
      "one way to answer each requirement": Object.values(after.shape.answerControls).every((n) => n === 1),
      "wording beside its answers": after.shape.wordsBesideAnswers,
      "no surface change answering":
        !after.answer1.surfaceChanges && !after.answer2.surfaceChanges && !after.write.surfaceChanges,
      // An error the older build also raises is not this change's.
      "no new page errors": after.errors.every((e) => results.before.errors?.includes(e)),
    };
    for (const [what, held] of Object.entries(want)) if (!held) failures.push(`after: ${what}`);
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
})();

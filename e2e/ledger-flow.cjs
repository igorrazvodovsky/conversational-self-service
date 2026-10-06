/**
 * The ledger flow, end to end, on two builds of the app side by side.
 *
 * The same person's task is run through the page against each build, from
 * the same state: two requirements in the person's words and one value
 * asserted with nothing said about what for. The task is the one the case's
 * slice 1 is about — answer a requirement, then check what the answer is for
 * and what it forced, then find what is still unanswered and what answers
 * nothing — and each step is a click on the page, not a call to the API.
 *
 * What is compared is the information architecture, as properties of what
 * the page shows rather than of how it is drawn:
 *
 * - *the choice is one unit*: the requirement, the value answering it and
 *   what the value forced are inside one element that fits on the screen;
 * - *both gaps on one view*: the unanswered requirement and the value
 *   answering nothing are visible without changing surface;
 * - *a reading lands where it is shown*: when the assistant reads
 *   requirements from a document, the surface its read brings forward shows
 *   them, the one it answered and the one it found nothing for;
 * - *what it cost*: clicks and surface changes the task took.
 *
 * Both builds share one agent, so the state is reset before each run. Point
 * them at an agent with a throwaway journal (`AGENT_JOURNAL`): the reset
 * strikes every clause and discards the specification.
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
const DOORS = "The doors must be brushed stainless steel.";
const SMOOTH = "The ride must feel smooth to a patient lying down.";

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

/** The same starting state on either build. */
async function reset(base) {
  let v = await view(base);
  for (const clause of v.clauses) await gesture(base, { act: "strike", clause: clause.clause });
  await gesture(base, { act: "unframe" });
  await gesture(base, { act: "discard" });
  await gesture(base, { act: "start" });
  await gesture(base, { act: "require", text: BED });
  await gesture(base, { act: "require", text: QUIET });
  await gesture(base, { act: "assert", variable: "building_type", option: "building_type:hospital" });
  await gesture(base, { act: "focus", surface: "requirements" });
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

/** Click the first enabled button whose text starts with `label`, inside the element holding `within`. */
async function click(page, label, within) {
  const done = await page.evaluate(
    ({ label, within }) => {
      const main = document.querySelector("main");
      let scope = main;
      if (within) {
        const holders = [...main.querySelectorAll("*")].filter(
          (e) => e.children.length === 0 && e.textContent.includes(within),
        );
        if (!holders.length) return false;
        // The nearest ancestor of the words that holds a matching button.
        let e = holders[0];
        while (e && e !== main) {
          const b = [...e.querySelectorAll("button")].find(
            (b) => !b.disabled && b.textContent.trim().startsWith(label),
          );
          if (b) {
            b.click();
            return true;
          }
          e = e.parentElement;
        }
        return false;
      }
      const b = [...scope.querySelectorAll("button")].find(
        (b) => !b.disabled && b.textContent.trim().startsWith(label),
      );
      if (!b) return false;
      b.click();
      return true;
    },
    { label, within },
  );
  if (!done) throw new Error(`no button "${label}"${within ? ` near "${within}"` : ""}`);
}

const surface = (page) => page.evaluate(() => document.title.split(" · ")[0]);

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
      id: e.id || null,
      height: Math.round(box.height),
      fits: box.height <= window.innerHeight,
      isSurface: e === main,
    };
  }, texts);
}

const holds = (page, text) =>
  page.evaluate((t) => document.querySelector("main").textContent.includes(t), text);

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
  let clicks = 0;
  const surfaces = [];
  const note = async () => {
    const s = await surface(page);
    if (surfaces.at(-1) !== s) surfaces.push(s);
  };
  const step = async (label, within) => {
    await click(page, label, within);
    clicks++;
    await new Promise((r) => setTimeout(r, 400));
    await note();
  };

  try {
    await page.goto(base, { waitUntil: "networkidle2", timeout: 120000 });
    await until(() => holds(page, BED), "the requirement on the page", 120000);
    await note();

    // Task 1: answer the bed requirement with 1600 kg, from where the
    // person wrote it.
    await step("Answer", BED);
    await until(async () => (await view(base)).frame?.by === "clause", "the clause frame");
    await until(() => holds(page, "Rated load"), "the rated load row");
    await step("Rated load");
    await step(LOAD);
    const answered = await until(async () => {
      const v = await view(base);
      const bed = v.clauses.find((c) => c.text === BED);
      return bed?.answers.some((a) => a.value === "rated_load:kg1600") ? v : null;
    }, "the answer on record");
    await step("Show everything");
    await until(async () => !(await view(base)).frame, "the frame off");
    await page.screenshot({ path: path.join(OUT, `${name}-answered.png`) });

    // Task 2: what is the answer for, and what did it force? Read off the
    // surface the task left the person on.
    const forced = answered.variables
      .filter((v) => v.standing === "follows" && v.following.some((f) => f.variable === "rated_load"))
      .map((v) => v.options.find((o) => o.id === v.value)?.label ?? v.value);
    const firstForced = forced[0];
    const choice = await smallestHolding(
      page,
      [BED, LOAD, firstForced].filter(Boolean),
    );
    const sameSurface = await smallestHolding(page, [BED, LOAD]);

    // Task 3: what is still unanswered, and what answers nothing? First on
    // the surface the person is on, then on each other surface.
    const gaps = {};
    const seen = async () => ({
      unanswered: (await holds(page, QUIET)) && (await holds(page, "Not yet answered")),
      unbound:
        (await holds(page, "Hospital")) &&
        ((await holds(page, "answers no stated requirement")) ||
          (await holds(page, "Answering no stated requirement"))),
    });
    gaps[await surface(page)] = await seen();
    await page.screenshot({ path: path.join(OUT, `${name}-gaps.png`), fullPage: false });
    // Then on each other surface, reached the way a person reaches it: by
    // the panel's nav.
    for (const place of ["Requirements", "Asserted"]) {
      const went = await page.evaluate((place) => {
        const link = [...document.querySelectorAll('nav[aria-label="Panel"] a, nav[aria-label="Panel"] button')].find(
          (a) => a.textContent.trim().startsWith(place),
        );
        link?.click();
        return !!link;
      }, place);
      if (!went) throw new Error(`no place "${place}" in the panel's nav`);
      await new Promise((r) => setTimeout(r, 1500));
      const title = await surface(page);
      if (!gaps[title]) gaps[title] = await seen();
    }
    const together = Object.values(gaps).some((g) => g.unanswered && g.unbound);

    // Task 4: the assistant reads two requirements from a document the
    // person attached, one it finds an answer for and one it finds nothing
    // for. The read brings a surface forward; does that surface show what
    // was read? The call is the model's tool, made through `/invoke`, so no
    // model runs.
    await gesture(base, { act: "file", name: "brief.txt", text: `${DOORS} ${SMOOTH}` });
    const file = (await api(base, "digest")).files.at(-1).file;
    await api(base, "invoke", { tool: "read", words: DOORS, answer: ["door_finish:brushed_ss"], file });
    await api(base, "invoke", { tool: "read", words: SMOOTH, answer: [], file });
    await until(async () => (await view(base)).clauses.length === 4, "both readings as clauses");
    // The page polls only while its own assistant runs; the reads were made
    // from outside it, so it is loaded again on the state they left.
    await page.reload({ waitUntil: "networkidle2" });
    await until(() => holds(page, BED), "the page again", 60000);
    await new Promise((r) => setTimeout(r, 1000));
    const broughtForward = await surface(page);
    const read = {
      surface: broughtForward,
      answered: await holds(page, DOORS),
      unanswerable: await holds(page, SMOOTH),
    };
    read.both = read.answered && read.unanswerable;
    await page.screenshot({ path: path.join(OUT, `${name}-read.png`) });

    return {
      build: name,
      base,
      ok: true,
      task1: { clicks, surfaces },
      task2: {
        forced,
        choiceUnit: choice,
        clauseAndValue: sameSurface,
        oneUnit: !!choice && !choice.isSurface && choice.fits,
      },
      task3: { gaps, together, surfaceChangesNeeded: together ? 0 : 1 },
      task4: read,
      errors,
    };
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, `${name}-failed.png`) }).catch(() => {});
    return { build: name, base, ok: false, error: String(e), clicks, surfaces, errors };
  } finally {
    await browser.close();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = {};
  for (const [name, base] of Object.entries(BUILDS)) results[name] = await run(name, base);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));

  const row = (label, f) =>
    `| ${label} | ${["before", "after"].map((b) => (results[b].ok ? f(results[b]) : "failed")).join(" | ")} |`;
  const table = [
    "| | before | after |",
    "|---|---|---|",
    row("Task completed", () => "yes"),
    row("Clicks to answer", (r) => r.task1.clicks),
    row("Surfaces passed through", (r) => r.task1.surfaces.join(" → ")),
    row("Values the answer forced", (r) => r.task2.forced.join(", ") || "none"),
    row("Requirement, answer and what it forced in one unit", (r) =>
      r.task2.choiceUnit
        ? `${r.task2.oneUnit ? "yes" : "no"} (smallest holder: ${r.task2.choiceUnit.isSurface ? "the whole surface" : r.task2.choiceUnit.id ? `#${r.task2.choiceUnit.id}` : r.task2.choiceUnit.tag}, ${r.task2.choiceUnit.height}px)`
        : "no (not on the surface)",
    ),
    row("Unanswered requirement and unbound value on one surface", (r) =>
      r.task3.together ? "yes" : "no",
    ),
    row("Surface changes to find both gaps", (r) => r.task3.surfaceChangesNeeded),
    row("Surface an assistant's reading brings forward", (r) => r.task4.surface),
    row("Both readings on it, the answered and the unanswerable", (r) =>
      r.task4.both ? "yes" : `no (answered ${r.task4.answered ? "shown" : "absent"}, unanswerable ${r.task4.unanswerable ? "shown" : "absent"})`,
    ),
    row("Page errors", (r) => r.errors.length),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "comparison.md"), table + "\n");
  console.log(table);

  const failures = [];
  for (const b of ["before", "after"]) if (!results[b].ok) failures.push(`${b}: ${results[b].error}`);
  const after = results.after;
  if (after.ok) {
    if (!after.task2.oneUnit) failures.push("after: the choice is not one unit");
    if (!after.task3.together) failures.push("after: the two gaps are not on one surface");
    if (!after.task4.both) failures.push("after: a reading is not on the surface it brings forward");
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
})();

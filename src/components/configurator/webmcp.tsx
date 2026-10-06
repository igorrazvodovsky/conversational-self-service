"use client";

/**
 * The person's gestures, registered on the page for their own agent.
 *
 * WebMCP lets an agent in the person's browser — Chrome's own, or any other
 * that reads `document.modelContext` — call tools a page registers, and the
 * MCP-B relay forwards them to a desktop client such as Claude Desktop.
 * CopilotKit mirrors any frontend tool with `webmcp` set onto that context.
 *
 * Whose agent it is decides what it may do. The in-app assistant is the
 * seller's, and its tools are in `agent/tools.py`. An agent the person
 * brings is theirs, so this file registers the person's gestures: each
 * handler performs `Copiloting/gesture` with the same `act` the canvas
 * sends, landing at `POST /gesture` under the actor `browser`, and the rules
 * in `agent/syncs/gestures.py`, `binding.py` and `reading.py` decide what
 * follows. `propose` and `read`, which a person has no gesture for, perform
 * `Copiloting/invoke` under the same actor. `review` and `open_quote` are the
 * model's reads, of the specification and of an issued offer, and perform
 * nothing. How much the person
 * delegates is set in their agent, not here. See `docs/syncs/conduct.md`,
 * "The person's own agent, acting as the person".
 *
 * The tools are registered under an agent id no in-app agent has, so the
 * assistant is never offered the person's gestures.
 */

import { useFrontendTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { useConfigurator, type Outcome, type Stimulus } from "./provider";

/** The agent id the tools are constrained to: none that exists in-app. */
export const BROWSER = "browser";

const clause = z.string().describe("A clause's id, from `required` in `review`");
const quote = z.string().describe("A quote's id, from `quotes` in `review`");
const option = z
  .string()
  .describe("A full option id, such as `rated_load:kg1000`, from `open` in `review`");

/** One tool: a name, what it does, its arguments, and the act or call it
 * performs. Every tool here changes a fact or the canvas, except the reads.
 * Registered once: the handlers reach the engine only through the provider's
 * `act`, `invoke`, `review` and `openQuote`, which are stable, so re-registering on every
 * render would only tell the agent its tools changed when they had not. */
export function useTool<Shape extends z.ZodRawShape>(
  name: string,
  description: string,
  shape: Shape,
  handler: (args: z.infer<z.ZodObject<Shape>>) => Promise<unknown>,
  readOnly = false,
) {
  useFrontendTool(
    {
      name,
      description,
      parameters: z.object(shape),
      handler,
      agentId: BROWSER,
      webmcp: readOnly ? { annotations: { readOnlyHint: true } } : true,
    },
    [name],
  );
}

export function BrowserAgentTools() {
  const { act, invoke, review, openQuote } = useConfigurator();
  const as = (stimulus: Stimulus): Promise<Outcome> => act(stimulus);

  // -- reading the specification ------------------------------------------

  useTool(
    "review",
    "Read the specification as it stands: what is required, in its own " +
      "words, and what answers each clause (`required`); the documents on " +
      "record (`files`); what is asserted, what follows and the rule that " +
      "forces it, what cannot be met, and what is open with the options " +
      "still possible and any proposed value (`asked`, `follows`, `unmet`, " +
      "`open`); open conflicts (`questions`), with the assistant's question " +
      "and any reply under `asked` when it put one to the person; price, carbon, the addressee, " +
      "the job, and every quote issued, with its number, where it stands and " +
      "which values have moved since (`quotes`); `open_quote` reads one. " +
      "Every item carries its address on the page under `at`, and `struck` " +
      "lists what the person struck from a reading. A " +
      "projection, accurate as of this call: the person may act on the canvas " +
      "between your calls.",
    {},
    () => review(),
    true,
  );

  useTool(
    "open_quote",
    "Read an issued quote, as the offer was frozen when it was made, to " +
      "check it against what the person asked for before they accept it. " +
      "Returns each requirement as it stood with what answered it, or that " +
      "nothing did (`required`); each value with its standing, why it holds " +
      "and what it adds to the sum and the monthly charge (`values`); the " +
      "programme's milestones by week, the payments due at each, and what " +
      "the customer provides (`programme`, `payments`, `by_others`). " +
      "Sentences beside a value are the canvas's, addressed to the person. " +
      "`differs` lists the values that have moved in the specification since. " +
      "Each line's `at` is its address on the quote surface, to link when you " +
      "report to the person. Changes nothing.",
    { quote },
    ({ quote }) => openQuote(quote),
    true,
  );

  // -- requirements ---------------------------------------------------------

  useTool(
    "file",
    "Attach a document to the specification, as the person, so requirements " +
      "can be read from it and cited. What you file is shown to the seller. " +
      "Returns the document's id under `files` in the result's `state`.",
    {
      name: z.string().describe("The document's name, such as its file name"),
      text: z.string().describe("The document's full text"),
    },
    ({ name, text }) => as({ act: "file", name, text }),
  );

  useTool(
    "read",
    "Record a requirement read from a filed document, with the words it was " +
      "read from and the options that answer it. `words` is copied from the " +
      "document as one unbroken passage: trim either end, never cut the " +
      "middle, never paraphrase; words the document does not contain read " +
      "nothing. `answer` is the option ids that answer it, possibly none. A " +
      "count is answered by the option whose range contains it: thirteen " +
      "stops is `stops:s13_24`. The clause is stated as a reading, cited to " +
      "the document; `keep` makes it the person's own.",
    {
      file: z.string().describe("A document's id, from `files` in `review`"),
      words: z.string().describe("The requirement, copied from the document"),
      answer: z.array(option).default([]),
    },
    ({ file, words, answer }) => invoke("read", { file, words, answer }),
  );

  useTool(
    "require",
    "State a requirement in the person's words, as one clause. Use `read` " +
      "instead when the words are from a document, so the clause is cited.",
    { text: z.string().describe("The requirement, in the person's words") },
    ({ text }) => as({ act: "require", text }),
  );

  useTool(
    "keep",
    "Make a clause read from a source the person's own.",
    { clause },
    ({ clause }) => as({ act: "keep", clause }),
  );

  useTool(
    "reword",
    "Replace a clause's words.",
    { clause, text: z.string().describe("The clause's new words") },
    ({ clause, text }) => as({ act: "reword", clause, text }),
  );

  useTool(
    "relax",
    "Loosen a clause: replace its words with weaker ones.",
    { clause, text: z.string().describe("The clause's new, weaker words") },
    ({ clause, text }) => as({ act: "relax", clause, text }),
  );

  useTool(
    "settle",
    "Say how firmly a clause holds: `fixed` (it must be met), `negotiable` " +
      "(it gives way when the rules cannot honour it) or `open`.",
    { clause, negotiability: z.enum(["fixed", "negotiable", "open"]) },
    ({ clause, negotiability }) => as({ act: "settle", clause, negotiability }),
  );

  useTool(
    "move",
    "Move a clause before another in the ledger.",
    { clause, before: z.string().describe("The clause it should come before") },
    ({ clause, before }) => as({ act: "move", clause, before }),
  );

  useTool(
    "strike",
    "Remove a clause. The values answering it stay asserted, and answer nothing.",
    { clause },
    ({ clause }) => as({ act: "strike", clause }),
  );

  useTool(
    "answer",
    "Say which option answers a clause. The option is asserted, as answering it.",
    { clause, option },
    ({ clause, option }) => as({ act: "answer", clause, option }),
  );

  // -- values ---------------------------------------------------------------

  useTool(
    "assert_value",
    "Assert an option for its variable, as the person, answering no clause. " +
      "Use `answer` when the value answers a requirement. An assertion that " +
      "cannot be met is still recorded, and comes back under `unmet` with the " +
      "rules that refuse it.",
    {
      variable: z.string().describe("A variable name, such as `building_type`"),
      option,
    },
    ({ variable, option }) => as({ act: "assert", variable, option }),
  );

  useTool(
    "withdraw",
    "Take back whatever was asserted of a variable. What follows is " +
      "recomputed; a value that was only ever an entailment reverts to open.",
    { variable: z.string().describe("An asserted variable's name") },
    ({ variable }) => as({ act: "withdraw", variable }),
  );

  useTool(
    "propose",
    "Work out the cheapest or lowest-carbon way to finish the specification. " +
      "Every assertion is kept. Each proposed value appears beside its " +
      "variable under `open`, to adopt with `adopt`; the whole completion " +
      "appears under `questions`, to adopt with `choose`.",
    { measure: z.enum(["cost", "carbon"]).default("cost") },
    ({ measure }) => invoke("propose", { measure }),
  );

  useTool(
    "adopt",
    "Adopt the value proposed for one open variable, as the person.",
    { variable: z.string().describe("An open variable's name with a proposed value") },
    async ({ variable }) => {
      const state = (await review()) as {
        open: { variable: string; proposed: { request: unknown; option: string } | null }[];
      };
      const proposed = state.open.find((v) => v.variable === variable)?.proposed;
      if (!proposed)
        return { did: [{ action: "adopt", refused: `nothing is proposed for ${variable}` }], state };
      return as({ act: "choose", request: proposed.request, option: { variable, option: proposed.option } });
    },
  );

  useTool(
    "choose",
    "Answer an open question as the person: a conflict, or the whole " +
      "proposed completion. `request` and `option` are copied from the " +
      "question under `questions` in `review`.",
    {
      request: z.record(z.unknown()).describe("The question's `request`, as given"),
      option: z.unknown().describe("One of the question's `options`, as given"),
    },
    ({ request, option }) => as({ act: "choose", request, option }),
  );

  useTool(
    "decline",
    "Leave an open question for now, as the person: it goes from the " +
      "canvas and things stay as they are. To hand a decision back to the " +
      "person instead, use `reply`.",
    { request: z.record(z.unknown()).describe("The question's `request`, as given") },
    ({ request }) => as({ act: "decline", request }),
  );

  useTool(
    "reply",
    "Reply in words to a question the seller's assistant put, as the person " +
      "(`asked` on a question in `review`). The reply settles nothing: the " +
      "question stays on the person's canvas with your words beside it, and " +
      "the assistant, if it is waiting on the answer, goes on. Use it to say " +
      "which assertion gives way in your own words, or that the decision is " +
      "the person's to make and you have left it with them.",
    {
      about: z
        .record(z.unknown())
        .describe("The question's `asked.about`, as given"),
      text: z.string().describe("What you say to the assistant"),
    },
    ({ about, text }) => as({ act: "reply", about, text }),
  );

  // -- the offer ------------------------------------------------------------

  useTool(
    "introduce",
    "Record who the person is, for the proposal's letterhead. Each call adds " +
      "to what is recorded. A quote needs at least a name.",
    {
      name: z.string().optional(),
      organisation: z.string().optional(),
      address: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    },
    (given) => as({ act: "introduce", ...given }),
  );

  useTool(
    "entitle",
    "Record what the job is called and where the lift is going. A quote " +
      "needs a site.",
    {
      title: z.string().optional().describe("A short name for the job"),
      site: z.string().optional().describe("The building's address"),
    },
    (given) => as({ act: "entitle", ...given }),
  );

  useTool(
    "quote",
    "Request a quote on the specification as it stands. One is issued only " +
      "when every variable is settled and nothing asserted is unmet; " +
      "otherwise `quotable` in the result says why. The quote freezes the " +
      "values and the price as they are now.",
    {},
    () => as({ act: "quote" }),
  );

  useTool(
    "commit",
    "Accept a quote, as the person. This commits them to the offer, so it " +
      "is their decision: accept only when they have handed it to you, and " +
      "otherwise report what `open_quote` shows and leave it with them.",
    { quote },
    ({ quote }) => as({ act: "commit", quote }),
  );

  useTool(
    "revoke",
    "Revoke an accepted quote, as the person.",
    { quote },
    ({ quote }) => as({ act: "revoke", quote }),
  );

  // -- what the canvas shows ------------------------------------------------

  useTool(
    "focus",
    "Bring a surface forward: `canvas`, the specification, or `quote`.",
    { surface: z.string() },
    ({ surface }) => as({ act: "focus", surface }),
  );

  useTool(
    "show",
    "Show a kind of fact beside every item it concerns. `facet` is a name " +
      "from `showing` in `review`.",
    { facet: z.string() },
    ({ facet }) => as({ act: "show", facet }),
  );

  useTool(
    "hide",
    "Stop showing a kind of fact. The inverse of `show`.",
    { facet: z.string() },
    ({ facet }) => as({ act: "hide", facet }),
  );

  useTool(
    "frame",
    "Narrow the canvas to one assertion (`variable`, from `asked`), one " +
      "requirement (`clause`, from `required`), or one gap (`gap`: `open`, " +
      "`unanswered` or `unbound`). Exactly one of the three.",
    {
      variable: z.string().optional(),
      clause: z.string().optional(),
      gap: z.enum(["open", "unanswered", "unbound"]).optional(),
    },
    async ({ variable, clause, gap }) =>
      clause && !variable && !gap
        ? as({ act: "frame", frame: { by: "clause", clause } })
        : variable && !clause && !gap
          ? as({ act: "frame", frame: { by: "assertion", variable } })
          : gap && !variable && !clause
            ? as({ act: "frame", frame: { by: "gap", gap } })
            : { did: [{ action: "frame", refused: "give exactly one of a variable, a clause or a gap" }], state: null },
  );

  useTool("unframe", "Show the whole canvas again.", {}, () => as({ act: "unframe" }));

  return null;
}

"use client";

/**
 * The model's tools, registered on the page for a browser agent.
 *
 * WebMCP lets an agent in the person's browser — Chrome's own, or any other
 * that reads `document.modelContext` — call tools a page registers.
 * CopilotKit mirrors any frontend tool with `webmcp` set onto that context,
 * so this file registers the ten verbs and the reading `agent/tools.py`
 * gives the in-app model, under the same names and with the same
 * descriptions, and nothing else.
 *
 * Each handler performs `Copiloting/invoke` through the provider, which lands
 * at `POST /invoke` under the actor `browser`. What follows is decided by
 * the rules in `agent/syncs/conduct.py`, which match on the tool and not on
 * who called it: a browser agent may assert, withdraw, propose, introduce,
 * entitle, quote, show, hide, frame and unframe, and — as for the in-app
 * model — no rule lets it adopt a completion, accept a quote, or state what
 * the person requires. The exposure adds no rule. See
 * `docs/syncs/conduct.md`, "A browser agent, on the same terms".
 *
 * The tools are registered under an agent id no in-app agent has, so the
 * assistant is never offered a second copy of its own tools.
 */

import { useFrontendTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { useConfigurator } from "./provider";

/** The agent id the tools are constrained to: none that exists in-app. */
const BROWSER = "browser";

const detail = (about: string) =>
  z.string().optional().describe(`${about}, only if the person gave it`);

export function BrowserAgentTools() {
  const { invoke, review } = useConfigurator();

  useFrontendTool(
    {
      name: "assert_value",
      description:
        "Assert this option for this variable, on the person's behalf. " +
        "`variable` is a variable name such as `building_type`; `option` is a " +
        "full option id such as `building_type:hospital`. Read them from the " +
        "`open` list that `review` and every tool return. An assertion that " +
        "cannot be met is still recorded, and comes back with the rules that " +
        "refuse it.",
      parameters: z.object({
        variable: z.string().describe("A variable name, such as `building_type`"),
        option: z
          .string()
          .describe("A full option id, such as `building_type:hospital`"),
      }),
      handler: ({ variable, option }) => invoke("assert", { variable, option }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "withdraw",
      description:
        "Take back whatever was asserted of this variable. What follows from " +
        "the remaining assertions is recomputed; a value that was only ever an " +
        "entailment reverts to being open.",
      parameters: z.object({
        variable: z.string().describe("An asserted variable's name"),
      }),
      handler: ({ variable }) => invoke("withdraw", { variable }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "propose",
      description:
        "Work out the cheapest or lowest-carbon way to finish the " +
        "specification. Every assertion already on record is kept. The result " +
        "is put to the person to adopt or refuse — you cannot adopt it " +
        "yourself, and saying that you have would be false.",
      parameters: z.object({
        measure: z.enum(["cost", "carbon"]).default("cost"),
      }),
      handler: ({ measure }) => invoke("propose", { measure }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "quote",
      description:
        "Ask for a quote on the specification as it stands. One is issued to " +
        "the person only when every variable is settled and nothing asserted " +
        "is unmet; otherwise nothing happens, and `quotable` in the result " +
        "says why. The quote freezes the values and the price as they are " +
        "now. You cannot accept it — only the person can, on the canvas — and " +
        "saying that the lift has been ordered would be false.",
      parameters: z.object({}),
      handler: () => invoke("quote"),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "introduce",
      description:
        "Record who the person is, for the quotation's letterhead. Only what " +
        "the person actually said: pass a detail when they gave it and leave " +
        "the rest out. Each call adds to what is recorded; nothing is erased. " +
        "A quote cannot be issued until at least a name is on record.",
      parameters: z.object({
        name: detail("The person's name"),
        organisation: detail("Their organisation"),
        address: detail("Their address"),
        email: detail("Their email"),
        phone: detail("Their phone number"),
      }),
      handler: (given) => invoke("introduce", given),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "entitle",
      description:
        "Record what the job is called and where the lift is going. `site` " +
        "is the building's address, and a quote cannot be issued without one. " +
        "`title` is a short name for the job, such as \"Riverside clinic, bed " +
        "lift\". Pass only what the person said.",
      parameters: z.object({
        title: detail("A short name for the job"),
        site: detail("The building's address"),
      }),
      handler: (given) => invoke("entitle", given),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "show",
      description:
        "Show a kind of fact on the canvas, beside every item it concerns. " +
        "`facet` is one of the names `review` lists under `showing`: `price` " +
        "and `carbon` (what each option adds), `notes` (the catalogue's note " +
        "on each option), `excluded` (which rule rules an option out), " +
        "`rules` (the rule behind a value that follows), `answers` (the " +
        "requirement an asserted value answers), `how` (who asserted a " +
        "value). Changes what the person sees and nothing else.",
      parameters: z.object({
        facet: z.string().describe("A facet name from `showing`"),
      }),
      handler: ({ facet }) => invoke("show", { facet }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "hide",
      description:
        "Stop showing a kind of fact on the canvas. The inverse of `show`, " +
        "over the same names.",
      parameters: z.object({
        facet: z.string().describe("A facet name from `showing`"),
      }),
      handler: ({ facet }) => invoke("hide", { facet }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "frame",
      description:
        "Narrow the canvas to what followed from one assertion. `variable` is " +
        "an asserted variable's name, from the `asked` list `review` returns. " +
        "The canvas then shows that assertion, every value that follows from " +
        "it and the rule, every open variable whose options it ruled out, and " +
        "any assertion it made unmet. The canvas narrows only when this is " +
        "called; saying it has been narrowed without calling it would be false.",
      parameters: z.object({
        variable: z.string().describe("An asserted variable's name"),
      }),
      handler: ({ variable }) =>
        invoke("frame", { frame: { by: "assertion", variable } }),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "unframe",
      description: "Show the whole canvas again. The inverse of `frame`.",
      parameters: z.object({}),
      handler: () => invoke("unframe"),
      agentId: BROWSER,
      webmcp: true,
    },
    [invoke],
  );

  useFrontendTool(
    {
      name: "review",
      description:
        "Read the specification: what the person requires in their own " +
        "words, what is asserted and which requirement each value answers, " +
        "what follows, and what is open. `required` lists the person's " +
        "clauses; you cannot state or answer one — the person does both on " +
        "the canvas. A projection rather than the state itself: accurate as " +
        "of this call, and silent about what the person has done since.",
      parameters: z.object({}),
      handler: () => review(),
      agentId: BROWSER,
      webmcp: { annotations: { readOnlyHint: true } },
    },
    [review],
  );

  return null;
}

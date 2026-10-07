"use client";

/**
 * The person's own agent, talking to the assistant in the chat.
 *
 * `converse` does what the composer does, for an agent the person brought:
 * it says something to the assistant in the conversation the person has
 * open, and returns the reply. The words are a `say` gesture first, under
 * the agent's actor, and only once that has completed are they added to the
 * chat as a message whose id is the flow the gesture opened, and the
 * assistant run on them. `agent/hearing.py` finds the words already on
 * record by that id, does not record them again, and runs the turn in their
 * flow. The run starts after the words are on record, so nothing races. See
 * `docs/syncs/gestures.md`, "The person's own agent speaks in the chat".
 *
 * A turn can outlast what a tool call may take, so `converse` waits for a
 * bounded time and then returns what has been said so far, and `listen`
 * waits again. `listen` is also how the agent hears the assistant go on
 * after it answered a question, by a gesture or with `reply`.
 *
 * While a question waits, the conversation's floor is the person's: a new
 * message would not be run, and the transport would re-emit the open
 * interrupt instead. So `converse` says nothing then, and points to the
 * answers.
 */

import { useRef } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { useConfigurator } from "@/components/configurator/provider";
import { useTool } from "@/components/configurator/webmcp";

/** How long a call waits for the assistant's turn, under the relay's 65 s
 * and an MCP client's usual 60 s. */
const WAIT = 45_000;
const TICK = 400;

type Message = { id: string; role: string; content?: unknown };
type Digest = {
  questions?: {
    request: unknown;
    options: unknown[];
    asked?: { status: string; text: string; about: unknown } | null;
  }[];
  quotable?: {
    asked?: { status: string; text: string; about: unknown; lacking: string[] } | null;
  };
};

/** The question the assistant put and waits on, as the agent answers it: a
 * conflict, or who the quote is for. */
function waitingIn(state: unknown) {
  const digest = state as Digest;
  const question = digest.questions?.find((q) => q.asked?.status === "awaiting");
  if (question?.asked)
    return {
      question: question.asked.text,
      about: question.asked.about,
      request: question.request,
      options: question.options,
      answer: "`choose`, `decline` or `reply`",
    };
  const addressee = digest.quotable?.asked;
  if (addressee?.status === "awaiting")
    return {
      question: addressee.text,
      about: addressee.about,
      missing: addressee.lacking,
      answer:
        "`introduce` for the name and `entitle` for the site, with what the " +
        "person gave you, or `reply`",
    };
  return null;
}

/** What the assistant said after a message, in order. */
function saidAfter(messages: Message[], id: string): string {
  const at = messages.findIndex((m) => m.id === id);
  if (at < 0) return "";
  return messages
    .slice(at + 1)
    .filter((m) => m.role === "assistant" && typeof m.content === "string" && m.content)
    .map((m) => m.content as string)
    .join("\n\n");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ConverseTools() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { act, review } = useConfigurator();
  // The tools are registered once; the conversation open now is read when
  // a call arrives, never the one open when they were registered.
  const chat = useRef(agent);
  chat.current = agent;
  const kit = useRef(copilotkit);
  kit.current = copilotkit;

  /** What the agent hears back: the reply so far, any question waiting on
   * the person, and whether the assistant is still answering. */
  const heard = async (after: string, running: boolean) => ({
    said: after,
    reply: saidAfter(chat.current.messages as Message[], after),
    waiting: waitingIn(await review()),
    running,
  });

  useTool(
    "converse",
    "Say something to the seller's assistant, as the person would in the " +
      "chat, and hear its reply. The person sees your words in the chat as " +
      "their agent's. Returns `reply`; `waiting`, when the assistant put a " +
      "question and waits on it, with how to answer it under `answer`; and `running`, when it is still answering — call " +
      "`listen` with `said` to hear the rest. Says nothing while a question " +
      "waits or the assistant is answering.",
    { text: z.string().describe("What you say to the assistant") },
    async ({ text }) => {
      const agent = chat.current;
      const waiting = waitingIn(await review());
      if (waiting || agent.pendingInterrupts?.length)
        return {
          said: null,
          refused:
            "a question waits on the person; answer it as `waiting.answer` " +
            "says, then call `listen`",
          waiting,
        };
      if (agent.isRunning)
        return {
          said: null,
          refused: "the assistant is still answering; call `listen` to hear it",
        };
      const outcome = await act({ act: "say", text, thread: agent.threadId });
      if (!outcome.flow) return { said: null, did: outcome.did };
      agent.addMessage({ id: outcome.flow, role: "user", content: text });
      // The run's own promise says when the turn ended; `isRunning` clears
      // a moment after it settles.
      const run = kit.current
        .runAgent({ agent })
        .then(() => true)
        .catch(() => true);
      const ended = await Promise.race([run, sleep(WAIT).then(() => false)]);
      return heard(outcome.flow, !ended);
    },
  );

  useTool(
    "listen",
    "Hear what the seller's assistant said after something you said with " +
      "`converse`: when `converse` came back `running`, or after you " +
      "answered its question. Waits for its turn to end, for a bounded " +
      "time, and returns the same as `converse`.",
    {
      said: z.string().describe("The `said` that `converse` returned"),
    },
    async ({ said }) => {
      const agent = chat.current;
      const before = agent.messages.length;
      const until = Date.now() + WAIT;
      // A question just answered is resumed once the page sees the answer,
      // so the turn may not have started yet: wait for it to start and end.
      let started = agent.isRunning;
      let ended = false;
      while (Date.now() < until) {
        const now = chat.current;
        started ||= now.isRunning;
        const grew = now.messages.length > before;
        if (!now.isRunning && (started || grew)) {
          ended = true;
          break;
        }
        if (!now.isRunning && waitingIn(await review())) {
          ended = true;
          break;
        }
        await sleep(TICK);
      }
      return heard(said, !ended);
    },
  );

  return null;
}

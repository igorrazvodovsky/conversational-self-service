"use client";

/**
 * A requirement stated on the canvas runs the assistant, as a message does.
 *
 * A gesture runs no turn (docs/moves.md, *Silence*): a pick needs no
 * interpretation. A clause is words, and words are what a turn is opened
 * on, so once `require` has completed the page runs the assistant with the
 * clause as the turn's stimulus, exactly as it runs it on the person's own
 * agent's words (`src/components/chat/converse.tsx`): a message whose id is
 * the gesture's flow. `agent/hearing.py` finds the `Specifying/require` in
 * that flow, records nothing again, makes the flow the turn's, and marks the
 * message for the model as a clause to read with `clause`. The chat shows
 * the message as the clause, stated on the canvas and linked, from the
 * view's `required`. See docs/syncs/reading.md, "A clause the person stated
 * is answered".
 */

import { useCallback, useRef } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";

export function useStating() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  // The conversation open when the clause is stated, not when this was made.
  const chat = useRef(agent);
  chat.current = agent;
  const kit = useRef(copilotkit);
  kit.current = copilotkit;
  return useCallback((flow: string, text: string) => {
    const current = chat.current;
    // While a question of the assistant's waits, the floor is the person's
    // and the transport would re-emit the interrupt: the clause is on the
    // canvas, and the model reads it in the next turn the person opens.
    if (current.isRunning || current.pendingInterrupts?.length) return;
    current.addMessage({ id: flow, role: "user", content: text });
    void kit.current.runAgent({ agent: current }).catch(() => undefined);
  }, []);
}

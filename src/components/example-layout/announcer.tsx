"use client";

/**
 * What changed, in words, for a person who is not looking where it changed.
 *
 * The canvas and the chat change under the person: a reply streams in, a
 * turn moves values, a question arrives, a gesture is refused. The eye sees
 * the square on a moved card or the question at the top of the
 * configuration; a screen reader hears nothing unless something says so.
 * These regions say it, once per transition and never per token: the
 * content itself stays where it is and is read when the person goes to it.
 *
 * Each region is mounted from the start and only its text changes, because
 * a live region inserted together with its message is not announced.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { sections } from "@/components/configurator";
import { byOf, isNotice } from "@/components/configurator/log";
import { useConfigurator } from "@/components/configurator/provider";

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The text of a live region, set so that saying the same thing twice is
 * heard twice: the region is emptied first, and the words arrive a moment
 * later as a change. */
function useAnnouncement(): [string, (text: string) => void] {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const say = useCallback((text: string) => {
    setMessage("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(text), 100);
  }, []);
  return [message, say];
}

/** A turn by the other party, as it lands under the bell, and
 * a question that has just arrived; and, visibly, a gesture the concept
 * layer refused. */
export function CanvasAnnouncer() {
  const { view, error } = useConfigurator();
  const [message, say] = useAnnouncement();
  const latest = view?.turns.find(isNotice) ?? null;
  const movedKey = latest?.flow ?? "";
  const asked = view ? sections(view).questions.length : 0;
  const seen = useRef({ movedKey, asked, ready: false });

  useEffect(() => {
    if (!view) return;
    const last = seen.current;
    seen.current = { movedKey, asked, ready: true };
    // The state the page opened on is not news.
    if (!last.ready) return;
    const said: string[] = [];
    if (movedKey && movedKey !== last.movedKey && latest)
      said.push(`${capital(byOf(latest))} changed the specification; see Notifications.`);
    if (asked > last.asked)
      said.push(
        asked === 1
          ? "A question is waiting for you, under Asked of you."
          : `${asked} questions are waiting for you, under Asked of you.`,
      );
    if (said.length) say(said.join(" "));
  }, [view, movedKey, asked, latest, say]);

  return (
    <>
      <div role="status" className="sr-only">
        {message}
      </div>
      {/* Visible as well as announced: a refusal nobody can see is an
          action that silently did nothing. */}
      {error && view ? (
        <p
          role="alert"
          className="border-b bg-muted px-3 py-1.5 text-xs text-foreground"
        >
          Not done: {error}
        </p>
      ) : null}
    </>
  );
}

/** The assistant's run starting and ending. The transcript is a log and
 * says nothing while it is written (`aria-busy`); this says that a reply
 * has begun and that it is complete. */
export function RunAnnouncer() {
  const { agent } = useAgent();
  const running = agent.isRunning;
  const was = useRef(running);
  const [message, say] = useAnnouncement();

  useEffect(() => {
    if (running === was.current) return;
    was.current = running;
    say(running ? "The assistant is answering." : "The assistant has answered.");
  }, [running, say]);

  return (
    <div role="status" className="sr-only">
      {message}
    </div>
  );
}

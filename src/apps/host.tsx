/**
 * A view's side of MCP Apps: the result it renders, and what it may ask of
 * the host.
 *
 * The person's own client renders a view beside a tool's result, in a
 * sandboxed frame that reaches nothing but its host. So everything a view
 * shows arrives as a tool result, and everything it does is a call through
 * the host to the server that sent it (`agent/delegate.py`): a gesture the
 * person makes by hand, or a link opened on the page.
 *
 * After a gesture the view tells the agent what the person did, through the
 * host's model context, so the agent's next turn does not rest on a reading
 * the person has since changed.
 */

import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export type Result = {
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

export type Host = {
  result: Result | null;
  busy: boolean;
  error: string | null;
  /** The person, by hand: call one of the view's own tools, re-render from
   * what it returns, and tell the agent what was done. */
  act: (name: string, args: Record<string, unknown>, done: string) => Promise<void>;
  open: (url: string) => void;
};

function theme(app: App) {
  const dark = app.getHostContext()?.theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

function useHost(): Host {
  const app = useRef<App | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connection = new App({ name: "configurator", version: "1" }, {}, { autoResize: true });
    // Set before connecting, so the result the host sends at once is not missed.
    connection.ontoolresult = (r) => setResult(r as Result);
    connection.onhostcontextchanged = () => theme(connection);
    void connection.connect().then(() => {
      app.current = connection;
      theme(connection);
    });
  }, []);

  // No button in a view is disabled while a call is in flight (`docs/ui.md`),
  // so a second press of the same one before the first has settled is the
  // first, and resolves with it.
  const pending = useRef(new Map<string, Promise<void>>());
  const call = useCallback(
    async (name: string, args: Record<string, unknown>, done: string) => {
      const connection = app.current;
      if (!connection) return;
      setBusy(true);
      try {
        const next = (await connection.callServerTool({ name, arguments: args })) as Result;
        if (next.isError) throw new Error(`${name} was refused`);
        setResult(next);
        setError(null);
        await connection.updateModelContext({
          content: [{ type: "text", text: `In the configurator's view, the person ${done}.` }],
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const act = useCallback(
    (name: string, args: Record<string, unknown>, done: string) => {
      const key = JSON.stringify([name, args]);
      const same = pending.current.get(key);
      if (same) return same;
      const settled = call(name, args, done).finally(() => pending.current.delete(key));
      pending.current.set(key, settled);
      return settled;
    },
    [call],
  );

  const open = useCallback((url: string) => {
    void app.current?.openLink({ url });
  }, []);

  return { result, busy, error, act, open };
}

/** A link that the host opens, since the frame cannot navigate. */
export function Link({ host, href, children }: { host: Host; href: string; children: ReactNode }) {
  return (
    <Button variant="link" size="xs" className="h-auto p-0" onClick={() => host.open(href)}>
      {children}
    </Button>
  );
}

export function mount(View: (props: { host: Host; result: Result }) => ReactNode) {
  function Root() {
    const host = useHost();
    if (!host.result)
      return (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner /> Reading the configurator
        </div>
      );
    return <View host={host} result={host.result} />;
  }
  createRoot(document.getElementById("root")!).render(<Root />);
}

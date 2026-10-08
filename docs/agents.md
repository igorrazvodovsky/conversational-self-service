# The person's own agent, connected

The person's own agent reaches the configurator in one of two ways: as an MCP
client of the concept layer's server, or as an agent in the browser that finds
the tools the page registers. What it may do once connected is in
[Conduct](syncs/conduct.md#the-persons-own-agent-acting-as-the-person); this
note is only how each client is wired up.

## The MCP server

The person's own agent's tools are an MCP server at
`http://localhost:8123/configurator/mcp` (streamable HTTP, stateless,
`agent/delegate.py`). Results link back to the page at `CONFIGURATOR_URL`
(by default `http://localhost:3000`). Claude Code adds it with:

```bash
claude mcp add --transport http configurator http://localhost:8123/configurator/mcp
```

A client that speaks only stdio, such as Claude Desktop, reaches it through
`mcp-remote`. Desktop's `PATH` has no Node, so the entry names `npx` by its
absolute path and gives it Node's directory:

```json
"configurator": {
  "command": "<node-bin>/npx",
  "args": ["-y", "mcp-remote", "http://localhost:8123/configurator/mcp"],
  "env": { "PATH": "<node-bin>:/usr/bin:/bin" }
}
```

With the relay's entry beside it, Desktop lists the same tools twice when the
page is open, once from each.

`review` and `open_quote` carry MCP Apps views, built from `src/apps/` into
`agent/apps/` by `npm run build:apps` (which `npm run dev` and `npm run build`
run first); a client that does not render MCP Apps gets the same result as
text.

## WebMCP, in the browser

WebMCP needs Chrome 149 or later with `chrome://flags/#enable-webmcp-testing`
enabled (or the origin trial; headless, `--enable-features=WebMCPTesting`).
Chrome's Model Context Tool Inspector then lists the tools the page registers
and can call them; from the console, `document.modelContext.getTools()`. The
page registers the server's tools, forwarding each call there, and adds
`converse` and `listen`, which run in its own conversation
(`src/components/configurator/webmcp.tsx`).

## The MCP-B relay, from the desktop

A desktop MCP client can also reach the tab's tools, `converse` among them,
through the MCP-B local relay: the layout loads `@mcp-b/webmcp-local-relay`'s
embed script (served by `src/app/webmcp-relay/[file]/route.ts`), which
forwards the tab's tools over a localhost WebSocket to the relay, and the
relay is an MCP server over stdio. Claude Desktop's entry, with absolute paths
because the app's `PATH` has no `npx`:

```json
"webmcp-local-relay": {
  "command": "<node>",
  "args": ["<repo>/node_modules/@mcp-b/webmcp-local-relay/dist/cli.mjs",
           "--widget-origin", "http://localhost:3000"]
}
```

The client then sees `review`, `assert_value` and the rest beside the relay's
own `webmcp_list_sources`, and acts as the person's agent.

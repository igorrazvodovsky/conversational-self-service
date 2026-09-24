/**
 * The MCP-B relay's browser files, served from the package rather than a CDN.
 *
 * `embed.js` connects the tab to the local relay (`@mcp-b/webmcp-local-relay`,
 * a WebSocket on localhost that a desktop MCP client such as Claude Desktop
 * talks to over stdio) and forwards whatever is registered on
 * `document.modelContext` — here, the tools `src/components/configurator/
 * webmcp.tsx` registers. It resolves `widget.html` relative to its own URL,
 * so the three files have to share a path; this route is that path, and it
 * serves nothing else.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FILES: Record<string, string> = {
  "embed.js": "text/javascript",
  "widget.html": "text/html",
  "widget.js": "text/javascript",
};

// By path rather than `require.resolve`: the package's exports map hides
// everything but its entry point, and the bundler rewrites the rest.
const browser = join(
  process.cwd(),
  "node_modules",
  "@mcp-b",
  "webmcp-local-relay",
  "dist",
  "browser",
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const type = FILES[file];
  if (!type) return new Response("not found", { status: 404 });
  return new Response(await readFile(join(browser, file)), {
    headers: { "content-type": `${type}; charset=utf-8` },
  });
}

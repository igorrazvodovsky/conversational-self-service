/**
 * Build the MCP Apps views (`src/apps/`) into single HTML files the person's
 * own agent's MCP server serves (`agent/delegate.py` reads `agent/apps/`).
 *
 * A host renders a view in a sandboxed frame that loads nothing it was not
 * given, so each view is one document: its script bundled with React and the
 * shadcn primitives it uses, and the page's stylesheet compiled by Tailwind,
 * both inlined.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "agent", "apps");
const VIEWS = ["specification", "quote"];

// The page's stylesheet, scanned against the views and the primitives they
// use. The web font it imports is left to fall back: the frame loads no
// stylesheet it was not given.
const entry = join(root, "src", "apps", "apps.css");
const css = (
  await postcss([tailwind({ base: join(root, "src") })]).process(await readFile(entry, "utf8"), {
    from: entry,
  })
).css.replace(/@import url\([^)]*\);?/g, "");

await mkdir(out, { recursive: true });
for (const view of VIEWS) {
  const bundled = await build({
    entryPoints: [join(root, "src", "apps", `${view}.tsx`)],
    bundle: true,
    write: false,
    minify: true,
    format: "iife",
    jsx: "automatic",
    alias: { "@": join(root, "src") },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  const script = bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${script}</script>
</body>
</html>
`;
  await writeFile(join(out, `${view}.html`), html);
  console.log(`apps: ${view}.html, ${Math.round(html.length / 1024)} KB`);
}

/**
 * A proxy onto the concept layer's HTTP surface.
 *
 * The actions live beside the agent, in the same process, so that the person
 * and the model reach the same engine and the same action log. This route
 * exists only so the browser can talk to them from its own origin; it adds no
 * behaviour and must not. See `docs/syncs/gestures.md`.
 */

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8123";

async function forward(request: Request, path: string[], body?: string) {
  const url = new URL(request.url);
  const target = `${AGENT_URL}/configurator/${path.join("/")}${url.search}`;
  try {
    const response = await fetch(target, {
      method: request.method,
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json(
      { error: `the agent is not answering at ${AGENT_URL}` },
      { status: 503 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path, await request.text());
}

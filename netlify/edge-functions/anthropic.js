export default async (request) => {
  const apiKey = Deno.env.get("ANTHROPIC_KEY");
  if (!apiKey) return new Response("ANTHROPIC_KEY not configured", { status: 500 });

  const body = await request.text();

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
};

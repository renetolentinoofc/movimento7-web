const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8"
};

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000";
  try {
    const response = await fetch(`${origin}/api/v1/health/live`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) return new Response("ok\n", { status: 200, headers });
  } catch {
    // Report dependency failure through the status code below.
  }
  return new Response("backend unavailable\n", { status: 503, headers });
}

export async function HEAD() {
  const response = await GET();
  return new Response(null, { status: response.status, headers });
}

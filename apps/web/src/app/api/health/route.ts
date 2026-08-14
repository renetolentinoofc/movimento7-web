const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8"
};

export const dynamic = "force-static";

export function GET() {
  return new Response("ok\n", { status: 200, headers });
}

export function HEAD() {
  return new Response(null, { status: 200, headers });
}

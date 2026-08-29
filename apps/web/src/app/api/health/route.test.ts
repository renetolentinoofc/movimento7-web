import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, HEAD } from "./route";

describe("health route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns 200 when the upstream API is healthy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("healthy", { status: 200 })));
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("ok\n");
  });

  it("supports Render's HEAD probe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("healthy", { status: 200 })));
    const response = await HEAD();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("");
  });

  it("returns 503 when the upstream API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET();

    expect(response.status).toBe(503);
  });
});

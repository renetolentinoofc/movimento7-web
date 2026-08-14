import { describe, expect, it } from "vitest";

import { GET, HEAD } from "./route";

describe("health route", () => {
  it("responds without rendering React or calling the upstream API", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("ok\n");
  });

  it("supports Render's HEAD probe", async () => {
    const response = HEAD();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("");
  });
});

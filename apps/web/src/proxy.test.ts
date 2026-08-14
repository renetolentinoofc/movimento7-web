import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proteção das rotas administrativas", () => {
  it("redireciona uma visita sem sessão para o login", () => {
    const response = proxy(new NextRequest("https://movimento7.com.br/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://movimento7.com.br/admin/login",
    );
  });

  it("permite acessar o login sem sessão", () => {
    const response = proxy(
      new NextRequest("https://movimento7.com.br/admin/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("permite continuar quando existe cookie de sessão", () => {
    const request = new NextRequest("https://movimento7.com.br/admin", {
      headers: { cookie: "m7_session=opaque-session-token" },
    });
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

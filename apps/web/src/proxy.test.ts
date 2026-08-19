import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proteção das rotas do painel", () => {
  it("redireciona uma visita sem sessão para o login", () => {
    const response = proxy(new NextRequest("https://movimento7.com.br/painel"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://movimento7.com.br/painel/login",
    );
  });

  it("permite acessar o login sem sessão", () => {
    const response = proxy(
      new NextRequest("https://movimento7.com.br/painel/login"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("permite solicitar e concluir recuperação sem sessão", () => {
    for (const path of ["/painel/esqueci-senha", "/painel/redefinir-senha?token=teste"]) {
      const response = proxy(new NextRequest(`https://movimento7.com.br${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("permite continuar quando existe cookie de sessão", () => {
    const request = new NextRequest("https://movimento7.com.br/painel", {
      headers: { cookie: "m7_session=opaque-session-token" },
    });
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("protege também a página de troca de senha quando não existe sessão", () => {
    const response = proxy(
      new NextRequest("https://movimento7.com.br/painel/trocar-senha"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://movimento7.com.br/painel/login",
    );
  });

  it("redireciona permanentemente a rota administrativa antiga", () => {
    const response = proxy(
      new NextRequest("https://movimento7.com.br/admin/inscricoes?status=novo"),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://movimento7.com.br/painel/inscricoes?status=novo",
    );
  });
});

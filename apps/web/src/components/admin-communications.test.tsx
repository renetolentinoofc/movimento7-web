import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminCommunications } from "./admin-communications";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function apiResponse<T>(status: number, data: T | null, message?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      data,
      error: message ? { code: "test_error", message, fields: {} } : null,
      meta: {},
      request_id: "request-test",
    }),
  } as Response;
}

const session = {
  user: {
    id: "admin-id",
    name: "Administradora",
    email: "admin@movimento7.com",
    permissions: ["communications.manage"],
    must_change_password: false,
  },
  csrf_token: "csrf-communications-token",
};

const configured = {
  configuration: {
    mode: "sandbox" as const,
    configured: true,
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_username: "mo**************@gmail.com",
    smtp_password_set: true,
    from_address: "movimentosete777@gmail.com",
    reply_to: "movimentosete777@gmail.com",
    sandbox_recipient: "mo**************@gmail.com",
  },
  recent: [],
};

describe("comunicação administrativa", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exibe a configuração sem revelar a senha", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/session")) return apiResponse(200, session);
      if (String(input).endsWith("/communications")) return apiResponse(200, configured);
      throw new Error(`Requisição inesperada: ${String(input)}`);
    });

    render(<AdminCommunications />);

    expect(await screen.findByText("Sandbox")).toBeInTheDocument();
    expect(screen.getByText("Configurada")).toBeInTheDocument();
    expect(screen.getAllByText("mo**************@gmail.com")).toHaveLength(2);
    expect(screen.queryByText("app-password-test")).not.toBeInTheDocument();
  });

  it("envia teste com CSRF e chave de idempotência", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return apiResponse(200, session);
      if (url.endsWith("/communications/test") && init?.method === "POST") {
        return apiResponse(201, {
          id: "log-id",
          channel: "email",
          template_key: "configuration_test",
          status: "sent",
          created_at: "2026-08-15T12:00:00Z",
          delivered_to: "mo**************@gmail.com",
        });
      }
      if (url.endsWith("/communications")) return apiResponse(200, configured);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(<AdminCommunications />);
    await user.click(await screen.findByRole("button", { name: "ENVIAR E-MAIL DE TESTE" }));

    expect(await screen.findByText(/Teste enviado com sucesso/)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/admin/communications/test",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: expect.objectContaining({ "X-CSRF-Token": "csrf-communications-token" }),
          body: expect.stringContaining('"recipient":"admin@movimento7.com"'),
        }),
      );
    });
    const testCall = vi.mocked(fetch).mock.calls.find(([input]) =>
      String(input).endsWith("/communications/test"),
    );
    expect(String(testCall?.[1]?.body)).toMatch(/"idempotency_key":"[^"]+"/);
  });

  it("bloqueia o teste enquanto falta a senha de aplicativo", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/session")) return apiResponse(200, session);
      if (String(input).endsWith("/communications")) {
        return apiResponse(200, {
          ...configured,
          configuration: {
            ...configured.configuration,
            configured: false,
            smtp_password_set: false,
          },
        });
      }
      throw new Error(`Requisição inesperada: ${String(input)}`);
    });

    render(<AdminCommunications />);

    expect(await screen.findByText("Pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENVIAR E-MAIL DE TESTE" })).toBeDisabled();
  });
});

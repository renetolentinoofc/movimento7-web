import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminRegistrations } from "./admin-registrations";

const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

function apiResponse<T>(
  status: number,
  data: T | null,
  error: unknown = null,
  meta: Record<string, unknown> = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, error, meta, request_id: "test-request" }),
  } as Response;
}

const session = {
  user: {
    id: "admin-id",
    name: "Administrador",
    email: "admin@movimento7.com",
    permissions: ["registrations.read", "registrations.manage"],
    must_change_password: false,
  },
  csrf_token: "csrf-registration-token",
};

const registration = {
  id: "registration-id",
  protocol: "M7-TESTE-001",
  full_name: "Maria da Silva",
  professional_name: "Maria MC",
  city: "São Paulo",
  status: "received",
  priority: "normal",
  created_at: "2026-08-14T12:00:00Z",
};

describe("inscrições administrativas", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function mockSuccessfulApi() {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/v1/admin/auth/session") return apiResponse(200, session);
      if (url.includes("/api/v1/admin/registrations?") && init?.method !== "PATCH") {
        return apiResponse(200, [registration], null, { has_more: false });
      }
      if (url.endsWith("/registration-id/status") && init?.method === "PATCH") {
        return apiResponse(200, {
          id: registration.id,
          status: "approved",
          notification_status: "sent",
        });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
  }

  it("lista inscrições e envia busca e filtro para a API", async () => {
    mockSuccessfulApi();
    const user = userEvent.setup();

    render(<AdminRegistrations />);
    expect(await screen.findByRole("heading", { name: "Maria MC" })).toBeInTheDocument();
    expect(screen.getByText("M7-TESTE-001")).toBeInTheDocument();
    expect(screen.getByText("São Paulo")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar por nome"), "Maria");
    await user.click(screen.getByRole("button", { name: "BUSCAR" }));
    await user.selectOptions(screen.getByLabelText("Status"), "received");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Maria"),
        expect.objectContaining({ credentials: "include", cache: "no-store" }),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=received"),
        expect.any(Object),
      );
    });
  });

  it("altera o status com CSRF e motivo de auditoria", async () => {
    mockSuccessfulApi();
    const user = userEvent.setup();

    render(<AdminRegistrations />);
    await screen.findByRole("heading", { name: "Maria MC" });
    await waitFor(() => expect(screen.getByRole("button", { name: "SALVAR STATUS" })).toBeEnabled());

    await user.selectOptions(screen.getByLabelText("Novo status de Maria da Silva"), "approved");
    await user.type(
      screen.getByLabelText("Motivo da alteração de Maria da Silva"),
      "Portfólio aprovado pela curadoria",
    );
    await user.click(screen.getByRole("button", { name: "SALVAR STATUS" }));

    expect(
      await screen.findByText(
        "Maria da Silva: status alterado para Aprovada. E-mail enviado automaticamente.",
      ),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/registrations/registration-id/status",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-registration-token" }),
        body: JSON.stringify({
          status: "approved",
          reason: "Portfólio aprovado pela curadoria",
        }),
      }),
    );
  });

  it("exige uma mudança real e um motivo antes de chamar a API", async () => {
    mockSuccessfulApi();
    const user = userEvent.setup();

    render(<AdminRegistrations />);
    await screen.findByRole("heading", { name: "Maria MC" });
    await waitFor(() => expect(screen.getByRole("button", { name: "SALVAR STATUS" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "SALVAR STATUS" }));
    expect(await screen.findByText("Escolha um status diferente do atual.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Novo status de Maria da Silva"), "reviewing");
    await user.click(screen.getByRole("button", { name: "SALVAR STATUS" }));
    expect(
      await screen.findByText("Informe um motivo com pelo menos 3 caracteres."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/registration-id/status"),
      expect.any(Object),
    );
  });
});

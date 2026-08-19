import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLogout } from "./admin-logout";
import { AdminRegistrationDetail } from "./admin-registration-detail";

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

function apiResponse<T>(status: number, data: T | null, error: unknown = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, error, meta: {}, request_id: "test-request" }),
  } as Response;
}

const detail = {
  id: "registration-id",
  protocol: "M7-TESTE-001",
  full_name: "Maria da Silva",
  professional_name: "Maria MC",
  email: "maria@example.test",
  phone: "+5511999999999",
  instagram: "mariamc",
  city: "São Paulo",
  presentation: "Artista independente com trabalho autoral.",
  portfolio_url: "https://example.test/portfolio",
  extra_data: {},
  status: "reviewing",
  priority: "normal",
  assigned_to: null,
  category: { id: "category-id", name: "MC", slug: "mc" },
  edition: null,
  consent_at: "2026-08-14T12:00:00Z",
  privacy_version: "2026-08",
  created_at: "2026-08-14T12:00:00Z",
  files: [],
  notes: [],
  history: [
    {
      id: "history-id",
      old_status: "received",
      new_status: "reviewing",
      reason: "Início da curadoria",
      created_at: "2026-08-14T13:00:00Z",
      author: { id: "admin-id", name: "Administrador" },
    },
  ],
  assignees: [{ id: "admin-id", name: "Administrador", email: "admin@example.test" }],
  profile: null,
};

describe("ficha administrativa de inscrição", () => {
  beforeEach(() => {
    router.refresh.mockReset();
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra os dados completos e salva a triagem", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/registration-id") && !init?.method) return apiResponse(200, detail);
      if (url.endsWith("/registration-id/triage") && init?.method === "PATCH") {
        return apiResponse(200, {
          id: "registration-id",
          priority: "urgent",
          assigned_to: detail.assignees[0],
        });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminRegistrationDetail
        csrfToken="csrf-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        registrationId="registration-id"
      />,
    );

    expect(await screen.findByText("Artista independente com trabalho autoral.")).toBeInTheDocument();
    expect(screen.getByText("Início da curadoria")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Prioridade"), "urgent");
    await user.selectOptions(screen.getByLabelText("Responsável"), "admin-id");
    await user.click(screen.getByRole("button", { name: "SALVAR TRIAGEM" }));

    expect(await screen.findByText("Prioridade e responsável atualizados.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/registrations/registration-id/triage",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-token" }),
        body: JSON.stringify({ priority: "urgent", assigned_to_id: "admin-id" }),
      }),
    );
  });

  it("confirma e registra uma decisão com motivo", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/registration-id") && !init?.method) return apiResponse(200, detail);
      if (url.endsWith("/registration-id/status") && init?.method === "PATCH") {
        return apiResponse(200, {
          id: "registration-id",
          status: "approved",
          notification_status: "sent",
        });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminRegistrationDetail
        csrfToken="csrf-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        registrationId="registration-id"
      />,
    );
    await screen.findByText("Artista independente com trabalho autoral.");
    await user.selectOptions(screen.getByLabelText("Novo status"), "approved");
    await user.type(screen.getByLabelText("Motivo da decisão"), "Aprovada pela curadoria");
    await user.click(screen.getByRole("button", { name: "REGISTRAR DECISÃO" }));

    expect(confirm).toHaveBeenCalledWith("Confirma a decisão: Aprovada?");
    expect(
      await screen.findByText(
        "Status alterado para Aprovada. E-mail enviado automaticamente.",
      ),
    ).toBeInTheDocument();
  });

  it("cria perfil em rascunho para uma inscrição aprovada", async () => {
    const approvedDetail = { ...detail, status: "approved" as const };
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/registration-id") && !init?.method) {
        return apiResponse(200, approvedDetail);
      }
      if (url.endsWith("/registration-id/profile") && init?.method === "POST") {
        return apiResponse(201, { id: "profile-id", slug: "maria-mc", status: "draft" });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminRegistrationDetail
        csrfToken="csrf-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        registrationId="registration-id"
      />,
    );
    await user.click(await screen.findByRole("button", { name: "CRIAR PERFIL EM RASCUNHO" }));

    expect(await screen.findByText("Perfil “maria-mc” criado como rascunho.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/registrations/registration-id/profile",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("saída do painel", () => {
  beforeEach(() => {
    router.refresh.mockReset();
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("obtém um CSRF atual e encerra a sessão", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        apiResponse(200, {
          user: {
            id: "admin-id",
            name: "Administrador",
            email: "admin@example.test",
            permissions: [],
            must_change_password: false,
          },
          csrf_token: "logout-csrf",
        }),
      )
      .mockResolvedValueOnce(apiResponse(200, { logged_out: true }));
    const user = userEvent.setup();

    render(<AdminLogout />);
    await user.click(screen.getByRole("button", { name: "SAIR" }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/painel/login?status=logged-out"),
    );
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: { "X-CSRF-Token": "logout-csrf" },
      }),
    );
  });
});

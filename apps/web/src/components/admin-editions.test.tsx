import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminEditions } from "./admin-editions";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function apiResponse<T>(status: number, data: T | null, error: unknown = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, error, meta: {}, request_id: "test-request" }),
  } as Response;
}

const session = {
  user: {
    id: "admin-id",
    name: "Produção",
    email: "producao@example.test",
    permissions: ["events.manage"],
    must_change_password: false,
  },
  csrf_token: "csrf-editions-token",
};

const edition = {
  id: "edition-id",
  name: "Movimento 7 2026",
  slug: "movimento-7-2026",
  description: "Edição de teste",
  status: "draft" as const,
  starts_at: "2026-10-20T18:00:00Z",
  ends_at: "2026-10-21T02:00:00Z",
  registration_opens_at: "2026-08-01T12:00:00Z",
  registration_closes_at: "2026-10-10T23:59:00Z",
  location: "Centro Cultural",
  address: "Rua Sete, 7",
  map_url: "https://example.test/mapa",
  capacity: 100,
  retention_days: 730,
  published_at: null,
  registration_count: 12,
  registration_open: false,
  created_at: "2026-08-15T12:00:00Z",
  updated_at: "2026-08-15T12:00:00Z",
};

describe("edições administrativas", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function mockApi() {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return apiResponse(200, session);
      if (url.endsWith("/admin/editions") && init?.method === "POST") {
        return apiResponse(201, edition);
      }
      if (url.endsWith("/admin/editions")) return apiResponse(200, [edition]);
      if (url.endsWith("/edition-id/status") && init?.method === "PATCH") {
        return apiResponse(200, { ...edition, status: "published", registration_open: true });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
  }

  it("lista a programação e publica com CSRF", async () => {
    mockApi();
    const user = userEvent.setup();

    render(<AdminEditions />);
    expect(await screen.findByRole("heading", { name: "Movimento 7 2026" })).toBeInTheDocument();
    expect(screen.getByText("12 / 100")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "PUBLICAR" }));

    expect(await screen.findByText("Edição alterada para Publicada.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/editions/edition-id/status",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-editions-token" }),
        body: JSON.stringify({ status: "published" }),
      }),
    );
  });

  it("cria uma edição completa como rascunho", async () => {
    mockApi();
    const user = userEvent.setup();

    render(<AdminEditions />);
    await screen.findByRole("heading", { name: "Movimento 7 2026" });
    await user.click(screen.getByRole("button", { name: "NOVA EDIÇÃO" }));
    await user.type(screen.getByLabelText("Nome"), "Nova edição");
    await user.type(screen.getByLabelText("Slug"), "nova-edicao");
    fireEvent.change(screen.getByLabelText("Abertura das inscrições"), { target: { value: "2026-09-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Encerramento das inscrições"), { target: { value: "2026-09-30T18:00" } });
    fireEvent.change(screen.getByLabelText("Início do evento"), { target: { value: "2026-10-10T09:00" } });
    fireEvent.change(screen.getByLabelText("Encerramento do evento"), { target: { value: "2026-10-10T22:00" } });
    await user.click(screen.getByRole("button", { name: "SALVAR EDIÇÃO" }));

    expect(await screen.findByText("Edição criada como rascunho.")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/admin/editions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-CSRF-Token": "csrf-editions-token" }),
          body: expect.stringContaining('"slug":"nova-edicao"'),
        }),
      );
    });
  });
});

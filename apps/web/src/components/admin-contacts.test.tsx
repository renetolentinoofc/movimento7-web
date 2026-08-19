import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminContactDetail } from "./admin-contact-detail";
import { AdminContacts } from "./admin-contacts";

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
    name: "Atendimento",
    email: "admin@movimento7.com",
    permissions: ["contacts.read", "contacts.manage"],
    must_change_password: false,
  },
  csrf_token: "csrf-contact-token",
};

const summary = {
  id: "contact-id",
  protocol: "CT-ADMIN-001",
  name: "Joana da Silva",
  email: "joana@example.test",
  subject: "Parceria cultural",
  status: "received",
  assigned_to: null,
  created_at: "2026-08-19T12:00:00Z",
  updated_at: "2026-08-19T12:00:00Z",
};

const detail = {
  ...summary,
  phone: "+5511999999999",
  message: "Gostaria de conversar sobre uma parceria para a próxima edição.",
  consent_at: "2026-08-19T12:00:00Z",
  privacy_version: "2026-08",
  assignees: [
    { id: "admin-id", name: "Atendimento", email: "admin@movimento7.com" },
  ],
  notes: [],
  history: [],
  replies: [],
};

describe("contatos administrativos", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista contatos e aplica busca e filtro", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/v1/admin/auth/session") return apiResponse(200, session);
      if (url.includes("/api/v1/admin/contacts?")) {
        return apiResponse(200, [summary], null, { has_more: false });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(<AdminContacts />);
    expect(await screen.findByRole("heading", { name: "Joana da Silva" })).toBeInTheDocument();
    expect(screen.getByText("CT-ADMIN-001")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar contato"), "Parceria");
    await user.click(screen.getByRole("button", { name: "BUSCAR" }));
    await user.selectOptions(screen.getByLabelText("Status"), "received");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Parceria"),
        expect.objectContaining({ credentials: "include", cache: "no-store" }),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=received"),
        expect.any(Object),
      );
    });
  });

  it("atualiza status e responsável com CSRF", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/triage") && init?.method === "PATCH") {
        return apiResponse(200, {
          id: "contact-id",
          status: "in_progress",
          assigned_to: detail.assignees[0],
        });
      }
      if (url === "/api/v1/admin/contacts/contact-id") return apiResponse(200, detail);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminContactDetail
        contactId="contact-id"
        csrfToken="csrf-contact-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "Joana da Silva" });
    await user.selectOptions(screen.getByLabelText("Status do atendimento"), "in_progress");
    await user.selectOptions(screen.getByLabelText("Responsável"), "admin-id");
    await user.type(screen.getByLabelText("Motivo da alteração"), "Atendimento iniciado");
    await user.click(screen.getByRole("button", { name: "SALVAR ATENDIMENTO" }));

    expect(await screen.findByText("Status e responsável atualizados.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/contacts/contact-id/triage",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-contact-token" }),
        body: expect.stringContaining('"assigned_to_id":"admin-id"'),
      }),
    );
  });

  it("adiciona nota interna e responde por e-mail", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/notes") && init?.method === "POST") {
        return apiResponse(201, { id: "note-id" });
      }
      if (url.endsWith("/reply") && init?.method === "POST") {
        return apiResponse(201, {
          id: "reply-id",
          delivery_status: "logged",
          contact_status: "in_progress",
        });
      }
      if (url === "/api/v1/admin/contacts/contact-id") return apiResponse(200, detail);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminContactDetail
        contactId="contact-id"
        csrfToken="csrf-contact-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "Joana da Silva" });

    await user.type(screen.getByLabelText("Nota"), "Retornar até sexta-feira.");
    await user.click(screen.getByRole("button", { name: "ADICIONAR NOTA" }));
    expect(await screen.findByText("Nota interna adicionada.")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Resposta por e-mail"),
      "Podemos conversar na próxima semana.",
    );
    await user.click(screen.getByRole("button", { name: "ENVIAR RESPOSTA" }));

    expect(await screen.findByText("Resposta registrada: Registrado em teste.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/contacts/contact-id/reply",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-contact-token" }),
        body: expect.stringMatching(/"idempotency_key":"contact-reply-/),
      }),
    );
  });
});

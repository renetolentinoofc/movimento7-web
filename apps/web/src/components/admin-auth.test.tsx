import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminChangePassword } from "./admin-change-password";
import { AdminDashboard } from "./admin-dashboard";
import { AdminLogin } from "./admin-login";

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

function apiResponse<T>(status: number, data: T | null, error: unknown = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data, error, meta: {}, request_id: "test-request" }),
  } as Response;
}

const sessionData = {
  user: {
    id: "admin-id",
    name: "Administrador",
    email: "admin@movimento7.com",
    permissions: ["dashboard.read"],
    must_change_password: true,
  },
  csrf_token: "csrf-test-token",
};

describe("autenticação administrativa", () => {
  beforeEach(() => {
    router.refresh.mockReset();
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("envia o primeiro acesso para a troca obrigatória de senha", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(apiResponse(200, sessionData));
    const user = userEvent.setup();

    render(<AdminLogin />);
    await user.type(screen.getByLabelText("Senha"), "senha-inicial-segura");
    await user.click(screen.getByRole("button", { name: "ENTRAR" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/painel/trocar-senha"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/auth/login",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
  });

  it("troca a senha com CSRF e exige nova autenticação", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(apiResponse(200, sessionData))
      .mockResolvedValueOnce(
        apiResponse(200, { changed: true, reauthentication_required: true }),
      );
    const user = userEvent.setup();

    render(<AdminChangePassword />);
    await screen.findByLabelText("Senha atual");
    await user.type(screen.getByLabelText("Senha atual"), "senha-inicial-segura");
    await user.type(screen.getByLabelText("Nova senha"), "nova-senha-bem-segura");
    await user.type(
      screen.getByLabelText("Confirme a nova senha"),
      "nova-senha-bem-segura",
    );
    await user.click(screen.getByRole("button", { name: "ALTERAR SENHA" }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/painel/login?status=password-changed"),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/admin/auth/change-password",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-test-token" }),
      }),
    );
  });

  it("redireciona o dashboard quando a API exige troca de senha", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      apiResponse(403, null, {
        code: "password_change_required",
        message: "Troque a senha inicial antes de continuar.",
        fields: {},
      }),
    );

    render(<AdminDashboard />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/painel/trocar-senha"));
  });

  it("não envia senhas inválidas e informa quando a nova repete a atual", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(apiResponse(200, sessionData));
    const user = userEvent.setup();

    render(<AdminChangePassword />);
    await screen.findByLabelText("Senha atual");
    await user.type(screen.getByLabelText("Senha atual"), "mesma-senha-segura");
    await user.type(screen.getByLabelText("Nova senha"), "mesma-senha-segura");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "mesma-senha-segura");
    await user.click(screen.getByRole("button", { name: "ALTERAR SENHA" }));

    expect(
      await screen.findByText("A nova senha deve ser diferente da senha atual."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Nova senha")).toHaveFocus();
  });

  it("bloqueia senha curta e confirmação diferente antes de chamar a API", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(apiResponse(200, sessionData));
    const user = userEvent.setup();

    render(<AdminChangePassword />);
    await screen.findByLabelText("Senha atual");
    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-bem-segura");
    await user.type(screen.getByLabelText("Nova senha"), "curta");
    await user.type(screen.getByLabelText("Confirme a nova senha"), "outra-senha-segura");
    await user.click(screen.getByRole("button", { name: "ALTERAR SENHA" }));

    expect(
      await screen.findByText("A nova senha precisa ter 12 ou mais caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByText("As novas senhas não conferem.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Nova senha")).toHaveFocus();
  });

  it("associa o erro de senha atual devolvido pela API ao campo correto", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(apiResponse(200, sessionData))
      .mockResolvedValueOnce(
        apiResponse(403, null, {
          code: "invalid_password",
          message: "Não foi possível alterar a senha.",
          fields: {},
        }),
      );
    const user = userEvent.setup();

    render(<AdminChangePassword />);
    await screen.findByLabelText("Senha atual");
    await user.type(screen.getByLabelText("Senha atual"), "senha-atual-incorreta");
    await user.type(screen.getByLabelText("Nova senha"), "nova-senha-bem-segura");
    await user.type(
      screen.getByLabelText("Confirme a nova senha"),
      "nova-senha-bem-segura",
    );
    await user.click(screen.getByRole("button", { name: "ALTERAR SENHA" }));

    expect(await screen.findByText("A senha atual não confere.")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("permite mostrar e ocultar as senhas sem enviar o formulário", async () => {
    const user = userEvent.setup();

    render(<AdminLogin />);
    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password).toHaveAttribute("type", "text");
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(password).toHaveAttribute("type", "password");
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminProfileDetail } from "./admin-profile-detail";
import { AdminProfiles } from "./admin-profiles";

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
    permissions: ["profiles.read", "profiles.manage"],
    must_change_password: false,
  },
  csrf_token: "csrf-profile-token",
};

const summary = {
  id: "profile-id",
  slug: "maria-mc",
  display_name: "Maria MC",
  city: "São Paulo",
  status: "draft",
  featured: false,
  categories: ["Música"],
  asset_count: 1,
  updated_at: "2026-08-14T12:00:00Z",
  published_at: null,
};

const detail = {
  id: "profile-id",
  registration: { id: "registration-id", protocol: "M7-TESTE-001" },
  slug: "maria-mc",
  display_name: "Maria MC",
  bio: "Artista independente de São Paulo.",
  city: "São Paulo",
  instagram: "mariamc",
  status: "draft",
  featured: false,
  published_at: null,
  updated_at: "2026-08-14T12:00:00Z",
  category_ids: ["category-id"],
  categories: [{ id: "category-id", name: "Música" }],
  available_categories: [
    { id: "category-id", name: "Música" },
    { id: "dance-id", name: "Dança" },
  ],
  assets: [
    {
      id: "asset-id",
      media_type: "image",
      alt_text: "Maria no palco",
      credit: "Movimento 7",
      display_order: 0,
      active: true,
      url: "/api/v1/admin/profile-assets/asset-id/file",
    },
  ],
};

describe("perfis administrativos", () => {
  beforeEach(() => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista perfis e aplica busca e filtro", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/v1/admin/auth/session") return apiResponse(200, session);
      if (url.includes("/api/v1/admin/profiles?")) {
        return apiResponse(200, [summary], null, { has_more: false });
      }
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(<AdminProfiles />);
    expect(await screen.findByRole("heading", { name: "Maria MC" })).toBeInTheDocument();
    expect(screen.getByText("Música")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar artista"), "Maria");
    await user.click(screen.getByRole("button", { name: "BUSCAR" }));
    await user.selectOptions(screen.getByLabelText("Status"), "draft");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Maria"),
        expect.objectContaining({ credentials: "include", cache: "no-store" }),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=draft"),
        expect.any(Object),
      );
    });
  });

  it("salva informações públicas e categorias com proteção CSRF", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/v1/admin/profiles/profile-id" && init?.method === "PATCH") {
        return apiResponse(200, { id: "profile-id", slug: "maria-mc", status: "draft" });
      }
      if (url === "/api/v1/admin/profiles/profile-id") return apiResponse(200, detail);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminProfileDetail
        csrfToken="csrf-profile-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        profileId="profile-id"
      />,
    );
    const name = await screen.findByLabelText("Nome artístico");
    await user.clear(name);
    await user.type(name, "Maria MC Oficial");
    await user.click(screen.getByLabelText("Dança"));
    await user.click(screen.getByRole("button", { name: "SALVAR PERFIL" }));

    expect(await screen.findByText("Perfil salvo com sucesso.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/profiles/profile-id",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-profile-token" }),
        body: expect.stringContaining('"display_name":"Maria MC Oficial"'),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/profiles/profile-id",
      expect.objectContaining({ body: expect.stringContaining('"dance-id"') }),
    );
  });

  it("publica o perfil e atualiza os metadados da mídia", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/status") && init?.method === "PATCH") {
        return apiResponse(200, { id: "profile-id", status: "published" });
      }
      if (url === "/api/v1/admin/profile-assets/asset-id" && init?.method === "PATCH") {
        return apiResponse(200, { id: "asset-id" });
      }
      if (url === "/api/v1/admin/profiles/profile-id") return apiResponse(200, detail);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminProfileDetail
        csrfToken="csrf-profile-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        profileId="profile-id"
      />,
    );
    await screen.findByRole("heading", { level: 2, name: "Maria MC" });
    const assetAlt = screen.getByLabelText("Texto alternativo", { selector: "#asset-alt-asset-id" });
    await user.clear(assetAlt);
    await user.type(assetAlt, "Retrato de Maria no palco");
    await user.click(screen.getByRole("button", { name: "SALVAR DADOS" }));
    expect(await screen.findByText(/Mídia “Retrato de Maria no palco” atualizada/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "PUBLICAR PERFIL" }));
    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByText("Perfil alterado para Publicado.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/profiles/profile-id/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "published" }),
      }),
    );
  });

  it("envia uma nova imagem com metadados e CSRF", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/assets") && init?.method === "POST") {
        return apiResponse(201, {
          id: "new-asset-id",
          alt_text: "Maria MC em apresentação",
        });
      }
      if (url === "/api/v1/admin/profiles/profile-id") return apiResponse(200, detail);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminProfileDetail
        csrfToken="csrf-profile-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        profileId="profile-id"
      />,
    );
    await screen.findByRole("heading", { level: 2, name: "Maria MC" });
    const file = new File(["imagem"], "maria.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Arquivo"), file);
    await user.type(screen.getByLabelText("Texto alternativo", { selector: "#profile-media-alt" }), "Maria MC em apresentação");
    await user.type(screen.getByLabelText("Crédito", { selector: "#profile-media-credit" }), "Movimento 7");
    const uploadButton = screen.getByRole("button", { name: "ENVIAR IMAGEM" });
    fireEvent.submit(uploadButton.closest("form")!);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/admin/profiles/profile-id/assets",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(
      await screen.findByText("Imagem “Maria MC em apresentação” adicionada ao portfólio."),
    ).toBeInTheDocument();
    const uploadCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) => String(url).endsWith("/assets") && init?.method === "POST",
    );
    expect(uploadCall?.[1]?.headers).toEqual({ "X-CSRF-Token": "csrf-profile-token" });
    expect(uploadCall?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("define capa e exclui uma mídia com confirmação", async () => {
    const twoAssets = {
      ...detail,
      assets: [
        ...detail.assets,
        {
          ...detail.assets[0],
          id: "second-asset-id",
          alt_text: "Maria nos bastidores",
          display_order: 1,
          url: "/api/v1/admin/profile-assets/second-asset-id/file",
        },
      ],
    };
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/second-asset-id/cover") && init?.method === "POST") {
        return apiResponse(200, { id: "second-asset-id", display_order: 0, active: true });
      }
      if (url.endsWith("/second-asset-id") && init?.method === "DELETE") {
        return apiResponse(200, { id: "second-asset-id", deleted: true });
      }
      if (url === "/api/v1/admin/profiles/profile-id") return apiResponse(200, twoAssets);
      throw new Error(`Requisição inesperada: ${url}`);
    });
    const user = userEvent.setup();

    render(
      <AdminProfileDetail
        csrfToken="csrf-profile-token"
        onChanged={vi.fn()}
        onClose={vi.fn()}
        profileId="profile-id"
      />,
    );
    await screen.findByRole("heading", { level: 2, name: "Maria MC" });
    await user.click(screen.getByRole("button", { name: "DEFINIR CAPA" }));
    expect(await screen.findByText("“Maria nos bastidores” agora é a capa do perfil.")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: "EXCLUIR" });
    await user.click(deleteButtons[1]);
    expect(confirm).toHaveBeenCalledWith(
      "Remover definitivamente a mídia “Maria nos bastidores”?",
    );
    expect(await screen.findByText("Mídia “Maria nos bastidores” removida.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/profile-assets/second-asset-id",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const artistApi = vi.hoisted(() => ({
  getArtists: vi.fn(),
  getArtistCategories: vi.fn(),
}));

vi.mock("@/lib/artists", () => artistApi);

import ArtistsPage from "./page";

describe("catálogo público de artistas", () => {
  beforeEach(() => {
    artistApi.getArtistCategories.mockResolvedValue([
      { id: "music-id", name: "Música", slug: "musica" },
    ]);
    artistApi.getArtists.mockResolvedValue({
      artists: [
        {
          slug: "cami-art",
          display_name: "Cami Art",
          bio: "Arte urbana, cor e memória em movimento.",
          city: "Belo Horizonte",
          instagram: "cami.art",
          featured: true,
          categories: ["Música"],
          category_slugs: ["musica"],
          cover: null,
        },
      ],
      hasMore: true,
      unavailable: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renderiza artistas publicados e preserva filtros na paginação", async () => {
    const view = await ArtistsPage({
      searchParams: Promise.resolve({
        q: "Cami",
        cidade: "Belo Horizonte",
        categoria: "musica",
        pagina: "2",
      }),
    });
    render(view);

    expect(screen.getByRole("heading", { name: "Cami Art" })).toBeInTheDocument();
    expect(screen.getByText("Belo Horizonte")).toBeInTheDocument();
    expect(screen.getByText("Destaque")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CONHECER PERFIL" })).toHaveAttribute(
      "href",
      "/artistas/cami-art",
    );
    expect(screen.getByRole("link", { name: "PRÓXIMA" }).getAttribute("href")).toContain(
      "pagina=3",
    );
    const params = artistApi.getArtists.mock.calls[0][0] as URLSearchParams;
    expect(params.get("q")).toBe("Cami");
    expect(params.get("city")).toBe("Belo Horizonte");
    expect(params.get("category")).toBe("musica");
  });

  it("diferencia catálogo vazio de indisponibilidade", async () => {
    artistApi.getArtists.mockResolvedValue({
      artists: [],
      hasMore: false,
      unavailable: true,
    });
    const view = await ArtistsPage({ searchParams: Promise.resolve({}) });
    render(view);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText("Nenhum artista publicado")).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const artistApi = vi.hoisted(() => ({ getArtist: vi.fn() }));

vi.mock("@/lib/artists", () => artistApi);

import ArtistProfilePage, { generateMetadata } from "./page";

const artist = {
  slug: "cami-art",
  display_name: "Cami Art",
  bio: "Artista visual que transforma memórias em cores e encontros.",
  city: "Belo Horizonte",
  instagram: "cami.art",
  featured: true,
  published_at: "2026-08-14T12:00:00Z",
  categories: ["Artes visuais"],
  portfolio: [
    {
      id: "asset-id",
      url: "/api/v1/profile-assets/asset-id/file",
      type: "image",
      alt: "Cami pintando um mural",
      credit: "Movimento 7",
    },
  ],
};

describe("perfil público de artista", () => {
  beforeEach(() => artistApi.getArtist.mockResolvedValue(artist));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("apresenta identidade, trajetória e portfólio", async () => {
    const view = await ArtistProfilePage({ params: Promise.resolve({ slug: "cami-art" }) });
    render(view);

    expect(screen.getByRole("heading", { level: 1, name: "Cami Art" })).toBeInTheDocument();
    expect(screen.getByText(artist.bio)).toBeInTheDocument();
    expect(screen.getByAltText("Cami pintando um mural")).toBeInTheDocument();
    expect(screen.getByText("Crédito: Movimento 7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@cami.art/ })).toHaveAttribute(
      "href",
      "https://www.instagram.com/cami.art",
    );
  });

  it("gera metadados sociais a partir do perfil", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "cami-art" }) });

    expect(metadata.title).toBe("Cami Art");
    expect(metadata.alternates).toEqual({ canonical: "/artistas/cami-art" });
    expect(metadata.openGraph).toMatchObject({
      type: "profile",
      images: [{ url: "/api/v1/profile-assets/asset-id/file" }],
    });
  });
});

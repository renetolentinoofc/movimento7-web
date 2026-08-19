import type { MetadataRoute } from "next";
import { getArtists } from "@/lib/artists";

const routes = ["", "/quem-somos", "/participe", "/artistas", "/movimento-7", "/loja", "/leilao", "/parceiros", "/contato", "/privacidade", "/termos-de-servico", "/acessibilidade", "/saude"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://movimento7.com.br";
  const { artists } = await getArtists(new URLSearchParams({ limit: "50" }));
  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/artistas" ? 0.9 : 0.7,
  }));
  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${siteUrl}/artistas/${artist.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...artistRoutes];
}

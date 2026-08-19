import type { Envelope } from "@/lib/api";

export type ArtistMedia = {
  id?: string;
  url: string;
  type: string;
  alt: string;
  credit: string | null;
};

export type ArtistSummary = {
  slug: string;
  display_name: string;
  bio: string;
  city: string | null;
  instagram: string | null;
  featured: boolean;
  categories: string[];
  category_slugs: string[];
  cover: ArtistMedia | null;
};

export type ArtistDetail = {
  slug: string;
  display_name: string;
  bio: string;
  city: string | null;
  instagram: string | null;
  featured: boolean;
  published_at: string | null;
  categories: string[];
  portfolio: ArtistMedia[];
};

export type ArtistCategory = {
  id: string;
  name: string;
  slug: string;
};

const apiOrigin = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000";

export async function getArtists(params: URLSearchParams) {
  try {
    const response = await fetch(`${apiOrigin}/api/v1/profiles?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error("API de artistas indisponível");
    const payload = (await response.json()) as Envelope<ArtistSummary[]>;
    return {
      artists: payload.data ?? [],
      hasMore: payload.meta.has_more === true,
      unavailable: false,
    };
  } catch {
    return { artists: [], hasMore: false, unavailable: true };
  }
}

export async function getArtistCategories(): Promise<ArtistCategory[]> {
  try {
    const response = await fetch(`${apiOrigin}/api/v1/categories`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as Envelope<ArtistCategory[]>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getArtist(slug: string): Promise<ArtistDetail | null> {
  try {
    const response = await fetch(
      `${apiOrigin}/api/v1/profiles/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Envelope<ArtistDetail>;
    return payload.data;
  } catch {
    return null;
  }
}

import type { Envelope } from "@/lib/api";

export type HomeProduct = {
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  available: boolean;
  media: { url: string; alt: string; width?: number; height?: number }[];
};

export type HomeAuctionLot = {
  slug: string;
  title: string;
  artist_name: string;
  starting_bid_cents: number;
  current_bid_cents?: number | null;
  closes_at?: string | null;
  status: string;
  bidding_enabled: boolean;
  media: { url: string; alt: string }[];
};

export type HomePartner = {
  slug: string;
  name: string;
  logo_path: string;
  logo_alt: string;
  website_url?: string | null;
};

const apiUrl = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000";

const defaultPartners: HomePartner[] = [
  { slug: "df-refrigeracao", name: "DF Refrigeração", logo_path: "/brand/partners/df-refrigeracao.webp", logo_alt: "Logo da DF Refrigeração" },
  { slug: "baianao-carnes", name: "Baianão Carnes", logo_path: "/brand/partners/baianao-carnes.webp", logo_alt: "Logo do Baianão Carnes" },
  { slug: "acai-do-boy", name: "Açaí do Boy", logo_path: "/brand/partners/acai-do-boy.webp", logo_alt: "Logo do Açaí do Boy" },
  { slug: "garagem-dos-antigos", name: "Garagem dos Antigos", logo_path: "/brand/partners/garagem-dos-antigos.webp", logo_alt: "Logo da Garagem dos Antigos" },
  { slug: "adega-do-jogador", name: "Adega do Jogador", logo_path: "/assets/images/partners/adega-do-jogador.webp", logo_alt: "Logo da Adega do Jogador" }
];

export function mergePartners(apiPartners: HomePartner[]): HomePartner[] {
  const merged = new Map(defaultPartners.map((partner) => [partner.slug, partner]));
  for (const partner of apiPartners) merged.set(partner.slug, partner);
  return [...merged.values()];
}

async function load<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/${path}`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const payload = await response.json() as Envelope<T[]>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function loadHomeData() {
  const [products, auctionLots, apiPartners] = await Promise.all([
    load<HomeProduct>("products"),
    load<HomeAuctionLot>("auction-lots"),
    load<HomePartner>("partners")
  ]);

  return { products: products.slice(0, 3), auctionLot: auctionLots[0] ?? null, partners: mergePartners(apiPartners) };
}

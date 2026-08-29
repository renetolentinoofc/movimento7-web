import type { Metadata } from "next";
import { AuctionHighlight } from "@/components/home/auction-highlight";
import { BarberBattle } from "@/components/home/barber-battle";
import { FeaturedProducts } from "@/components/home/featured-products";
import { Hero } from "@/components/home/hero";
import { loadHomeData } from "@/components/home/home-data";
import { Partners } from "@/components/home/partners";
import { RimaViva } from "@/components/home/rima-viva";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Movimento 7 — Cultura, Arte & Beleza",
  description: "Cultura urbana, arte, beleza e empreendedorismo em uma plataforma que revela talentos e cria oportunidades em Belo Horizonte.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Movimento 7 — Cultura, Arte & Beleza",
    description: "Um movimento que conecta pessoas, revela talentos e cria oportunidades.",
    url: "/",
    images: [{ url: "/assets/images/home/colecao-cropped-mov7.webp", width: 1130, height: 1392, alt: "Coleção Movimento 7" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Movimento 7 — Cultura, Arte & Beleza",
    description: "Um movimento que conecta pessoas, revela talentos e cria oportunidades.",
    images: ["/assets/images/home/colecao-cropped-mov7.webp"]
  }
};

export default async function Home() {
  const { products, auctionLot, partners, site } = await loadHomeData();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://movimento7.com.br";
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Movimento 7",
    url: siteUrl,
    logo: `${siteUrl}/brand/logo-movimento7-edicao-01.webp`,
    address: { "@type": "PostalAddress", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" }
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    <Hero content={site.content["home.hero"] as Record<string, unknown> | undefined} />
    <BarberBattle />
    <RimaViva />
    <FeaturedProducts products={products} />
    <AuctionHighlight lot={auctionLot} />
    <Partners partners={partners} />
  </>;
}

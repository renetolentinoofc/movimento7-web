import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import pageStyles from "@/components/public-page.module.css";
import { brl, type Envelope } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leilão de arte", alternates: { canonical: "/leilao" } };

type Lot = { slug: string; title: string; artist_name: string; technique?: string; dimensions?: string; starting_bid_cents: number; current_bid_cents?: number; status: string; bidding_enabled: boolean };

async function load() {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000"}/api/v1/auction-lots`, { next: { revalidate: 30 } });
    return (await response.json() as Envelope<Lot[]>).data ?? [];
  } catch { return []; }
}

export default async function AuctionPage() {
  const lots = await load();
  return <>
    <PageHero eyebrow="Arte" title="Leilão & exposição" description="Obras publicadas podem ser conhecidas aqui. Lances monetários permanecem desativados até aprovação jurídica e comercial." />
    <section className={pageStyles.contentSection}>
      <div className="container">
        {lots.length > 0
          ? <div className={pageStyles.catalogGrid}>{lots.map(lot => <article className="card" key={lot.slug}>
              <span className="status">{lot.status}</span>
              <h2 style={{ fontSize: "2rem" }}>{lot.title}</h2>
              <p>{lot.artist_name}</p>
              <p>{lot.technique} {lot.dimensions}</p>
              <p>{lot.current_bid_cents ? `Lance atual: ${brl(lot.current_bid_cents)}` : `Valor inicial: ${brl(lot.starting_bid_cents)}`}</p>
              <Link className="button" href={`/leilao/${lot.slug}`}>{lot.bidding_enabled ? "DAR MEU LANCE" : "VER OBRA"}</Link>
            </article>)}</div>
          : <div className={pageStyles.emptyState}><p>Nenhuma obra ou lote foi publicado. Novos trabalhos aparecerão aqui depois da curadoria e publicação pela equipe.</p></div>}
      </div>
    </section>
  </>;
}

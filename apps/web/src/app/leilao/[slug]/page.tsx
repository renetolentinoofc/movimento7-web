import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/media-image";
import { AuctionBidForm } from "@/components/auction-bid-form";
import { brl, type Envelope } from "@/lib/api";

export const dynamic = "force-dynamic";

type Lot = {
  id: string;
  slug: string;
  title: string;
  artist_name: string;
  technique?: string;
  dimensions?: string;
  description?: string;
  rules?: string;
  starting_bid_cents: number;
  current_bid_cents?: number;
  minimum_increment_cents: number;
  opens_at?: string;
  closes_at?: string;
  status: string;
  bidding_enabled: boolean;
  terms_version: string;
  media: { url: string; alt: string; credit?: string; width?: number; height?: number }[];
  bid_history: { alias: string; amount_cents: number; created_at: string }[];
};

async function load(slug: string) {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000"}/api/v1/auction-lots/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return (await response.json() as Envelope<Lot>).data;
  } catch {
    return null;
  }
}

export default async function LotPage({ params }: { params: Promise<{ slug: string }> }) {
  const lot = await load((await params).slug);
  if (!lot) notFound();

  return <section className="section">
    <div className="container grid cards">
      <div>{lot.media.map(media => <MediaImage
        key={media.url}
        src={media.url}
        alt={media.alt}
        width={media.width ?? 1200}
        height={media.height ?? 900}
        sizes="(max-width: 768px) calc(100vw - 2rem), 50vw"
      />)}</div>
      <div>
        <p className="eyebrow">{lot.artist_name}</p>
        <h1>{lot.title}</h1>
        <p>{lot.technique} · {lot.dimensions}</p>
        <p>{lot.description}</p>
        <p>Valor inicial: {brl(lot.starting_bid_cents)}</p>
        <p>Lance atual: {lot.current_bid_cents ? brl(lot.current_bid_cents) : "nenhum lance"}</p>
        {lot.bidding_enabled
          ? <AuctionBidForm lotId={lot.id} termsVersion={lot.terms_version} minimumCents={lot.current_bid_cents ? lot.current_bid_cents + lot.minimum_increment_cents : lot.starting_bid_cents} />
          : <div className="empty">Obra em exposição. Lances monetários não estão habilitados.</div>}
        <h2 style={{ fontSize: "2rem" }}>Histórico público</h2>
        {lot.bid_history.length
          ? <ul>{lot.bid_history.map((bid, index) => <li key={`${bid.created_at}-${index}`}>{bid.alias}: {brl(bid.amount_cents)}</li>)}</ul>
          : <p className="muted">Nenhum lance público.</p>}
        <p><Link href="/leilao/regras">Conheça as regras e pendências do leilão</Link></p>
      </div>
    </div>
  </section>;
}

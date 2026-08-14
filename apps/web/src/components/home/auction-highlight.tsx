import { ArrowRight, CalendarDays, Gavel } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { brl } from "@/lib/api";
import type { HomeAuctionLot } from "./home-data";
import styles from "./home.module.css";

const statusLabels: Record<string, string> = {
  published: "Em exposição",
  open: "Aberto para lances",
  closed: "Encerrado",
  suspended: "Suspenso"
};

function dateLabel(value?: string | null) {
  if (!value) return "Data em breve";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function AuctionHighlight({ lot }: { lot: HomeAuctionLot | null }) {
  const title = lot?.title ?? "Benvinda de Carvalho";
  const image = lot?.media[0];
  return <section id="leilao-destaque" className={styles.auction} aria-labelledby="auction-title">
    <div className={`container ${styles.auctionGrid}`}>
      <div className={styles.artworkWrap}>
        <span className={styles.artSpark} aria-hidden />
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image.url} alt={image.alt || `Obra ${title}`} width="900" height="900" loading="lazy" />
          : <Image src="/assets/images/home/arte-benvinda-de-carvalho.webp" alt="Obra de arte Benvinda de Carvalho" width={1200} height={1198} sizes="(max-width: 760px) 86vw, 42vw" />}
      </div>
      <div className={styles.auctionCopy}>
        <p className={styles.kickerYellow}>ARTE QUE MOVIMENTA</p>
        <h2 id="auction-title">Leilão<br /><span>beneficente</span></h2>
        <p className={styles.artTitle}>Obra: <strong>{title}</strong></p>
        <p>Participe do nosso leilão e ajude a fortalecer a cultura, valorizar artistas e transformar vidas por meio da arte.</p>
        <dl className={styles.auctionFacts}>
          <div><dt><Gavel aria-hidden /> Lance inicial</dt><dd>{lot ? brl(lot.starting_bid_cents) : "Em breve"}</dd></div>
          <div><dt><CalendarDays aria-hidden /> Encerramento</dt><dd>{dateLabel(lot?.closes_at)}</dd></div>
          <div><dt>Estado atual</dt><dd>{lot ? (statusLabels[lot.status] ?? lot.status) : "Aguardando publicação"}</dd></div>
        </dl>
        <Link className={styles.buttonYellow} href={lot ? `/leilao/${lot.slug}` : "/leilao"}>
          {lot?.bidding_enabled && lot.status === "open" ? "Dar meu lance" : "Quero participar"} <ArrowRight aria-hidden />
        </Link>
      </div>
    </div>
  </section>;
}

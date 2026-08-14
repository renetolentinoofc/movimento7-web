import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import pageStyles from "@/components/public-page.module.css";
import { brl, type Envelope } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loja", description: "Coleção limitada de streetwear Movimento 7.", alternates: { canonical: "/loja" } };

type Product = { slug: string; name: string; description: string; price_cents: number; available: boolean; media: { url: string; alt: string; width?: number; height?: number }[] };

async function getProducts() {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000"}/api/v1/products`, { next: { revalidate: 60 } });
    return (await response.json() as Envelope<Product[]>).data ?? [];
  } catch { return []; }
}

export default async function StorePage() {
  const products = await getProducts();
  return <>
    <PageHero eyebrow="Loja Movimento 7" title="Vista o Movimento" description="Coleção limitada de streetwear.">
      <p>A coleção nasce com três modelos editáveis: Camisa Oversize, Cropped Oversize e Regata Oversize. Eles aparecem depois que fotos, variantes e estoque são publicados.</p>
    </PageHero>
    <section className={pageStyles.contentSection}>
      <div className="container">
        {products.length > 0
          ? <div className={pageStyles.catalogGrid}>{products.map(product => <article className="card" key={product.slug}>
              {product.media[0] && <Image src={product.media[0].url} alt={product.media[0].alt} width={product.media[0].width ?? 800} height={product.media[0].height ?? 800} />}
              <h2 style={{ fontSize: "2rem" }}>{product.name}</h2>
              <p>{brl(product.price_cents)}</p>
              <span className="status">{product.available ? "disponível" : "esgotado"}</span>
              <p><Link className="button" href={`/loja/${product.slug}`}>VER PRODUTO</Link></p>
            </article>)}</div>
          : <div className={pageStyles.emptyState}><p>A coleção está sendo preparada. Produtos aparecem aqui somente depois de fotos, variantes e estoque reais serem publicados.</p></div>}
        <p className={pageStyles.supportLink}><Link href="/loja/trocas-e-entregas">Entrega, trocas e privacidade da loja</Link></p>
      </div>
    </section>
  </>;
}

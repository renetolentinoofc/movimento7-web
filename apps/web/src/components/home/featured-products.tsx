import { ArrowRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { brl } from "@/lib/api";
import type { HomeProduct } from "./home-data";
import styles from "./home.module.css";

const previews = [
  { name: "Camiseta Dreams", image: "/assets/images/products/camiseta-dreams.webp", width: 967, height: 1400 },
  { name: "Camiseta Movimento 7", image: "/assets/images/products/camiseta-movimento7.webp", width: 1200, height: 960 },
  { name: "Cropped Movimento 7", image: "/assets/images/products/cropped-movimento7.webp", width: 1000, height: 1232 }
];

function ProductImage({ product, index }: { product: HomeProduct; index: number }) {
  const media = product.media[0];
  if (!media) {
    const preview = previews[index % previews.length];
    return <Image src={preview.image} alt="" width={preview.width} height={preview.height} sizes="(max-width: 760px) 88vw, 27vw" />;
  }
  return <MediaImage src={media.url} alt={media.alt || `Foto de ${product.name}`} width={media.width ?? 900} height={media.height ?? 1100} sizes="(max-width: 760px) 88vw, 27vw" />;
}

export function FeaturedProducts({ products }: { products: HomeProduct[] }) {
  const hasPublishedProducts = products.length > 0;
  return <section id="loja-destaque" className={styles.shop} aria-labelledby="shop-title">
    <div className={`container ${styles.shopHeading}`}>
      <div>
        <p className={styles.kickerTeal}>VISTA A CULTURA. VISTA O MOVIMENTO.</p>
        <h2 id="shop-title">Loja <span>oficial</span></h2>
      </div>
      <p>Peças autorais que carregam a identidade e ajudam a fortalecer as próximas ações do Movimento 7.</p>
    </div>
    <div className={`container ${styles.products}`}>
      {(hasPublishedProducts ? products : previews).map((item, index) => {
        const product = hasPublishedProducts ? item as HomeProduct : null;
        const preview = !hasPublishedProducts ? item as (typeof previews)[number] : null;
        const name = product?.name ?? preview?.name ?? "Produto Movimento 7";
        return <article className={styles.productCard} key={product?.slug ?? name}>
          <div className={styles.productImage}>
            {product
              ? <ProductImage product={product} index={index} />
              : <Image src={preview!.image} alt={`Prévia de ${name}`} width={preview!.width} height={preview!.height} sizes="(max-width: 760px) 88vw, 27vw" />}
            {!product && <span>EM PREPARAÇÃO</span>}
          </div>
          <div className={styles.productInfo}>
            <div><h3>{name}</h3><p>{product ? brl(product.price_cents) : "Disponibilidade em breve"}</p></div>
            <Link href={product ? `/loja/${product.slug}` : "/loja"} aria-label={`${product ? "Ver" : "Conhecer"} ${name}`}>
              <ShoppingBag aria-hidden />
            </Link>
          </div>
          {product && <span className={styles.availability}>{product.available ? "Disponível" : "Esgotado"}</span>}
        </article>;
      })}
    </div>
    <div className={styles.centerAction}><Link className={styles.buttonTeal} href="/loja">Ver todos os produtos <ArrowRight aria-hidden /></Link></div>
  </section>;
}

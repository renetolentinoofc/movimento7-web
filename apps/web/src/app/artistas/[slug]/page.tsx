import { ArrowLeft, Instagram, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getArtist } from "@/lib/artists";

import styles from "./profile.module.css";

type Params = Promise<{ slug: string }>;

function descriptionOf(bio: string): string {
  const compact = bio.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}…` : compact;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) return { title: "Artista não encontrado" };
  const image = artist.portfolio[0]?.url;
  return {
    title: artist.display_name,
    description: descriptionOf(artist.bio),
    alternates: { canonical: `/artistas/${artist.slug}` },
    openGraph: {
      type: "profile",
      title: artist.display_name,
      description: descriptionOf(artist.bio),
      images: image ? [{ url: image, alt: artist.portfolio[0].alt }] : undefined,
    },
  };
}

export default async function ArtistProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();

  const instagramUrl = artist.instagram
    ? `https://www.instagram.com/${artist.instagram}`
    : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist.display_name,
    description: artist.bio,
    url: `/artistas/${artist.slug}`,
    homeLocation: artist.city ? { "@type": "Place", name: artist.city } : undefined,
    sameAs: instagramUrl ? [instagramUrl] : undefined,
    knowsAbout: artist.categories,
    image: artist.portfolio.map((item) => item.url),
  };

  return (
    <>
      <section className={styles.hero}>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.portrait}>
            {artist.portfolio[0] ? (
              <Image
                alt=""
                fill
                priority
                sizes="(max-width: 800px) 100vw, 45vw"
                src={artist.portfolio[0].url}
                unoptimized
              />
            ) : (
              <span aria-hidden="true">{artist.display_name.slice(0, 1)}</span>
            )}
          </div>
          <div className={styles.identity}>
            <Link className={styles.back} href="/artistas"><ArrowLeft size={18} /> Todos os artistas</Link>
            <div className={styles.tags}>
              {artist.featured ? <span className={styles.featured}><Sparkles size={15} /> Destaque</span> : null}
              {artist.categories.map((category) => <span key={category}>{category}</span>)}
            </div>
            <h1>{artist.display_name}</h1>
            <div className={styles.facts}>
              {artist.city ? <span><MapPin size={19} /> {artist.city}</span> : null}
              {instagramUrl ? (
                <a href={instagramUrl} rel="noopener noreferrer" target="_blank">
                  <Instagram size={19} /> @{artist.instagram}<span className="visually-hidden"> (abre em nova janela)</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={`section paper ${styles.story}`}>
        <div className={`container ${styles.storyGrid}`}>
          <div>
            <p className="eyebrow">Trajetória</p>
            <h2>Sobre {artist.display_name}</h2>
          </div>
          <div className={styles.bio}>{artist.bio.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p> : null)}</div>
        </div>
      </section>

      <section className={`section ${styles.portfolio}`} aria-labelledby="portfolio-title">
        <div className="container">
          <div className={styles.portfolioHeading}>
            <div>
              <p className="eyebrow">Portfólio</p>
              <h2 id="portfolio-title">Trabalhos e momentos</h2>
            </div>
            <p className="lead">Uma seleção publicada pela curadoria do Movimento 7.</p>
          </div>
          {artist.portfolio.length ? (
            <div className={styles.mediaGrid}>
              {artist.portfolio.map((item, index) => (
                <figure className={index === 0 ? styles.mainMedia : undefined} key={item.id ?? item.url}>
                  <div className={styles.mediaFrame}>
                    <Image
                      alt={item.alt}
                      fill
                      sizes={index === 0 ? "(max-width: 800px) 100vw, 65vw" : "(max-width: 800px) 100vw, 33vw"}
                      src={item.url}
                      unoptimized
                    />
                  </div>
                  {item.credit ? <figcaption>Crédito: {item.credit}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="empty">O portfólio visual deste artista está sendo preparado.</div>
          )}
          <div className={styles.closing}>
            <p>Quer fazer parte desta rede?</p>
            <Link className="button" href="/participe">QUERO PARTICIPAR</Link>
          </div>
        </div>
      </section>
    </>
  );
}

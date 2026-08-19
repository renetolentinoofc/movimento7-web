import { Instagram, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getArtistCategories, getArtists } from "@/lib/artists";

import styles from "./artistas.module.css";

export const metadata: Metadata = {
  title: "Artistas",
  description: "Conheça artistas, talentos e iniciativas que fazem parte do Movimento 7.",
  alternates: { canonical: "/artistas" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function pageHref(
  page: number,
  filters: { q: string; city: string; category: string },
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("cidade", filters.city);
  if (filters.category) params.set("categoria", filters.category);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/artistas?${query}` : "/artistas";
}

export default async function ArtistsPage({ searchParams }: { searchParams: SearchParams }) {
  const supplied = await searchParams;
  const filters = {
    q: valueOf(supplied.q).slice(0, 80),
    city: valueOf(supplied.cidade).slice(0, 120),
    category: valueOf(supplied.categoria).slice(0, 100),
  };
  const parsedPage = Number.parseInt(valueOf(supplied.pagina), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const apiParams = new URLSearchParams({ page: String(page), limit: "12" });
  if (filters.q) apiParams.set("q", filters.q);
  if (filters.city) apiParams.set("city", filters.city);
  if (filters.category) apiParams.set("category", filters.category);

  const [{ artists, hasMore, unavailable }, categories] = await Promise.all([
    getArtists(apiParams),
    getArtistCategories(),
  ]);
  const hasFilters = Boolean(filters.q || filters.city || filters.category);

  return (
    <>
      <section className={styles.hero}>
        <div className={`container ${styles.heroContent}`}>
          <p className="eyebrow">Talentos do Movimento</p>
          <h1>Quem faz a cena acontecer</h1>
          <p className="lead">
            Conheça vozes, traços, movimentos e ideias que transformam cultura em encontro.
          </p>
        </div>
      </section>

      <section className={`section ${styles.catalog}`} aria-labelledby="artists-catalog-title">
        <div className="container">
          <div className={styles.intro}>
            <div>
              <p className="eyebrow">Explore a rede</p>
              <h2 id="artists-catalog-title">Artistas e iniciativas</h2>
            </div>
            <p className="lead">
              Busque pelo nome, pela cidade ou escolha uma linguagem artística.
            </p>
          </div>

          <form className={styles.filters} action="/artistas" method="get" role="search">
            <div className="field">
              <label htmlFor="artist-search">Nome ou cidade</label>
              <input
                defaultValue={filters.q}
                id="artist-search"
                name="q"
                placeholder="Ex.: Cami Art"
                type="search"
              />
            </div>
            <div className="field">
              <label htmlFor="artist-city">Cidade</label>
              <input
                defaultValue={filters.city}
                id="artist-city"
                name="cidade"
                placeholder="Ex.: Belo Horizonte"
              />
            </div>
            <div className="field">
              <label htmlFor="artist-category">Categoria</label>
              <select defaultValue={filters.category} id="artist-category" name="categoria">
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterActions}>
              <button className="button" type="submit">BUSCAR</button>
              {hasFilters ? <Link className="button secondary" href="/artistas">LIMPAR</Link> : null}
            </div>
          </form>

          {unavailable ? (
            <div className="error-summary" role="alert">
              Não foi possível carregar os artistas agora. Tente novamente em instantes.
            </div>
          ) : null}

          {!unavailable && artists.length === 0 ? (
            <div className="empty">
              <p>Nenhum artista publicado corresponde a esta busca.</p>
              {hasFilters ? <Link href="/artistas">Ver todos os artistas</Link> : null}
            </div>
          ) : null}

          <div className={styles.grid}>
            {artists.map((artist) => (
              <article className={styles.card} key={artist.slug}>
                <Link
                  aria-label={`Conhecer ${artist.display_name}`}
                  className={styles.imageLink}
                  href={`/artistas/${artist.slug}`}
                >
                  {artist.cover ? (
                    <Image
                      alt={artist.cover.alt}
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      src={artist.cover.url}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.placeholder} aria-hidden="true">
                      {artist.display_name.slice(0, 1)}
                    </span>
                  )}
                  {artist.featured ? (
                    <span className={styles.featured}><Sparkles size={15} /> Destaque</span>
                  ) : null}
                </Link>
                <div className={styles.cardBody}>
                  <div className={styles.tags}>
                    {artist.categories.map((category) => <span key={category}>{category}</span>)}
                  </div>
                  <h3><Link href={`/artistas/${artist.slug}`}>{artist.display_name}</Link></h3>
                  {artist.city ? <p className={styles.location}><MapPin size={17} /> {artist.city}</p> : null}
                  <p className={styles.bio}>{artist.bio}</p>
                  <div className={styles.cardFooter}>
                    <Link className={styles.profileLink} href={`/artistas/${artist.slug}`}>CONHECER PERFIL</Link>
                    {artist.instagram ? <span title={`@${artist.instagram}`}><Instagram aria-label="Instagram disponível" size={19} /></span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {(page > 1 || hasMore) ? (
            <nav aria-label="Paginação dos artistas" className={styles.pagination}>
              {page > 1 ? <Link className="button secondary" href={pageHref(page - 1, filters)}>ANTERIOR</Link> : <span />}
              <span>Página {page}</span>
              {hasMore ? <Link className="button secondary" href={pageHref(page + 1, filters)}>PRÓXIMA</Link> : <span />}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}

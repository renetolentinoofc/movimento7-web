"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import { AdminProfileDetail } from "./admin-profile-detail";
import styles from "./admin-profiles.module.css";

type ProfileSummary = {
  id: string;
  slug: string;
  display_name: string;
  city: string | null;
  status: "draft" | "published" | "archived";
  featured: boolean;
  categories: string[];
  asset_count: number;
  updated_at: string;
  published_at: string | null;
};

const STATUS_LABELS: Record<ProfileSummary["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function AdminProfiles() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const description = useMemo(() => {
    const parts = [`Página ${page}`];
    if (statusFilter) parts.push(STATUS_LABELS[statusFilter as ProfileSummary["status"]]);
    if (query) parts.push(`busca por “${query}”`);
    return parts.join(" · ");
  }, [page, query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/v1/admin/auth/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<AdminSessionData>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (!response.ok || !payload?.data?.csrf_token) {
          setError(apiErrorMessage(payload, "Não foi possível validar sua sessão."));
          return;
        }
        setCsrfToken(payload.data.csrf_token);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Não foi possível conectar ao serviço de autenticação.");
      }
    }
    void loadSession();
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfiles() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);
      try {
        const response = await fetch(`/api/v1/admin/profiles?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<ProfileSummary[]>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível carregar os perfis."));
          return;
        }
        setProfiles(payload.data);
        setHasMore(payload.meta.has_more === true);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Tente atualizar a lista.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProfiles();
    return () => controller.abort();
  }, [page, query, refreshKey, router, statusFilter]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setQuery("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <section aria-labelledby="profiles-title" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Painel</p>
          <h1 id="profiles-title">Perfis e artistas</h1>
          <p className="lead">Revise rascunhos, prepare mídias e publique talentos aprovados.</p>
        </div>
        <button className="button secondary" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} type="button">
          {loading ? "ATUALIZANDO…" : "ATUALIZAR"}
        </button>
      </div>

      <form className={styles.filters} onSubmit={submitSearch} role="search">
        <div className="field">
          <label htmlFor="profile-search">Buscar artista</label>
          <input id="profile-search" onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome artístico" type="search" value={searchInput} />
        </div>
        <div className="field">
          <label htmlFor="profile-status-filter">Status</label>
          <select id="profile-status-filter" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}>
            <option value="">Todos os status</option>
            <option value="draft">Rascunhos</option>
            <option value="published">Publicados</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className="button" type="submit">BUSCAR</button>
          <button className="button secondary" onClick={clearFilters} type="button">LIMPAR</button>
        </div>
      </form>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}

      {selectedId ? (
        <AdminProfileDetail
          csrfToken={csrfToken}
          onChanged={() => setRefreshKey((value) => value + 1)}
          onClose={() => setSelectedId("")}
          profileId={selectedId}
        />
      ) : null}

      <div className={styles.listHeader}>
        <p className="muted">{description}</p>
        <p aria-live="polite" className="muted">{loading ? "Carregando perfis…" : `${profiles.length} perfil(is) nesta página`}</p>
      </div>

      {!loading && profiles.length === 0 ? <div className="empty">Nenhum perfil encontrado. Aprove uma inscrição e use “Criar perfil em rascunho”.</div> : null}

      <div className={styles.grid} aria-busy={loading}>
        {profiles.map((profile) => (
          <article className={styles.card} key={profile.id}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.slug}>/{profile.slug}</p>
                <h2>{profile.display_name}</h2>
              </div>
              <span className={styles.status} data-status={profile.status}>{STATUS_LABELS[profile.status]}</span>
            </div>
            <div className={styles.tags}>
              {profile.featured ? <span>Destaque</span> : null}
              {profile.categories.map((category) => <span key={category}>{category}</span>)}
            </div>
            <dl className={styles.metadata}>
              <div><dt>Cidade</dt><dd>{profile.city || "Não informada"}</dd></div>
              <div><dt>Mídias</dt><dd>{profile.asset_count}</dd></div>
              <div><dt>Atualizado</dt><dd>{formatDate(profile.updated_at)}</dd></div>
            </dl>
            <button className="button" onClick={() => setSelectedId(profile.id)} type="button">EDITAR E PRÉ-VISUALIZAR</button>
          </article>
        ))}
      </div>

      <nav aria-label="Paginação dos perfis" className={styles.pagination}>
        <button className="button secondary" disabled={loading || page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">ANTERIOR</button>
        <span>Página {page}</span>
        <button className="button secondary" disabled={loading || !hasMore} onClick={() => setPage((value) => value + 1)} type="button">PRÓXIMA</button>
      </nav>
    </section>
  );
}

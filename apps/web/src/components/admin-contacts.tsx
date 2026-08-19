"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import { AdminContactDetail } from "./admin-contact-detail";
import styles from "./admin-contacts.module.css";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  ["received", "Recebido"],
  ["in_progress", "Em atendimento"],
  ["resolved", "Resolvido"],
  ["archived", "Arquivado"],
] as const;

export type ContactStatus = (typeof STATUS_OPTIONS)[number][0];

type ContactSummary = {
  id: string;
  protocol: string;
  name: string;
  email: string;
  subject: string;
  status: ContactStatus;
  assigned_to: { id: string; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
};

export function contactStatusLabel(status: ContactStatus | null): string {
  if (!status) return "Início";
  return STATUS_OPTIONS.find(([value]) => value === status)?.[1] ?? status;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
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
    if (statusFilter) parts.push(contactStatusLabel(statusFilter as ContactStatus));
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
    async function loadContacts() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);
      try {
        const response = await fetch(`/api/v1/admin/contacts?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<ContactSummary[]>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (response.status === 403 && payload?.error?.code === "password_change_required") {
          router.replace("/painel/trocar-senha");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível carregar os contatos."));
          return;
        }
        setContacts(payload.data);
        setHasMore(payload.meta.has_more === true);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Tente atualizar a caixa de entrada.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadContacts();
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
    <section aria-labelledby="contacts-title" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Atendimento</p>
          <h1 id="contacts-title">Contatos</h1>
          <p className="lead">Organize mensagens, responsáveis, notas e respostas em um só fluxo.</p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRefreshKey((value) => value + 1)}
          type="button"
        >
          {loading ? "ATUALIZANDO…" : "ATUALIZAR"}
        </button>
      </div>

      <form className={styles.filters} onSubmit={submitSearch} role="search">
        <div className="field">
          <label htmlFor="contact-search">Buscar contato</label>
          <input
            id="contact-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome, e-mail, assunto ou protocolo"
            type="search"
            value={searchInput}
          />
        </div>
        <div className="field">
          <label htmlFor="contact-status-filter">Status</label>
          <select
            id="contact-status-filter"
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            value={statusFilter}
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className="button" type="submit">BUSCAR</button>
          <button className="button secondary" onClick={clearFilters} type="button">LIMPAR</button>
        </div>
      </form>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}

      {selectedId ? (
        <AdminContactDetail
          contactId={selectedId}
          csrfToken={csrfToken}
          onChanged={() => setRefreshKey((value) => value + 1)}
          onClose={() => setSelectedId("")}
        />
      ) : null}

      <div className={styles.listHeader}>
        <p className="muted">{description}</p>
        <p aria-live="polite" className="muted">
          {loading ? "Carregando contatos…" : `${contacts.length} mensagem(ns) nesta página`}
        </p>
      </div>

      {!loading && contacts.length === 0 ? (
        <div className="empty">Nenhuma mensagem encontrada com estes filtros.</div>
      ) : null}

      <div aria-busy={loading} className={styles.list}>
        {contacts.map((contact) => (
          <article className={styles.card} key={contact.id}>
            <div className={styles.identity}>
              <div>
                <p className={styles.protocol}>{contact.protocol}</p>
                <h2>{contact.name}</h2>
                <p>{contact.subject}</p>
              </div>
              <span className={styles.status} data-status={contact.status}>
                {contactStatusLabel(contact.status)}
              </span>
            </div>
            <dl className={styles.metadata}>
              <div><dt>E-mail</dt><dd>{contact.email}</dd></div>
              <div><dt>Responsável</dt><dd>{contact.assigned_to?.name ?? "Não atribuído"}</dd></div>
              <div><dt>Recebido</dt><dd>{formatDate(contact.created_at)}</dd></div>
            </dl>
            <button className="button" onClick={() => setSelectedId(contact.id)} type="button">
              ABRIR ATENDIMENTO
            </button>
          </article>
        ))}
      </div>

      <nav aria-label="Paginação dos contatos" className={styles.pagination}>
        <button
          className="button secondary"
          disabled={loading || page === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          type="button"
        >
          ANTERIOR
        </button>
        <span>Página {page}</span>
        <button
          className="button secondary"
          disabled={loading || !hasMore}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          PRÓXIMA
        </button>
      </nav>
    </section>
  );
}

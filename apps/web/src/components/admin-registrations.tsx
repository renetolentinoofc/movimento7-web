"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-registrations.module.css";
import { AdminRegistrationDetail } from "./admin-registration-detail";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "received", label: "Recebida" },
  { value: "reviewing", label: "Em análise" },
  { value: "approved", label: "Aprovada" },
  { value: "waitlisted", label: "Lista de espera" },
  { value: "rejected", label: "Rejeitada" },
  { value: "withdrawn", label: "Desistência" },
] as const;

type RegistrationStatus = (typeof STATUS_OPTIONS)[number]["value"];

type Registration = {
  id: string;
  protocol: string;
  full_name: string;
  professional_name: string | null;
  city: string;
  status: RegistrationStatus;
  priority: string;
  created_at: string;
};

type StatusDraft = {
  status: RegistrationStatus;
  reason: string;
};

function statusLabel(status: RegistrationStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function notificationLabel(status: string): string {
  if (status === "sent") return " E-mail enviado automaticamente.";
  if (status === "logged") return " E-mail registrado em modo de teste.";
  if (status === "failed") return " O status foi salvo, mas o e-mail falhou.";
  return " Esta inscrição antiga não possui e-mail cadastrado.";
}

function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] ?? priority;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function AdminRegistrations() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StatusDraft>>({});
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const listDescription = useMemo(() => {
    const parts = [`Página ${page}`];
    if (statusFilter) parts.push(statusLabel(statusFilter as RegistrationStatus));
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

    async function loadRegistrations() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);

      try {
        const response = await fetch(`/api/v1/admin/registrations?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<Registration[]>(response);

        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (response.status === 403 && payload?.error?.code === "password_change_required") {
          router.replace("/painel/trocar-senha");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível carregar as inscrições."));
          return;
        }

        setRegistrations(payload.data);
        setHasMore(payload.meta.has_more === true);
        setDrafts(
          Object.fromEntries(
            payload.data.map((registration) => [
              registration.id,
              { status: registration.status, reason: "" },
            ]),
          ),
        );
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Tente atualizar a lista.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRegistrations();
    return () => controller.abort();
  }, [page, query, refreshKey, router, statusFilter]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
    setSuccess("");
  }

  function clearFilters() {
    setSearchInput("");
    setQuery("");
    setStatusFilter("");
    setPage(1);
    setSuccess("");
  }

  function updateDraft(id: string, values: Partial<StatusDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
    setFieldErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function saveStatus(registration: Registration) {
    const draft = drafts[registration.id];
    if (!draft || draft.status === registration.status) {
      setFieldErrors((current) => ({
        ...current,
        [registration.id]: "Escolha um status diferente do atual.",
      }));
      return;
    }
    if (draft.reason.trim().length < 3) {
      setFieldErrors((current) => ({
        ...current,
        [registration.id]: "Informe um motivo com pelo menos 3 caracteres.",
      }));
      return;
    }
    if (
      ["approved", "rejected"].includes(draft.status) &&
      !window.confirm(`Confirma a decisão: ${statusLabel(draft.status)}?`)
    ) {
      return;
    }

    setSavingId(registration.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/v1/admin/registrations/${registration.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ status: draft.status, reason: draft.reason.trim() }),
      });
      const payload = await readApiEnvelope<{
        id: string;
        status: RegistrationStatus;
        notification_status: string;
      }>(response);

      if (response.status === 401) {
        router.replace("/painel/login");
        return;
      }
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível alterar o status."));
        return;
      }

      setSuccess(
        `${registration.full_name}: status alterado para ${statusLabel(payload.data.status)}.${notificationLabel(payload.data.notification_status)}`,
      );
      setRefreshKey((current) => current + 1);
    } catch {
      setError("API indisponível. O status não foi alterado.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section aria-labelledby="registrations-title" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Painel</p>
          <h1 id="registrations-title">Inscrições</h1>
          <p className="lead">
            Consulte candidaturas e registre cada decisão com um motivo auditável.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRefreshKey((current) => current + 1)}
          type="button"
        >
          {loading ? "ATUALIZANDO…" : "ATUALIZAR"}
        </button>
      </div>

      <form className={styles.filters} onSubmit={submitSearch} role="search">
        <div className="field">
          <label htmlFor="registration-search">Buscar por nome</label>
          <input
            id="registration-search"
            name="q"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome civil ou profissional"
            type="search"
            value={searchInput}
          />
        </div>
        <div className="field">
          <label htmlFor="registration-status-filter">Status</label>
          <select
            id="registration-status-filter"
            name="status"
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
              setSuccess("");
            }}
            value={statusFilter}
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button className="button" type="submit">
            BUSCAR
          </button>
          <button className="button secondary" onClick={clearFilters} type="button">
            LIMPAR
          </button>
        </div>
      </form>

      {error ? (
        <div className="error-summary" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="success" role="status">
          {success}
        </div>
      ) : null}

      {selectedId ? (
        <AdminRegistrationDetail
          csrfToken={csrfToken}
          onChanged={() => setRefreshKey((current) => current + 1)}
          onClose={() => setSelectedId("")}
          registrationId={selectedId}
        />
      ) : null}

      <div className={styles.listHeader}>
        <p className="muted">{listDescription}</p>
        <p aria-live="polite" className="muted">
          {loading ? "Carregando inscrições…" : `${registrations.length} registro(s) nesta página`}
        </p>
      </div>

      {!loading && registrations.length === 0 ? (
        <div className="empty">Nenhuma inscrição encontrada com os filtros selecionados.</div>
      ) : null}

      <div className={styles.list} aria-busy={loading}>
        {registrations.map((registration) => {
          const draft = drafts[registration.id] ?? {
            status: registration.status,
            reason: "",
          };
          const fieldError = fieldErrors[registration.id];
          return (
            <article className={styles.card} key={registration.id}>
              <div className={styles.identity}>
                <div>
                  <p className={styles.protocol}>{registration.protocol}</p>
                  <h2>{registration.professional_name || registration.full_name}</h2>
                  {registration.professional_name ? (
                    <p className="muted">{registration.full_name}</p>
                  ) : null}
                </div>
                <div className={styles.cardActions}>
                  <span className={styles.status} data-status={registration.status}>
                    {statusLabel(registration.status)}
                  </span>
                  <button
                    className="button secondary"
                    onClick={() => setSelectedId(registration.id)}
                    type="button"
                  >
                    ABRIR FICHA
                  </button>
                </div>
              </div>

              <dl className={styles.metadata}>
                <div>
                  <dt>Cidade</dt>
                  <dd>{registration.city}</dd>
                </div>
                <div>
                  <dt>Prioridade</dt>
                  <dd>{priorityLabel(registration.priority)}</dd>
                </div>
                <div>
                  <dt>Recebida em</dt>
                  <dd>{formatDate(registration.created_at)}</dd>
                </div>
              </dl>

              <div className={styles.statusForm}>
                <div className="field">
                  <label htmlFor={`status-${registration.id}`}>
                    Novo status de {registration.full_name}
                  </label>
                  <select
                    id={`status-${registration.id}`}
                    onChange={(event) =>
                      updateDraft(registration.id, {
                        status: event.target.value as RegistrationStatus,
                      })
                    }
                    value={draft.status}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`reason-${registration.id}`}>
                    Motivo da alteração de {registration.full_name}
                  </label>
                  <input
                    aria-describedby={fieldError ? `error-${registration.id}` : undefined}
                    aria-invalid={Boolean(fieldError)}
                    id={`reason-${registration.id}`}
                    onChange={(event) =>
                      updateDraft(registration.id, { reason: event.target.value })
                    }
                    placeholder="Ex.: portfólio aprovado pela curadoria"
                    value={draft.reason}
                  />
                  {fieldError ? (
                    <p className="error" id={`error-${registration.id}`}>
                      {fieldError}
                    </p>
                  ) : null}
                </div>
                <button
                  className="button"
                  disabled={savingId === registration.id || !csrfToken}
                  onClick={() => void saveStatus(registration)}
                  type="button"
                >
                  {savingId === registration.id ? "SALVANDO…" : "SALVAR STATUS"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <nav aria-label="Paginação das inscrições" className={styles.pagination}>
        <button
          className="button secondary"
          disabled={loading || page === 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          type="button"
        >
          ANTERIOR
        </button>
        <span>Página {page}</span>
        <button
          className="button secondary"
          disabled={loading || !hasMore}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          PRÓXIMA
        </button>
      </nav>
    </section>
  );
}

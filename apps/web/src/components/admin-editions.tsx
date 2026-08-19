"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-editions.module.css";

type EditionStatus = "draft" | "published" | "closed" | "archived";

type Edition = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: EditionStatus;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  location: string | null;
  address: string | null;
  map_url: string | null;
  capacity: number | null;
  retention_days: number;
  published_at: string | null;
  registration_count: number;
  registration_open: boolean;
  created_at: string;
  updated_at: string;
};

type EditionDraft = {
  name: string;
  slug: string;
  description: string;
  starts_at: string;
  ends_at: string;
  registration_opens_at: string;
  registration_closes_at: string;
  location: string;
  address: string;
  map_url: string;
  capacity: string;
  retention_days: string;
};

const STATUS_LABELS: Record<EditionStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  closed: "Encerrada",
  archived: "Arquivada",
};

const EMPTY_DRAFT: EditionDraft = {
  name: "",
  slug: "",
  description: "",
  starts_at: "",
  ends_at: "",
  registration_opens_at: "",
  registration_closes_at: "",
  location: "",
  address: "",
  map_url: "",
  capacity: "",
  retention_days: "730",
};

function localDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function displayDate(value: string | null): string {
  if (!value) return "Não definida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function draftFromEdition(edition: Edition): EditionDraft {
  return {
    name: edition.name,
    slug: edition.slug,
    description: edition.description ?? "",
    starts_at: localDate(edition.starts_at),
    ends_at: localDate(edition.ends_at),
    registration_opens_at: localDate(edition.registration_opens_at),
    registration_closes_at: localDate(edition.registration_closes_at),
    location: edition.location ?? "",
    address: edition.address ?? "",
    map_url: edition.map_url ?? "",
    capacity: edition.capacity?.toString() ?? "",
    retention_days: edition.retention_days.toString(),
  };
}

function apiPayload(draft: EditionDraft) {
  const toIso = (value: string) => (value ? new Date(value).toISOString() : null);
  return {
    ...draft,
    starts_at: toIso(draft.starts_at),
    ends_at: toIso(draft.ends_at),
    registration_opens_at: toIso(draft.registration_opens_at),
    registration_closes_at: toIso(draft.registration_closes_at),
    capacity: draft.capacity ? Number(draft.capacity) : null,
    retention_days: Number(draft.retention_days),
  };
}

function EditionForm({
  edition,
  csrfToken,
  onCancel,
  onSaved,
}: {
  edition: Edition | null;
  csrfToken: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<EditionDraft>(() =>
    edition ? draftFromEdition(edition) : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update(name: keyof EditionDraft, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch(
        edition ? `/api/v1/admin/editions/${edition.id}` : "/api/v1/admin/editions",
        {
          method: edition ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(apiPayload(draft)),
        },
      );
      const payload = await readApiEnvelope<Edition>(response);
      if (!response.ok || !payload?.data) {
        setFieldErrors(payload?.error?.fields ?? {});
        setError(apiErrorMessage(payload, "Não foi possível salvar a edição."));
        return;
      }
      onSaved(edition ? "Edição atualizada." : "Edição criada como rascunho.");
    } catch {
      setError("A API ficou indisponível durante o salvamento.");
    } finally {
      setSaving(false);
    }
  }

  const field = (
    name: keyof EditionDraft,
    label: string,
    options: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="field">
      <label htmlFor={`edition-${name}`}>{label}</label>
      <input
        {...options}
        id={`edition-${name}`}
        value={draft[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={fieldErrors[name] ? "true" : undefined}
      />
      {fieldErrors[name] ? <p className="error">{fieldErrors[name][0]}</p> : null}
    </div>
  );

  return (
    <form className={styles.editor} onSubmit={submit}>
      <div className={styles.editorHeading}>
        <div>
          <p className="eyebrow">{edition ? "Editar edição" : "Nova edição"}</p>
          <h2>{edition?.name ?? "Configurar programação"}</h2>
        </div>
        <button className="button secondary" onClick={onCancel} type="button">CANCELAR</button>
      </div>
      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      <div className={styles.formGrid}>
        {field("name", "Nome", { required: true, maxLength: 140 })}
        {field("slug", "Slug", { required: true, maxLength: 160, pattern: "[a-z0-9-]+" })}
        {field("registration_opens_at", "Abertura das inscrições", { required: true, type: "datetime-local" })}
        {field("registration_closes_at", "Encerramento das inscrições", { required: true, type: "datetime-local" })}
        {field("starts_at", "Início do evento", { required: true, type: "datetime-local" })}
        {field("ends_at", "Encerramento do evento", { required: true, type: "datetime-local" })}
        {field("location", "Local", { maxLength: 180 })}
        {field("address", "Endereço", { maxLength: 300 })}
        {field("map_url", "Link do mapa", { type: "url", maxLength: 500 })}
        {field("capacity", "Capacidade de inscrições", { type: "number", min: 1, max: 100000 })}
        {field("retention_days", "Retenção dos dados (dias)", { required: true, type: "number", min: 30, max: 3650 })}
      </div>
      <div className="field">
        <label htmlFor="edition-description">Descrição</label>
        <textarea id="edition-description" maxLength={5000} value={draft.description} onChange={(event) => update("description", event.target.value)} />
        {fieldErrors.description ? <p className="error">{fieldErrors.description[0]}</p> : null}
      </div>
      {fieldErrors.dates ? <p className="error">{fieldErrors.dates[0]}</p> : null}
      <button className="button" disabled={saving || !csrfToken} type="submit">
        {saving ? "SALVANDO…" : "SALVAR EDIÇÃO"}
      </button>
    </form>
  );
}

export function AdminEditions() {
  const router = useRouter();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [editing, setEditing] = useState<Edition | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const [sessionResponse, editionsResponse] = await Promise.all([
          fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store", signal: controller.signal }),
          fetch("/api/v1/admin/editions", { credentials: "include", cache: "no-store", signal: controller.signal }),
        ]);
        if (sessionResponse.status === 401 || editionsResponse.status === 401) {
          router.replace("/painel/login");
          return;
        }
        const sessionPayload = await readApiEnvelope<AdminSessionData>(sessionResponse);
        const editionsPayload = await readApiEnvelope<Edition[]>(editionsResponse);
        if (!sessionResponse.ok || !sessionPayload?.data?.csrf_token) {
          setError(apiErrorMessage(sessionPayload, "Não foi possível validar sua sessão."));
          return;
        }
        if (!editionsResponse.ok || !editionsPayload?.data) {
          setError(apiErrorMessage(editionsPayload, "Não foi possível carregar as edições."));
          return;
        }
        setCsrfToken(sessionPayload.data.csrf_token);
        setEditions(editionsPayload.data);
        setError("");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Não foi possível conectar à API.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey, router]);

  function saved(message: string) {
    setNotice(message);
    setEditing(undefined);
    setRefreshKey((value) => value + 1);
  }

  async function changeStatus(edition: Edition, status: EditionStatus) {
    if (!window.confirm(`Confirmar alteração de “${edition.name}” para ${STATUS_LABELS[status]}?`)) return;
    setActionId(edition.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/editions/${edition.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ status }),
      });
      const payload = await readApiEnvelope<Edition>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível alterar o status."));
        return;
      }
      setNotice(`Edição alterada para ${STATUS_LABELS[payload.data.status]}.`);
      setRefreshKey((value) => value + 1);
    } catch {
      setError("A API ficou indisponível durante a alteração.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section aria-labelledby="editions-title" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Painel</p>
          <h1 id="editions-title">Edições e programação</h1>
          <p className="lead">Controle quando o formulário abre, encerra e qual edição recebe as inscrições.</p>
        </div>
        <button className="button" onClick={() => { setEditing(null); setNotice(""); }} type="button">NOVA EDIÇÃO</button>
      </div>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {notice ? <div className="success" role="status">{notice}</div> : null}
      {editing !== undefined ? <EditionForm key={editing?.id ?? "new"} edition={editing} csrfToken={csrfToken} onCancel={() => setEditing(undefined)} onSaved={saved} /> : null}

      <div className={styles.listHeading}>
        <h2>Edições cadastradas</h2>
        <button className="button secondary" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)} type="button">{loading ? "ATUALIZANDO…" : "ATUALIZAR"}</button>
      </div>
      {!loading && editions.length === 0 ? <div className="empty">Nenhuma edição cadastrada.</div> : null}
      <div className={styles.grid} aria-busy={loading}>
        {editions.map((edition) => (
          <article className={styles.card} key={edition.id}>
            <div className={styles.cardTop}>
              <div><p className={styles.slug}>/{edition.slug}</p><h3>{edition.name}</h3></div>
              <span className={styles.status} data-status={edition.status}>{STATUS_LABELS[edition.status]}</span>
            </div>
            <p className={edition.registration_open ? styles.open : "muted"}>{edition.registration_open ? "Inscrições abertas agora" : "Inscrições fechadas"}</p>
            <dl className={styles.details}>
              <div><dt>Inscrições</dt><dd>{edition.registration_count}{edition.capacity ? ` / ${edition.capacity}` : ""}</dd></div>
              <div><dt>Janela</dt><dd>{displayDate(edition.registration_opens_at)}<br />até {displayDate(edition.registration_closes_at)}</dd></div>
              <div><dt>Evento</dt><dd>{displayDate(edition.starts_at)}<br />até {displayDate(edition.ends_at)}</dd></div>
              <div><dt>Local</dt><dd>{edition.location || "Não definido"}</dd></div>
            </dl>
            <div className={styles.actions}>
              <button className="button secondary" onClick={() => setEditing(edition)} type="button">EDITAR</button>
              {edition.status === "draft" ? <button className="button" disabled={actionId === edition.id} onClick={() => void changeStatus(edition, "published")} type="button">PUBLICAR</button> : null}
              {edition.status === "published" ? <button className="button" disabled={actionId === edition.id} onClick={() => void changeStatus(edition, "closed")} type="button">ENCERRAR</button> : null}
              {edition.status === "closed" ? <button className="button" disabled={actionId === edition.id} onClick={() => void changeStatus(edition, "published")} type="button">REABRIR</button> : null}
              {edition.status === "archived" ? <button className="button secondary" disabled={actionId === edition.id} onClick={() => void changeStatus(edition, "draft")} type="button">RESTAURAR</button> : null}
              {["draft", "closed"].includes(edition.status) ? <button className="button secondary" disabled={actionId === edition.id} onClick={() => void changeStatus(edition, "archived")} type="button">ARQUIVAR</button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

import styles from "./admin-registration-detail.module.css";

const STATUS_OPTIONS = [
  ["received", "Recebida"],
  ["reviewing", "Em análise"],
  ["approved", "Aprovada"],
  ["waitlisted", "Lista de espera"],
  ["rejected", "Rejeitada"],
  ["withdrawn", "Desistência"],
] as const;

const PRIORITY_OPTIONS = [
  ["low", "Baixa"],
  ["normal", "Normal"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
] as const;

type RegistrationStatus = (typeof STATUS_OPTIONS)[number][0];

type Person = { id: string; name: string; email: string };

type Detail = {
  id: string;
  protocol: string;
  full_name: string;
  professional_name: string | null;
  email: string | null;
  phone: string;
  instagram: string | null;
  city: string;
  presentation: string;
  portfolio_url: string | null;
  extra_data: Record<string, unknown>;
  status: RegistrationStatus;
  priority: string;
  assigned_to: Person | null;
  category: { id: string; name: string; slug: string } | null;
  edition: { id: string; name: string; slug: string } | null;
  consent_at: string;
  privacy_version: string;
  created_at: string;
  files: {
    id: string;
    name: string;
    mime_type: string;
    size_bytes: number;
    width: number | null;
    height: number | null;
    status: string;
    url: string;
  }[];
  notes: {
    id: string;
    body: string;
    pinned: boolean;
    created_at: string;
    author: { id: string; name: string };
  }[];
  history: {
    id: string;
    old_status: RegistrationStatus | null;
    new_status: RegistrationStatus;
    reason: string | null;
    created_at: string;
    author: { id: string; name: string } | null;
  }[];
  assignees: Person[];
  profile: { id: string; slug: string; status: string } | null;
};

type Props = {
  registrationId: string;
  csrfToken: string;
  onClose: () => void;
  onChanged: () => void;
};

function statusLabel(value: RegistrationStatus | null): string {
  if (!value) return "Início";
  return STATUS_OPTIONS.find(([status]) => status === value)?.[1] ?? value;
}

function notificationLabel(status: string): string {
  if (status === "sent") return " E-mail enviado automaticamente.";
  if (status === "logged") return " E-mail registrado em modo de teste.";
  if (status === "failed") return " O status foi salvo, mas o e-mail falhou.";
  return " Esta inscrição antiga não possui e-mail cadastrado.";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminRegistrationDetail({
  registrationId,
  csrfToken,
  onClose,
  onChanged,
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [priority, setPriority] = useState("normal");
  const [assignedToId, setAssignedToId] = useState("");
  const [nextStatus, setNextStatus] = useState<RegistrationStatus>("received");
  const [statusReason, setStatusReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/v1/admin/registrations/${registrationId}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<Detail>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível abrir a inscrição."));
          return;
        }
        setDetail(payload.data);
        setPriority(payload.data.priority);
        setAssignedToId(payload.data.assigned_to?.id ?? "");
        setNextStatus(payload.data.status);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Não foi possível abrir a inscrição.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [refreshKey, registrationId, router]);

  async function mutate<T>(path: string, method: "POST" | "PATCH", body?: object) {
    const response = await fetch(path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await readApiEnvelope<T>(response);
    if (response.status === 401) router.replace("/painel/login");
    return { response, payload };
  }

  async function saveTriage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAction("triage");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate(
        `/api/v1/admin/registrations/${registrationId}/triage`,
        "PATCH",
        { priority, assigned_to_id: assignedToId || null },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível salvar a triagem."));
        return;
      }
      setSuccess("Prioridade e responsável atualizados.");
      setRefreshKey((current) => current + 1);
      onChanged();
    } catch {
      setError("API indisponível. A triagem não foi salva.");
    } finally {
      setAction("");
    }
  }

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || nextStatus === detail.status) {
      setError("Escolha um status diferente do atual.");
      return;
    }
    if (statusReason.trim().length < 3) {
      setError("Informe um motivo com pelo menos 3 caracteres.");
      return;
    }
    if (
      ["approved", "rejected"].includes(nextStatus) &&
      !window.confirm(`Confirma a decisão: ${statusLabel(nextStatus)}?`)
    ) {
      return;
    }

    setAction("status");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate<{
        id: string;
        status: RegistrationStatus;
        notification_status: string;
      }>(
        `/api/v1/admin/registrations/${registrationId}/status`,
        "PATCH",
        { status: nextStatus, reason: statusReason.trim() },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível alterar o status."));
        return;
      }
      setStatusReason("");
      setSuccess(`Status alterado para ${statusLabel(payload.data.status)}.${notificationLabel(payload.data.notification_status)}`);
      setRefreshKey((current) => current + 1);
      onChanged();
    } catch {
      setError("API indisponível. O status não foi alterado.");
    } finally {
      setAction("");
    }
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (noteBody.trim().length < 3) {
      setError("A nota precisa ter pelo menos 3 caracteres.");
      return;
    }
    setAction("note");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate(
        `/api/v1/admin/registrations/${registrationId}/notes`,
        "POST",
        { body: noteBody.trim(), pinned: notePinned },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível adicionar a nota."));
        return;
      }
      setNoteBody("");
      setNotePinned(false);
      setSuccess("Nota interna adicionada.");
      setRefreshKey((current) => current + 1);
    } catch {
      setError("API indisponível. A nota não foi adicionada.");
    } finally {
      setAction("");
    }
  }

  async function createProfile() {
    if (!window.confirm("Criar um perfil em rascunho com os dados desta inscrição?")) return;
    setAction("profile");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate<{ id: string; slug: string; status: string }>(
        `/api/v1/admin/registrations/${registrationId}/profile`,
        "POST",
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível criar o perfil."));
        return;
      }
      setSuccess(`Perfil “${payload.data.slug}” criado como rascunho.`);
      setRefreshKey((current) => current + 1);
    } catch {
      setError("API indisponível. O perfil não foi criado.");
    } finally {
      setAction("");
    }
  }

  return (
    <aside aria-labelledby="detail-title" className={styles.panel}>
      <div className={styles.topbar}>
        <div>
          <p className="eyebrow">Ficha da inscrição</p>
          <h2 id="detail-title">{detail?.professional_name || detail?.full_name || "Carregando…"}</h2>
        </div>
        <button className="button secondary" onClick={onClose} type="button">
          FECHAR FICHA
        </button>
      </div>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {success ? <div className="success" role="status">{success}</div> : null}
      {loading ? <p role="status">Carregando ficha completa…</p> : null}

      {detail ? (
        <div className={styles.content}>
          <section className={styles.summary} aria-label="Resumo da inscrição">
            <div>
              <span>Protocolo</span>
              <strong>{detail.protocol}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{statusLabel(detail.status)}</strong>
            </div>
            <div>
              <span>Categoria</span>
              <strong>{detail.category?.name ?? "Não informada"}</strong>
            </div>
            <div>
              <span>Edição</span>
              <strong>{detail.edition?.name ?? "Sem edição"}</strong>
            </div>
          </section>

          <section className={styles.block}>
            <h3>Contato e apresentação</h3>
            <dl className={styles.definitionList}>
              <div><dt>Nome civil</dt><dd>{detail.full_name}</dd></div>
              <div><dt>E-mail</dt><dd>{detail.email ? <a href={`mailto:${detail.email}`}>{detail.email}</a> : "Não informado"}</dd></div>
              <div><dt>Cidade</dt><dd>{detail.city}</dd></div>
              <div><dt>WhatsApp</dt><dd><a href={`tel:${detail.phone}`}>{detail.phone}</a></dd></div>
              <div><dt>Instagram</dt><dd>{detail.instagram ? <a href={`https://instagram.com/${detail.instagram}`} rel="noreferrer" target="_blank">@{detail.instagram}</a> : "Não informado"}</dd></div>
            </dl>
            <p className={styles.presentation}>{detail.presentation}</p>
            {detail.portfolio_url ? (
              <p><a className="button secondary" href={detail.portfolio_url} rel="noreferrer" target="_blank">ABRIR PORTFÓLIO EXTERNO</a></p>
            ) : null}
          </section>

          <section className={styles.block}>
            <h3>Arquivos enviados</h3>
            {detail.files.length ? (
              <div className={styles.files}>
                {detail.files.map((file) => (
                  <a href={file.url} key={file.id} rel="noreferrer" target="_blank">
                    <strong>{file.name}</strong>
                    <span>{file.mime_type} · {fileSize(file.size_bytes)}</span>
                  </a>
                ))}
              </div>
            ) : <p className="muted">Nenhum arquivo foi enviado.</p>}
          </section>

          <section className={styles.formsGrid}>
            <form className={styles.block} onSubmit={saveTriage}>
              <h3>Triagem</h3>
              <div className="field">
                <label htmlFor="detail-priority">Prioridade</label>
                <select id="detail-priority" onChange={(event) => setPriority(event.target.value)} value={priority}>
                  {PRIORITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="detail-assignee">Responsável</label>
                <select id="detail-assignee" onChange={(event) => setAssignedToId(event.target.value)} value={assignedToId}>
                  <option value="">Sem responsável</option>
                  {detail.assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </div>
              <button className="button" disabled={action === "triage"} type="submit">{action === "triage" ? "SALVANDO…" : "SALVAR TRIAGEM"}</button>
            </form>

            <form className={styles.block} onSubmit={saveStatus}>
              <h3>Decisão</h3>
              <div className="field">
                <label htmlFor="detail-status">Novo status</label>
                <select id="detail-status" onChange={(event) => setNextStatus(event.target.value as RegistrationStatus)} value={nextStatus}>
                  {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="detail-status-reason">Motivo da decisão</label>
                <textarea id="detail-status-reason" maxLength={500} onChange={(event) => setStatusReason(event.target.value)} required value={statusReason} />
              </div>
              <button className="button" disabled={action === "status"} type="submit">{action === "status" ? "SALVANDO…" : "REGISTRAR DECISÃO"}</button>
            </form>
          </section>

          <section className={styles.block}>
            <h3>Notas internas</h3>
            <form className={styles.noteForm} onSubmit={addNote}>
              <div className="field">
                <label htmlFor="detail-note">Nova nota</label>
                <textarea id="detail-note" maxLength={2000} onChange={(event) => setNoteBody(event.target.value)} value={noteBody} />
              </div>
              <label className={styles.checkbox}>
                <input checked={notePinned} onChange={(event) => setNotePinned(event.target.checked)} type="checkbox" />
                Fixar esta nota
              </label>
              <button className="button" disabled={action === "note"} type="submit">{action === "note" ? "ADICIONANDO…" : "ADICIONAR NOTA"}</button>
            </form>
            <div className={styles.timeline}>
              {detail.notes.map((note) => (
                <article key={note.id}>
                  <strong>{note.pinned ? "📌 " : ""}{note.author.name}</strong>
                  <p>{note.body}</p>
                  <small>{formatDate(note.created_at)}</small>
                </article>
              ))}
              {!detail.notes.length ? <p className="muted">Nenhuma nota interna.</p> : null}
            </div>
          </section>

          <section className={styles.block}>
            <h3>Histórico</h3>
            <div className={styles.timeline}>
              {detail.history.map((item) => (
                <article key={item.id}>
                  <strong>{statusLabel(item.old_status)} → {statusLabel(item.new_status)}</strong>
                  <p>{item.reason || "Sem motivo registrado."}</p>
                  <small>{item.author?.name ?? "Sistema"} · {formatDate(item.created_at)}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.profileBlock}>
            <div>
              <h3>Perfil de artista</h3>
              {detail.profile ? <p>Perfil <strong>{detail.profile.slug}</strong> · {detail.profile.status}</p> : <p className="muted">Crie um rascunho usando os dados e arquivos da inscrição aprovada.</p>}
            </div>
            {!detail.profile && detail.status === "approved" ? (
              <button className="button" disabled={action === "profile"} onClick={() => void createProfile()} type="button">{action === "profile" ? "CRIANDO…" : "CRIAR PERFIL EM RASCUNHO"}</button>
            ) : null}
          </section>
        </div>
      ) : null}
    </aside>
  );
}

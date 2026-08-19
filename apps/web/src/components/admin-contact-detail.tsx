"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

import styles from "./admin-contact-detail.module.css";

type ContactStatus = "received" | "in_progress" | "resolved" | "archived";

const STATUS_OPTIONS: [ContactStatus, string][] = [
  ["received", "Recebido"],
  ["in_progress", "Em atendimento"],
  ["resolved", "Resolvido"],
  ["archived", "Arquivado"],
];

function contactStatusLabel(status: ContactStatus | null): string {
  if (!status) return "Início";
  return STATUS_OPTIONS.find(([value]) => value === status)?.[1] ?? status;
}

type Person = { id: string; name: string; email: string };

type ContactDetail = {
  id: string;
  protocol: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  assigned_to: Person | null;
  consent_at: string;
  privacy_version: string;
  created_at: string;
  updated_at: string;
  assignees: Person[];
  notes: {
    id: string;
    body: string;
    created_at: string;
    author: { id: string; name: string };
  }[];
  history: {
    id: string;
    old_status: ContactStatus | null;
    new_status: ContactStatus;
    reason: string | null;
    created_at: string;
    author: { id: string; name: string } | null;
  }[];
  replies: {
    id: string;
    subject: string;
    body: string;
    delivery_status: string;
    created_at: string;
    author: { id: string; name: string };
  }[];
};

type Props = {
  contactId: string;
  csrfToken: string;
  onClose: () => void;
  onChanged: () => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function deliveryLabel(status: string): string {
  if (status === "sent") return "Enviado";
  if (status === "logged") return "Registrado em teste";
  if (status === "failed") return "Falhou";
  return status;
}

function newReplyKey(): string {
  if (globalThis.crypto?.randomUUID) return `contact-reply-${globalThis.crypto.randomUUID()}`;
  return `contact-reply-${Date.now()}`;
}

export function AdminContactDetail({ contactId, csrfToken, onClose, onChanged }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [status, setStatus] = useState<ContactStatus>("received");
  const [assignedToId, setAssignedToId] = useState("");
  const [reason, setReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyKey, setReplyKey] = useState(newReplyKey);
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
        const response = await fetch(`/api/v1/admin/contacts/${contactId}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<ContactDetail>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível abrir o contato."));
          return;
        }
        const data = payload.data;
        setDetail(data);
        setStatus(data.status);
        setAssignedToId(data.assigned_to?.id ?? "");
        setReplySubject((current) => current || `Re: ${data.subject} — ${data.protocol}`);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Não foi possível abrir o atendimento.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [contactId, refreshKey, router]);

  async function mutate<T>(path: string, body: object) {
    const response = await fetch(path, {
      method: path.endsWith("/triage") ? "PATCH" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(body),
    });
    const payload = await readApiEnvelope<T>(response);
    if (response.status === 401) router.replace("/painel/login");
    return { response, payload };
  }

  async function saveTriage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    if (status !== detail.status && reason.trim().length < 3) {
      setError("Informe um motivo com pelo menos 3 caracteres para alterar o status.");
      return;
    }
    setAction("triage");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate<{ id: string; status: ContactStatus }>(
        `/api/v1/admin/contacts/${contactId}/triage`,
        { status, assigned_to_id: assignedToId || null, reason: reason.trim() },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível atualizar o atendimento."));
        return;
      }
      setReason("");
      setSuccess("Status e responsável atualizados.");
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. O atendimento não foi atualizado.");
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
      const { response, payload } = await mutate<{ id: string }>(
        `/api/v1/admin/contacts/${contactId}/notes`,
        { body: noteBody.trim() },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível adicionar a nota."));
        return;
      }
      setNoteBody("");
      setSuccess("Nota interna adicionada.");
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A nota não foi salva.");
    } finally {
      setAction("");
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (replySubject.trim().length < 3 || replyMessage.trim().length < 3) {
      setError("Preencha o assunto e a resposta com pelo menos 3 caracteres.");
      return;
    }
    setAction("reply");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await mutate<{
        id: string;
        delivery_status: string;
        contact_status: ContactStatus;
      }>(`/api/v1/admin/contacts/${contactId}/reply`, {
        subject: replySubject.trim(),
        message: replyMessage.trim(),
        idempotency_key: replyKey,
      });
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível enviar a resposta."));
        return;
      }
      setReplyMessage("");
      setReplyKey(newReplyKey());
      if (payload.data.delivery_status === "failed") {
        setError("A resposta foi registrada, mas o provedor de e-mail recusou o envio.");
      } else {
        setSuccess(`Resposta registrada: ${deliveryLabel(payload.data.delivery_status)}.`);
      }
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A resposta não foi enviada.");
    } finally {
      setAction("");
    }
  }

  return (
    <section aria-labelledby="contact-detail-title" className={styles.panel}>
      <div className={styles.topbar}>
        <div>
          <p className="eyebrow">{detail?.protocol ?? "Atendimento"}</p>
          <h2 id="contact-detail-title">{detail?.name ?? "Carregando contato…"}</h2>
        </div>
        <button className="button secondary" onClick={onClose} type="button">FECHAR</button>
      </div>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
      {loading ? <p aria-live="polite">Carregando atendimento…</p> : null}

      {detail ? (
        <div className={styles.content}>
          <dl className={styles.summary}>
            <div><dt>Status</dt><dd>{contactStatusLabel(detail.status)}</dd></div>
            <div><dt>Responsável</dt><dd>{detail.assigned_to?.name ?? "Não atribuído"}</dd></div>
            <div><dt>Recebido</dt><dd>{formatDate(detail.created_at)}</dd></div>
            <div><dt>Privacidade</dt><dd>{detail.privacy_version}</dd></div>
          </dl>

          <article className={styles.block}>
            <h3>{detail.subject}</h3>
            <div className={styles.contactLinks}>
              <a href={`mailto:${detail.email}`}>{detail.email}</a>
              {detail.phone ? <a href={`tel:${detail.phone}`}>{detail.phone}</a> : null}
            </div>
            <p className={styles.message}>{detail.message}</p>
          </article>

          <div className={styles.formsGrid}>
            <form className={styles.block} onSubmit={saveTriage}>
              <h3>Organizar atendimento</h3>
              <div className="field">
                <label htmlFor="contact-detail-status">Status do atendimento</label>
                <select
                  id="contact-detail-status"
                  onChange={(event) => setStatus(event.target.value as ContactStatus)}
                  value={status}
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="contact-assignee">Responsável</label>
                <select
                  id="contact-assignee"
                  onChange={(event) => setAssignedToId(event.target.value)}
                  value={assignedToId}
                >
                  <option value="">Não atribuído</option>
                  {detail.assignees.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="contact-status-reason">Motivo da alteração</label>
                <input
                  id="contact-status-reason"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Obrigatório ao alterar o status"
                  value={reason}
                />
              </div>
              <button className="button" disabled={action === "triage"} type="submit">
                {action === "triage" ? "SALVANDO…" : "SALVAR ATENDIMENTO"}
              </button>
            </form>

            <form className={styles.block} onSubmit={addNote}>
              <h3>Nota interna</h3>
              <div className="field">
                <label htmlFor="contact-note">Nota</label>
                <textarea
                  id="contact-note"
                  maxLength={2000}
                  onChange={(event) => setNoteBody(event.target.value)}
                  rows={6}
                  value={noteBody}
                />
              </div>
              <button className="button secondary" disabled={action === "note"} type="submit">
                {action === "note" ? "SALVANDO…" : "ADICIONAR NOTA"}
              </button>
            </form>
          </div>

          <form className={styles.replyForm} onSubmit={sendReply}>
            <div>
              <p className="eyebrow">E-mail</p>
              <h3>Responder a {detail.name}</h3>
              <p className="muted">No sandbox, a resposta é redirecionada para o Gmail de testes.</p>
            </div>
            <div className="field">
              <label htmlFor="contact-reply-subject">Assunto da resposta</label>
              <input
                id="contact-reply-subject"
                maxLength={180}
                onChange={(event) => setReplySubject(event.target.value)}
                value={replySubject}
              />
            </div>
            <div className="field">
              <label htmlFor="contact-reply-message">Resposta por e-mail</label>
              <textarea
                id="contact-reply-message"
                maxLength={5000}
                onChange={(event) => setReplyMessage(event.target.value)}
                rows={8}
                value={replyMessage}
              />
            </div>
            <button className="button" disabled={action === "reply"} type="submit">
              {action === "reply" ? "ENVIANDO…" : "ENVIAR RESPOSTA"}
            </button>
          </form>

          <div className={styles.historyGrid}>
            <section className={styles.block} aria-labelledby="contact-notes-title">
              <h3 id="contact-notes-title">Notas internas</h3>
              {detail.notes.length === 0 ? <p className="muted">Nenhuma nota adicionada.</p> : null}
              <div className={styles.timeline}>
                {detail.notes.map((note) => (
                  <article key={note.id}>
                    <p>{note.body}</p>
                    <small>{note.author.name} · {formatDate(note.created_at)}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.block} aria-labelledby="contact-history-title">
              <h3 id="contact-history-title">Histórico de status</h3>
              {detail.history.length === 0 ? <p className="muted">Nenhuma alteração de status.</p> : null}
              <div className={styles.timeline}>
                {detail.history.map((item) => (
                  <article key={item.id}>
                    <strong>{contactStatusLabel(item.old_status)} → {contactStatusLabel(item.new_status)}</strong>
                    {item.reason ? <p>{item.reason}</p> : null}
                    <small>{item.author?.name ?? "Sistema"} · {formatDate(item.created_at)}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.block} aria-labelledby="contact-replies-title">
            <h3 id="contact-replies-title">Respostas enviadas</h3>
            {detail.replies.length === 0 ? <p className="muted">Nenhuma resposta enviada.</p> : null}
            <div className={styles.timeline}>
              {detail.replies.map((reply) => (
                <article key={reply.id}>
                  <strong>{reply.subject}</strong>
                  <p className={styles.message}>{reply.body}</p>
                  <small>
                    {reply.author.name} · {formatDate(reply.created_at)} · {deliveryLabel(reply.delivery_status)}
                  </small>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

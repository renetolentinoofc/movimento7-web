"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-communications.module.css";

type EmailConfiguration = {
  mode: "log" | "sandbox" | "live";
  configured: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string;
  smtp_password_set: boolean;
  from_address: string;
  reply_to: string | null;
  sandbox_recipient: string;
};

type CommunicationLog = {
  id: string;
  channel: string;
  template_key: string | null;
  status: "sent" | "logged" | "failed";
  created_at: string;
};

type CommunicationsData = {
  configuration: EmailConfiguration;
  recent: CommunicationLog[];
};

const MODE_LABELS = { log: "Somente registro", sandbox: "Sandbox", live: "Produção" };
const STATUS_LABELS = { sent: "Enviado", logged: "Registrado", failed: "Falhou" };
const TEMPLATE_LABELS: Record<string, string> = {
  configuration_test: "Teste de configuração",
  registration_received: "Confirmação de inscrição",
  registration_status_received: "Inscrição recebida",
  registration_status_reviewing: "Inscrição em análise",
  registration_status_approved: "Inscrição aprovada",
  registration_status_waitlisted: "Lista de espera",
  registration_status_rejected: "Inscrição não selecionada",
  registration_status_withdrawn: "Inscrição retirada",
  admin_password_reset: "Recuperação de senha",
  contact_message_received: "Novo contato do site",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function AdminCommunications() {
  const router = useRouter();
  const [data, setData] = useState<CommunicationsData | null>(null);
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const [sessionResponse, communicationsResponse] = await Promise.all([
        fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/communications", { credentials: "include", cache: "no-store" }),
      ]);
      if (sessionResponse.status === 401 || communicationsResponse.status === 401) {
        router.replace("/painel/login");
        return;
      }
      const sessionPayload = await readApiEnvelope<AdminSessionData>(sessionResponse);
      const communicationsPayload = await readApiEnvelope<CommunicationsData>(
        communicationsResponse,
      );
      if (!sessionResponse.ok || !sessionPayload?.data?.csrf_token) {
        setError(apiErrorMessage(sessionPayload, "Não foi possível validar sua sessão."));
        return;
      }
      if (!communicationsResponse.ok || !communicationsPayload?.data) {
        setError(
          apiErrorMessage(communicationsPayload, "Não foi possível carregar a comunicação."),
        );
        return;
      }
      setSession(sessionPayload.data);
      setData(communicationsPayload.data);
    } catch {
      setError("Não foi possível conectar à API.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function sendTest() {
    if (!session || !data?.configuration.configured) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/communications/test", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf_token,
        },
        body: JSON.stringify({
          recipient: session.user.email,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const payload = await readApiEnvelope<CommunicationLog & { delivered_to?: string }>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível enviar o e-mail de teste."));
        return;
      }
      const action = payload.data.status === "logged" ? "registrado" : "enviado";
      setNotice(`Teste ${action} com sucesso${payload.data.delivered_to ? ` para ${payload.data.delivered_to}` : ""}.`);
      await load();
    } catch {
      setError("A API ficou indisponível durante o teste.");
    } finally {
      setSending(false);
    }
  }

  const config = data?.configuration;
  return (
    <section aria-labelledby="communications-title" className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Painel</p>
          <h1 id="communications-title">Comunicação</h1>
          <p className="lead">Valide o Gmail com envio controlado e acompanhe o histórico sem expor destinatários.</p>
        </div>
        <button className="button secondary" disabled={loading} onClick={() => void load()} type="button">
          {loading ? "ATUALIZANDO…" : "ATUALIZAR"}
        </button>
      </div>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {notice ? <div className="success" role="status">{notice}</div> : null}

      {config ? (
        <div className={styles.columns}>
          <article className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Configuração de e-mail</h2>
              <span className={styles.badge} data-ready={config.configured}>
                {config.configured ? "Pronta" : "Incompleta"}
              </span>
            </div>
            <dl className={styles.details}>
              <div><dt>Modo</dt><dd>{MODE_LABELS[config.mode]}</dd></div>
              <div><dt>Servidor</dt><dd>{config.smtp_host ? `${config.smtp_host}:${config.smtp_port}` : "Não utilizado"}</dd></div>
              <div><dt>Usuário SMTP</dt><dd>{config.smtp_username}</dd></div>
              <div><dt>Senha de aplicativo</dt><dd>{config.smtp_password_set ? "Configurada" : "Pendente"}</dd></div>
              <div><dt>Remetente</dt><dd>{config.from_address}</dd></div>
              <div><dt>Destino sandbox</dt><dd>{config.sandbox_recipient}</dd></div>
            </dl>
            <p className="muted">
              {config.mode === "sandbox"
                ? "Neste modo, nenhum endereço de artista recebe mensagens: tudo é redirecionado para o Gmail temporário."
                : config.mode === "log"
                  ? "O teste será apenas registrado; nenhuma conexão SMTP será aberta."
                  : "Modo de produção: o teste será enviado ao e-mail da sua conta administrativa."}
            </p>
            <button className="button" disabled={!config.configured || sending} onClick={() => void sendTest()} type="button">
              {sending ? "ENVIANDO…" : "ENVIAR E-MAIL DE TESTE"}
            </button>
            {!config.configured ? <p className={styles.pending}>Adicione a senha de aplicativo no arquivo de ambiente e reinicie a API.</p> : null}
          </article>

          <article className={styles.card}>
            <h2>Histórico recente</h2>
            {data.recent.length ? (
              <ul className={styles.history}>
                {data.recent.map((item) => (
                  <li key={item.id}>
                    <div><strong>{TEMPLATE_LABELS[item.template_key ?? ""] ?? "Mensagem de e-mail"}</strong><span>{formatDate(item.created_at)}</span></div>
                    <span className={styles.status} data-status={item.status}>{STATUS_LABELS[item.status]}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">Nenhum teste realizado ainda.</p>}
          </article>
        </div>
      ) : loading ? <p role="status">Carregando configuração…</p> : null}
    </section>
  );
}

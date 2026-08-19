"use client";

import { useCallback, useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

import styles from "./admin-system.module.css";

type SystemData = {
  app_version: string;
  git_commit: string;
  deployed_at: string;
  environment: string;
  python: string;
  database: string;
  drive: string;
  payment_provider: string;
  auction_bidding_enabled: boolean;
};
type ReadyData = { status: string; database: string; media: string; checked_at: string };
type ReadinessData = { status: string; checks: { key: string; status: "pass" | "warn" | "block"; label: string }[] };

export function AdminSystem() {
  const [system, setSystem] = useState<SystemData | null>(null);
  const [ready, setReady] = useState<ReadyData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [systemResponse, readyResponse, readinessResponse] = await Promise.all([
        fetch("/api/v1/admin/system", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/health/ready", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/readiness", { credentials: "include", cache: "no-store" }),
      ]);
      const systemPayload = await readApiEnvelope<SystemData>(systemResponse);
      const readyPayload = await readApiEnvelope<ReadyData>(readyResponse);
      const readinessPayload = await readApiEnvelope<ReadinessData>(readinessResponse);
      if (!systemResponse.ok || !systemPayload?.data) throw new Error(apiErrorMessage(systemPayload, "Não foi possível carregar o sistema."));
      setSystem(systemPayload.data);
      setReady(readyResponse.ok ? readyPayload?.data ?? null : null);
      setReadiness(readinessPayload?.data ?? null);
      if (!readyResponse.ok && readyPayload?.error) setError(readyPayload.error.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conectar à API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className={styles.section} aria-labelledby="system-title">
      <div className={styles.heading}>
        <div><p className="eyebrow">Painel</p><h1 id="system-title">Sistema e prontidão</h1><p className="lead">Verifique o ambiente antes de publicar uma nova edição.</p></div>
        <button className="button secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? "ATUALIZANDO…" : "ATUALIZAR"}</button>
      </div>
      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {system ? <div className={styles.grid}>
        <article className={styles.card}><h2>Aplicação</h2><dl className={styles.details}><div><dt>Versão</dt><dd>{system.app_version}</dd></div><div><dt>Commit</dt><dd>{system.git_commit}</dd></div><div><dt>Ambiente</dt><dd>{system.environment}</dd></div><div><dt>Python</dt><dd>{system.python}</dd></div></dl></article>
        <article className={styles.card}><h2>Dependências</h2><dl className={styles.details}><div><dt>Banco</dt><dd data-good={system.database === "connected"}>{system.database}</dd></div><div><dt>Prontidão</dt><dd data-good={ready?.status === "ready"}>{ready?.status ?? "indisponível"}</dd></div><div><dt>Drive</dt><dd>{system.drive}</dd></div><div><dt>Pagamentos</dt><dd>{system.payment_provider}</dd></div></dl></article>
        <article className={styles.card}><h2>Recursos controlados</h2><p>{system.auction_bidding_enabled ? "Lances habilitados — somente em ambiente aprovado." : "Lances monetários desativados."}</p><p className="muted">Integrações externas e recursos de risco devem permanecer desligados até validação operacional, jurídica e comercial.</p></article>
        {readiness ? <article className={styles.card}><h2>Checklist de lançamento</h2><ul className={styles.checks}>{readiness.checks.map((check) => <li key={check.key}><span data-status={check.status}>{check.status === "pass" ? "OK" : check.status === "warn" ? "REVISAR" : "BLOQUEADO"}</span>{check.label}</li>)}</ul></article> : null}
      </div> : loading ? <p role="status">Carregando informações…</p> : null}
    </section>
  );
}

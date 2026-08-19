/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";
import styles from "./admin-simple-data.module.css";

type Entry = { id: string; action: string; resource_type: string; resource_id: string | null; summary: string; request_id: string; created_at: string };
export function AdminAudit() {
  const [items, setItems] = useState<Entry[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const response = await fetch("/api/v1/admin/audit-logs?limit=50", { credentials: "include", cache: "no-store" }); const payload = await readApiEnvelope<Entry[]>(response); if (!response.ok || !payload?.data) setError(apiErrorMessage(payload, "Não foi possível carregar a auditoria.")); else setItems(payload.data); setLoading(false); }
  useEffect(() => { void load(); }, []);
  return <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow">Painel</p><h1>Auditoria</h1><p className="lead">Eventos operacionais recentes, sem exibir dados pessoais desnecessários.</p></div><button className="button secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? "ATUALIZANDO…" : "ATUALIZAR"}</button></div>{error && <div className="error-summary" role="alert">{error}</div>}{loading ? <p role="status">Carregando eventos…</p> : items.length ? <ul className={styles.list}>{items.map((item) => <li className={`${styles.item} ${styles.log}`} key={item.id}><span className={styles.meta}>{new Date(item.created_at).toLocaleString("pt-BR")}</span><span className={styles.meta}>{item.action}</span><span>{item.summary}</span></li>)}</ul> : <div className="empty">Nenhum evento registrado.</div>}</section>;
}

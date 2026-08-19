"use client";

import { FormEvent, useState } from "react";
import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";
import styles from "./admin-simple-data.module.css";

export function AdminContent() {
  const [csrf, setCsrf] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState({ key: "", title: "", value: "{}" });
  async function getCsrf() { const response = await fetch("/api/v1/admin/auth/session", { credentials: "include" }); const payload = await readApiEnvelope<{ csrf_token: string }>(response); if (!response.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Sessão expirada.")); setCsrf(payload.data.csrf_token); return payload.data.csrf_token; }
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setNotice(""); let value: unknown; try { value = JSON.parse(form.value); } catch { setError("O valor precisa ser um JSON válido."); return; } try { const token = csrf || await getCsrf(); const response = await fetch(`/api/v1/admin/content/${encodeURIComponent(form.key)}/publish`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify({ title: form.title, value }) }); const payload = await readApiEnvelope<{ id: string; version: number }>(response); if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível publicar o conteúdo.")); setNotice(`Versão ${payload.data.version} publicada.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível publicar o conteúdo."); } }
  return <section className={styles.section}><div><p className="eyebrow">Painel</p><h1>Conteúdo</h1><p className="lead">Publique versões JSON de conteúdo editorial com chave e histórico auditável.</p></div>{error && <div className="error-summary" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}<form className={styles.panel} onSubmit={submit}><h2>Publicar versão</h2><label>Chave<input required value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="home.hero" /></label><label>Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Valor JSON<textarea required value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} spellCheck={false} /></label><button className="button">PUBLICAR VERSÃO</button></form></section>;
}

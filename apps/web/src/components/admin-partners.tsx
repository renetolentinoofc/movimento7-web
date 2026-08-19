/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";
import styles from "./admin-simple-data.module.css";

type Partner = { id: string; name: string; slug: string; active: boolean; category: string; level: string | null };
export function AdminPartners() {
  const [items, setItems] = useState<Partner[]>([]), [csrf, setCsrf] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", logo_path: "", logo_alt: "", category: "parceiro", level: "", website_url: "" });
  async function load() {
    const [sessionResponse, response] = await Promise.all([fetch("/api/v1/admin/auth/session", { credentials: "include" }), fetch("/api/v1/admin/partners", { credentials: "include", cache: "no-store" })]);
    const session = await readApiEnvelope<{ csrf_token: string }>(sessionResponse), payload = await readApiEnvelope<Partner[]>(response);
    if (!sessionResponse.ok || !session?.data) throw new Error(apiErrorMessage(session, "Sessão expirada."));
    if (!response.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar os parceiros."));
    setCsrf(session.data.csrf_token); setItems(payload.data);
  }
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar.")); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); const response = await fetch("/api/v1/admin/partners", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(form) }); const payload = await readApiEnvelope<{ id: string }>(response); if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível criar o parceiro.")); setForm({ name: "", slug: "", logo_path: "", logo_alt: "", category: "parceiro", level: "", website_url: "" }); setNotice("Parceiro criado."); await load(); }
  return <section className={styles.section}><div className={styles.heading}><div><p className="eyebrow">Painel</p><h1>Parceiros</h1><p className="lead">Cadastre marcas e apoiadores sem publicar dados incompletos.</p></div><button className="button secondary" type="button" onClick={() => void load()}>ATUALIZAR</button></div>{error && <div className="error-summary" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}<div className={styles.grid}><form className={styles.panel} onSubmit={submit}><h2>Novo parceiro</h2><label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Slug<input required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label><label>Logo (caminho ou URL)<input required value={form.logo_path} onChange={(event) => setForm({ ...form, logo_path: event.target.value })} /></label><label>Texto alternativo<input value={form.logo_alt} onChange={(event) => setForm({ ...form, logo_alt: event.target.value })} /></label><label>Categoria<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label><label>Nível<input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} /></label><button className="button" disabled={!csrf}>CRIAR PARCEIRO</button></form><div className={styles.panel}><h2>Cadastrados</h2>{items.length ? <ul className={styles.list}>{items.map((item) => <li className={styles.item} key={item.id}><strong>{item.name}</strong><span className={styles.meta}>/{item.slug} · {item.category} · {item.active ? "Ativo" : "Inativo"}</span></li>)}</ul> : <p className="muted">Nenhum parceiro cadastrado.</p>}</div></div></section>;
}

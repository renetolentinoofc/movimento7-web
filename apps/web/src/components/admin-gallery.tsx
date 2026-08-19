"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

type Album = { id: string; title: string; slug: string; description: string | null; status: string };

export function AdminGallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [csrf, setCsrf] = useState("");
  const [form, setForm] = useState({ title: "", slug: "", description: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const session = await fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store" });
    const sessionPayload = await readApiEnvelope<{ csrf_token: string }>(session);
    if (!session.ok || !sessionPayload?.data) throw new Error(apiErrorMessage(sessionPayload, "Sessão expirada."));
    setCsrf(sessionPayload.data.csrf_token);
    const response = await fetch("/api/v1/admin/gallery/albums", { credentials: "include", cache: "no-store" });
    const payload = await readApiEnvelope<Album[]>(response);
    if (!response.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar os álbuns."));
    setAlbums(payload.data);
  }

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar.")); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch("/api/v1/admin/gallery/albums", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(form) });
    const payload = await readApiEnvelope<Album>(response);
    if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível criar o álbum.")); return; }
    setAlbums((current) => [payload.data!, ...current]); setForm({ title: "", slug: "", description: "" }); setMessage("Álbum criado como rascunho.");
  }

  return <section className="section"><p className="eyebrow">Painel</p><h1>Galeria</h1><p className="lead">Cadastre os álbuns antes de enviar as imagens.</p>{error && <div className="error-summary">{error}</div>}{message && <p role="status">{message}</p>}<form className="form-card" onSubmit={submit}><label>Título<input required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Slug (opcional)<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="gerado automaticamente" /></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button className="button" type="submit">CRIAR ÁLBUM</button></form><div className="grid cards">{albums.map((album) => <article className="card" key={album.id}><h2>{album.title}</h2><p className="muted">/{album.slug}</p><p>{album.description || "Sem descrição"}</p><small>{album.status === "draft" ? "Rascunho" : album.status}</small></article>)}</div></section>;
}

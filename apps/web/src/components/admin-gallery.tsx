/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";
import styles from "./admin-gallery.module.css";

type Album = { id: string; title: string; slug: string; description: string | null; status: string };
type Media = { id: string; title: string; category: string; alt_text: string; width: number | null; height: number | null; status: string };
const statusLabel = (status: string) => ({ draft: "Rascunho", published: "Publicado", archived: "Arquivado" }[status] ?? status);

export function AdminGallery() {
  const [albums, setAlbums] = useState<Album[]>([]), [media, setMedia] = useState<Media[]>([]);
  const [albumId, setAlbumId] = useState(""), [csrf, setCsrf] = useState("");
  const [album, setAlbum] = useState({ title: "", slug: "", description: "" });
  const [upload, setUpload] = useState({ file: null as File | null, title: "", category: "", alt_text: "", caption: "", credit: "" });
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [saving, setSaving] = useState(false);

  async function loadMedia(id: string) {
    if (!id) return setMedia([]);
    const response = await fetch(`/api/v1/admin/gallery/albums/${id}/media`, { credentials: "include", cache: "no-store" });
    const payload = await readApiEnvelope<Media[]>(response);
    if (!response.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar as mídias."));
    setMedia(payload.data);
  }

  async function load() {
    const [sessionResponse, albumsResponse] = await Promise.all([
      fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store" }),
      fetch("/api/v1/admin/gallery/albums", { credentials: "include", cache: "no-store" }),
    ]);
    const session = await readApiEnvelope<{ csrf_token: string }>(sessionResponse), payload = await readApiEnvelope<Album[]>(albumsResponse);
    if (!sessionResponse.ok || !session?.data) throw new Error(apiErrorMessage(session, "Sessão expirada."));
    if (!albumsResponse.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar os álbuns."));
    setCsrf(session.data.csrf_token); setAlbums(payload.data); setAlbumId((current) => current || payload.data![0]?.id || "");
  }

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar.")); }, []);
  useEffect(() => { void loadMedia(albumId).catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar mídias.")); }, [albumId]);

  async function createAlbum(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/admin/gallery/albums", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(album) });
    const payload = await readApiEnvelope<Album>(response);
    if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível criar o álbum."));
    setAlbums((current) => [payload.data!, ...current]); setAlbumId(payload.data.id); setAlbum({ title: "", slug: "", description: "" }); setMessage("Álbum criado como rascunho.");
  }

  async function uploadMedia(event: FormEvent) {
    event.preventDefault(); if (!albumId || !upload.file) return; setSaving(true); setError("");
    const body = new FormData(); Object.entries(upload).forEach(([key, value]) => { if (value) body.append(key, value); });
    const response = await fetch(`/api/v1/admin/gallery/albums/${albumId}/media/upload`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrf }, body });
    const payload = await readApiEnvelope<Media>(response); setSaving(false);
    if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível enviar a mídia."));
    setMedia((current) => [...current, payload.data!]); setUpload({ file: null, title: "", category: "", alt_text: "", caption: "", credit: "" }); setMessage("Mídia enviada como rascunho.");
  }

  async function changeStatus(kind: "album" | "media", id: string, next: string) {
    const path = kind === "album" ? `/api/v1/admin/gallery/albums/${id}/status` : `/api/v1/admin/gallery/media/${id}/status`;
    const response = await fetch(path, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ status: next }) });
    const payload = await readApiEnvelope<Album | Media>(response);
    if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível alterar o status."));
    if (kind === "album") setAlbums((current) => current.map((item) => item.id === id ? payload.data as Album : item));
    else setMedia((current) => current.map((item) => item.id === id ? payload.data as Media : item));
    setMessage("Status atualizado.");
  }

  async function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const reordered = [...media];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const response = await fetch("/api/v1/admin/gallery/order", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ album_id: albumId, ids: reordered.map((item) => item.id) }) });
    const payload = await readApiEnvelope<{ saved: boolean }>(response);
    if (!response.ok || !payload?.data) return setError(apiErrorMessage(payload, "Não foi possível salvar a ordem."));
    setMedia(reordered); setMessage("Ordem das mídias atualizada.");
  }

  const currentAlbum = albums.find((item) => item.id === albumId);
  return <section className={`section ${styles.workspace}`}>
    <p className="eyebrow">Painel</p><h1>Galeria</h1><p className="lead">Crie álbuns, envie mídias e publique apenas o conteúdo revisado.</p>
    {error && <div className="error-summary" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
    <div className={styles.topGrid}>
      <form className={styles.panel} onSubmit={createAlbum}><h2>Novo álbum</h2><label>Título<input required minLength={2} value={album.title} onChange={(event) => setAlbum({ ...album, title: event.target.value })} /></label><label>Slug<input value={album.slug} onChange={(event) => setAlbum({ ...album, slug: event.target.value })} placeholder="gerado automaticamente" /></label><label>Descrição<textarea value={album.description} onChange={(event) => setAlbum({ ...album, description: event.target.value })} /></label><button className="button" disabled={!csrf}>CRIAR ÁLBUM</button></form>
      <div className={styles.panel}><h2>Álbum ativo</h2><label>Selecione o álbum<select value={albumId} onChange={(event) => setAlbumId(event.target.value)}><option value="">Selecione</option>{albums.map((item) => <option key={item.id} value={item.id}>{item.title} — {statusLabel(item.status)}</option>)}</select></label>{currentAlbum ? <><p className="muted">/{currentAlbum.slug}</p><button className="button secondary" type="button" disabled={!media.some((item) => item.status === "published")} onClick={() => void changeStatus("album", currentAlbum.id, currentAlbum.status === "published" ? "draft" : "published")}>{currentAlbum.status === "published" ? "RETORNAR A RASCUNHO" : "PUBLICAR ÁLBUM"}</button></> : <p className="muted">Crie ou selecione um álbum para começar.</p>}</div>
    </div>
    {albumId && <>
      <form className={styles.panel} onSubmit={uploadMedia}><h2>Nova mídia</h2><div className={styles.uploadGrid}><label className={styles.wide}>Arquivo<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setUpload({ ...upload, file: event.target.files?.[0] ?? null })} /></label><label>Título<input required value={upload.title} onChange={(event) => setUpload({ ...upload, title: event.target.value })} /></label><label>Categoria<input required value={upload.category} onChange={(event) => setUpload({ ...upload, category: event.target.value })} /></label><label>Texto alternativo<input required value={upload.alt_text} onChange={(event) => setUpload({ ...upload, alt_text: event.target.value })} /></label><label>Crédito<input value={upload.credit} onChange={(event) => setUpload({ ...upload, credit: event.target.value })} /></label><label className={styles.wide}>Legenda<textarea value={upload.caption} onChange={(event) => setUpload({ ...upload, caption: event.target.value })} /></label></div><button className="button" disabled={saving || !csrf}>{saving ? "ENVIANDO…" : "ENVIAR MÍDIA"}</button></form>
      <div className={styles.sectionTitle}><h2>Mídias do álbum</h2><span className="muted">{media.length} {media.length === 1 ? "item" : "itens"}</span></div><div className={styles.mediaGrid}>{media.map((item, index) => <article className="card" key={item.id}><h2>{item.title}</h2><p className="muted">{item.category} · {item.width ?? "?"}×{item.height ?? "?"}</p><p>{item.alt_text}</p><small>{statusLabel(item.status)}</small><p><button className="button secondary" type="button" disabled={index === 0} onClick={() => void moveMedia(index, -1)} aria-label={`Mover ${item.title} para cima`}>↑</button>{" "}<button className="button secondary" type="button" disabled={index === media.length - 1} onClick={() => void moveMedia(index, 1)} aria-label={`Mover ${item.title} para baixo`}>↓</button></p><p><button className="button secondary" type="button" onClick={() => void changeStatus("media", item.id, item.status === "published" ? "draft" : "published")}>{item.status === "published" ? "RETORNAR A RASCUNHO" : "PUBLICAR MÍDIA"}</button></p></article>)}{!media.length && <div className="empty">Nenhuma mídia neste álbum.</div>}</div>
    </>}
  </section>;
}

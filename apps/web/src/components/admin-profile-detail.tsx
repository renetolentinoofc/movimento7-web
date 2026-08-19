"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

import styles from "./admin-profile-detail.module.css";

type ProfileStatus = "draft" | "published" | "archived";

type Asset = {
  id: string;
  media_type: string;
  alt_text: string;
  credit: string | null;
  display_order: number;
  active: boolean;
  url: string;
};

type ProfileDetail = {
  id: string;
  registration: { id: string; protocol: string } | null;
  slug: string;
  display_name: string;
  bio: string;
  city: string | null;
  instagram: string | null;
  status: ProfileStatus;
  featured: boolean;
  published_at: string | null;
  updated_at: string;
  category_ids: string[];
  categories: { id: string; name: string }[];
  available_categories: { id: string; name: string }[];
  assets: Asset[];
};

type AssetDraft = Pick<Asset, "alt_text" | "credit" | "display_order" | "active">;

type Props = {
  profileId: string;
  csrfToken: string;
  onClose: () => void;
  onChanged: () => void;
};

const STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export function AdminProfileDetail({ profileId, csrfToken, onClose, onChanged }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [featured, setFeatured] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [assetDrafts, setAssetDrafts] = useState<Record<string, AssetDraft>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCredit, setUploadCredit] = useState("");
  const [draggedAssetId, setDraggedAssetId] = useState("");
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
        const response = await fetch(`/api/v1/admin/profiles/${profileId}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<ProfileDetail>(response);
        if (response.status === 401) {
          router.replace("/painel/login");
          return;
        }
        if (!response.ok || !payload?.data) {
          setError(apiErrorMessage(payload, "Não foi possível abrir o perfil."));
          return;
        }
        const data = payload.data;
        setDetail(data);
        setDisplayName(data.display_name);
        setSlug(data.slug);
        setBio(data.bio);
        setCity(data.city ?? "");
        setInstagram(data.instagram ?? "");
        setFeatured(data.featured);
        setCategoryIds(data.category_ids);
        setAssetDrafts(
          Object.fromEntries(
            data.assets.map((asset) => [
              asset.id,
              {
                alt_text: asset.alt_text,
                credit: asset.credit,
                display_order: asset.display_order,
                active: asset.active,
              },
            ]),
          ),
        );
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível. Não foi possível abrir o perfil.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [profileId, refreshKey, router]);

  async function jsonRequest<T>(path: string, method: "PATCH" | "POST" | "DELETE", body?: object) {
    const response = await fetch(path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await readApiEnvelope<T>(response);
    if (response.status === 401) router.replace("/painel/login");
    return { response, payload };
  }

  function toggleCategory(id: string) {
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAction("profile");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest<{ id: string; slug: string; status: string }>(
        `/api/v1/admin/profiles/${profileId}`,
        "PATCH",
        {
          display_name: displayName,
          slug,
          bio,
          city,
          instagram,
          featured,
          category_ids: categoryIds,
        },
      );
      if (!response.ok || !payload?.data) {
        const fields = payload?.error?.fields ?? {};
        const firstFieldError = Object.values(fields)[0]?.[0];
        setError(firstFieldError ?? apiErrorMessage(payload, "Não foi possível salvar o perfil."));
        return;
      }
      setSuccess("Perfil salvo com sucesso.");
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. O perfil não foi salvo.");
    } finally {
      setAction("");
    }
  }

  function updateAssetDraft(id: string, values: Partial<AssetDraft>) {
    setAssetDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
  }

  async function saveAsset(asset: Asset) {
    const draft = assetDrafts[asset.id];
    if (!draft) return;
    setAction(`asset-${asset.id}`);
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest(
        `/api/v1/admin/profile-assets/${asset.id}`,
        "PATCH",
        draft,
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível salvar a mídia."));
        return;
      }
      setSuccess(`Mídia “${draft.alt_text}” atualizada.`);
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A mídia não foi salva.");
    } finally {
      setAction("");
    }
  }

  async function uploadAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) {
      setError("Selecione uma imagem para o portfólio.");
      return;
    }
    if (uploadFile.size > 12 * 1024 * 1024) {
      setError("A imagem deve ter até 12 MB.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData();
    data.append("file", uploadFile);
    data.append("alt_text", uploadAlt);
    data.append("credit", uploadCredit);
    setAction("upload");
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/v1/admin/profiles/${profileId}/assets`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
        body: data,
      });
      const payload = await readApiEnvelope<{ id: string; alt_text: string }>(response);
      if (response.status === 401) router.replace("/painel/login");
      if (!response.ok || !payload?.data) {
        const firstFieldError = Object.values(payload?.error?.fields ?? {})[0]?.[0];
        setError(firstFieldError ?? apiErrorMessage(payload, "Não foi possível enviar a imagem."));
        return;
      }
      setSuccess(`Imagem “${payload.data.alt_text}” adicionada ao portfólio.`);
      setUploadFile(null);
      setUploadAlt("");
      setUploadCredit("");
      form.reset();
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A imagem não foi enviada.");
    } finally {
      setAction("");
    }
  }

  async function saveAssetOrder(assetIds: string[]) {
    if (!detail) return;
    setAction("order");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest(
        `/api/v1/admin/profiles/${profileId}/assets/order`,
        "PATCH",
        { asset_ids: assetIds },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível reordenar o portfólio."));
        return;
      }
      setSuccess("Ordem do portfólio atualizada.");
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A ordem não foi atualizada.");
    } finally {
      setAction("");
      setDraggedAssetId("");
    }
  }

  function moveAsset(assetId: string, direction: -1 | 1) {
    if (!detail) return;
    const ids = detail.assets.map((asset) => asset.id);
    const current = ids.indexOf(assetId);
    const destination = current + direction;
    if (current < 0 || destination < 0 || destination >= ids.length) return;
    [ids[current], ids[destination]] = [ids[destination], ids[current]];
    void saveAssetOrder(ids);
  }

  function dropAsset(targetId: string) {
    if (!detail || !draggedAssetId || draggedAssetId === targetId) return;
    const ids = detail.assets.map((asset) => asset.id);
    const source = ids.indexOf(draggedAssetId);
    const target = ids.indexOf(targetId);
    if (source < 0 || target < 0) return;
    const [moved] = ids.splice(source, 1);
    ids.splice(target, 0, moved);
    void saveAssetOrder(ids);
  }

  async function setCover(asset: Asset) {
    setAction(`cover-${asset.id}`);
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest(
        `/api/v1/admin/profile-assets/${asset.id}/cover`,
        "POST",
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível definir a capa."));
        return;
      }
      setSuccess(`“${asset.alt_text}” agora é a capa do perfil.`);
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A capa não foi alterada.");
    } finally {
      setAction("");
    }
  }

  async function removeAsset(asset: Asset) {
    if (!window.confirm(`Remover definitivamente a mídia “${asset.alt_text}”?`)) return;
    setAction(`delete-${asset.id}`);
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest(
        `/api/v1/admin/profile-assets/${asset.id}`,
        "DELETE",
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível remover a mídia."));
        return;
      }
      setSuccess(`Mídia “${asset.alt_text}” removida.`);
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. A mídia não foi removida.");
    } finally {
      setAction("");
    }
  }

  async function changeStatus(status: ProfileStatus) {
    if (!detail || status === detail.status) return;
    if (!window.confirm(`Confirma a alteração para ${STATUS_LABELS[status]}?`)) return;
    setAction("status");
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await jsonRequest<{ id: string; status: ProfileStatus }>(
        `/api/v1/admin/profiles/${profileId}/status`,
        "PATCH",
        { status },
      );
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível alterar a publicação."));
        return;
      }
      setSuccess(`Perfil alterado para ${STATUS_LABELS[payload.data.status]}.`);
      setRefreshKey((value) => value + 1);
      onChanged();
    } catch {
      setError("API indisponível. O status não foi alterado.");
    } finally {
      setAction("");
    }
  }

  const previewAsset = detail?.assets.find((asset) => assetDrafts[asset.id]?.active);

  return (
    <aside aria-labelledby="profile-detail-title" className={styles.panel}>
      <div className={styles.topbar}>
        <div>
          <p className="eyebrow">Editor de perfil</p>
          <h2 id="profile-detail-title">{detail?.display_name ?? "Carregando…"}</h2>
        </div>
        <button className="button secondary" onClick={onClose} type="button">FECHAR EDITOR</button>
      </div>

      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {success ? <div className="success" role="status">{success}</div> : null}
      {loading ? <p role="status">Carregando perfil…</p> : null}

      {detail ? (
        <div className={styles.content}>
          <div className={styles.statusBar}>
            <span data-status={detail.status}>{STATUS_LABELS[detail.status]}</span>
            {detail.registration ? <small>Origem: {detail.registration.protocol}</small> : <small>Perfil criado manualmente</small>}
          </div>

          <div className={styles.editorGrid}>
            <form className={styles.form} onSubmit={saveProfile}>
              <h3>Informações públicas</h3>
              <div className="field"><label htmlFor="profile-display-name">Nome artístico</label><input id="profile-display-name" maxLength={140} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></div>
              <div className="field"><label htmlFor="profile-slug">Endereço do perfil</label><input id="profile-slug" maxLength={180} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} /><small className="muted">Use letras minúsculas, números e hífens.</small></div>
              <div className="field"><label htmlFor="profile-bio">Biografia</label><textarea id="profile-bio" maxLength={5000} minLength={10} onChange={(event) => setBio(event.target.value)} required value={bio} /></div>
              <div className={styles.twoColumns}>
                <div className="field"><label htmlFor="profile-city">Cidade</label><input id="profile-city" maxLength={120} onChange={(event) => setCity(event.target.value)} value={city} /></div>
                <div className="field"><label htmlFor="profile-instagram">Instagram</label><input id="profile-instagram" maxLength={30} onChange={(event) => setInstagram(event.target.value)} placeholder="usuario" value={instagram} /></div>
              </div>
              <fieldset className={styles.categories}>
                <legend>Categorias</legend>
                {detail.available_categories.map((category) => (
                  <label key={category.id}><input checked={categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} type="checkbox" />{category.name}</label>
                ))}
              </fieldset>
              <label className={styles.featured}><input checked={featured} onChange={(event) => setFeatured(event.target.checked)} type="checkbox" />Destacar este artista nas listagens</label>
              <button className="button" disabled={action === "profile"} type="submit">{action === "profile" ? "SALVANDO…" : "SALVAR PERFIL"}</button>
            </form>

            <section className={styles.preview} aria-label="Prévia do perfil">
              <p className="eyebrow">Prévia</p>
              {previewAsset ? (
                // A URL autenticada precisa ser carregada diretamente pelo navegador com o cookie.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={assetDrafts[previewAsset.id]?.alt_text || previewAsset.alt_text} src={previewAsset.url} />
              ) : <div className={styles.imagePlaceholder}>SEM IMAGEM ATIVA</div>}
              <p className={styles.previewCategories}>{detail.available_categories.filter((category) => categoryIds.includes(category.id)).map((category) => category.name).join(" · ") || "Sem categoria"}</p>
              <h3>{displayName || "Nome artístico"}</h3>
              <p>{city || "Cidade não informada"}{instagram ? ` · @${instagram}` : ""}</p>
              <p className={styles.previewBio}>{bio || "A biografia aparecerá aqui."}</p>
              {featured ? <strong className={styles.featuredBadge}>DESTAQUE</strong> : null}
            </section>
          </div>

          <section className={styles.mediaSection}>
            <div className={styles.mediaHeading}>
              <div><h3>Portfólio</h3><p className="muted">Envie imagens, defina a capa e organize a ordem de exibição.</p></div>
              <span>{detail.assets.length}/30 imagens</span>
            </div>

            <form className={styles.uploadForm} onSubmit={uploadAsset}>
              <div className={styles.uploadIntro}>
                <strong>Adicionar imagem</strong>
                <small className="muted">JPG, PNG ou WebP, até 12 MB. A imagem será otimizada automaticamente.</small>
              </div>
              <div className="field">
                <label htmlFor="profile-media-file">Arquivo</label>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  id="profile-media-file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  required
                  type="file"
                />
                {uploadFile ? <small className="muted">Selecionado: {uploadFile.name} · {(uploadFile.size / 1024 / 1024).toFixed(1)} MB</small> : null}
              </div>
              <div className="field">
                <label htmlFor="profile-media-alt">Texto alternativo</label>
                <input
                  id="profile-media-alt"
                  maxLength={180}
                  minLength={3}
                  onChange={(event) => setUploadAlt(event.target.value)}
                  placeholder={`Descreva a imagem de ${displayName || "artista"}`}
                  required
                  value={uploadAlt}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-media-credit">Crédito</label>
                <input
                  id="profile-media-credit"
                  maxLength={180}
                  onChange={(event) => setUploadCredit(event.target.value)}
                  placeholder="Fotografia: nome da pessoa"
                  value={uploadCredit}
                />
              </div>
              <button className="button" disabled={action === "upload" || detail.assets.length >= 30} type="submit">
                {action === "upload" ? "PROCESSANDO…" : "ENVIAR IMAGEM"}
              </button>
            </form>

            {!detail.assets.length ? <div className="empty">Nenhuma mídia no portfólio. Use o formulário acima para adicionar a primeira imagem.</div> : null}
            {detail.assets.length > 1 ? <p className={styles.orderHelp}>Arraste os cartões ou use os botões de seta para mudar a ordem. A primeira imagem visível é a capa.</p> : null}
            <div className={styles.mediaGrid}>
              {detail.assets.map((asset, index) => {
                const draft = assetDrafts[asset.id];
                if (!draft) return null;
                const isCover = index === 0 && draft.active;
                return (
                  <article
                    className={`${styles.mediaCard} ${draggedAssetId === asset.id ? styles.dragging : ""}`}
                    draggable={!action}
                    key={asset.id}
                    onDragEnd={() => setDraggedAssetId("")}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={() => setDraggedAssetId(asset.id)}
                    onDrop={() => dropAsset(asset.id)}
                  >
                    <div className={styles.mediaImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={draft.alt_text} src={asset.url} />
                      <span className={styles.orderBadge}>#{index + 1}</span>
                      {isCover ? <strong className={styles.coverBadge}>CAPA</strong> : null}
                    </div>
                    <div className="field"><label htmlFor={`asset-alt-${asset.id}`}>Texto alternativo</label><input id={`asset-alt-${asset.id}`} maxLength={180} onChange={(event) => updateAssetDraft(asset.id, { alt_text: event.target.value })} value={draft.alt_text} /></div>
                    <div className="field"><label htmlFor={`asset-credit-${asset.id}`}>Crédito</label><input id={`asset-credit-${asset.id}`} maxLength={180} onChange={(event) => updateAssetDraft(asset.id, { credit: event.target.value })} value={draft.credit ?? ""} /></div>
                    <label className={styles.featured}><input checked={draft.active} onChange={(event) => updateAssetDraft(asset.id, { active: event.target.checked })} type="checkbox" />Mídia visível</label>
                    <div className={styles.orderActions} aria-label={`Ordenar ${draft.alt_text}`}>
                      <button disabled={Boolean(action) || index === 0} onClick={() => moveAsset(asset.id, -1)} title="Mover para a esquerda" type="button" aria-label={`Mover ${draft.alt_text} para antes`}>←</button>
                      <button disabled={Boolean(action) || index === detail.assets.length - 1} onClick={() => moveAsset(asset.id, 1)} title="Mover para a direita" type="button" aria-label={`Mover ${draft.alt_text} para depois`}>→</button>
                      <button disabled={Boolean(action) || isCover} onClick={() => void setCover(asset)} type="button">{action === `cover-${asset.id}` ? "DEFININDO…" : isCover ? "CAPA ATUAL" : "DEFINIR CAPA"}</button>
                    </div>
                    <div className={styles.mediaActions}>
                      <button className="button secondary" disabled={Boolean(action)} onClick={() => void saveAsset(asset)} type="button">{action === `asset-${asset.id}` ? "SALVANDO…" : "SALVAR DADOS"}</button>
                      <button className={styles.deleteButton} disabled={Boolean(action)} onClick={() => void removeAsset(asset)} type="button">{action === `delete-${asset.id}` ? "REMOVENDO…" : "EXCLUIR"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.publishBar}>
            <div><h3>Publicação</h3><p className="muted">Publicar torna o perfil disponível na API pública imediatamente.</p></div>
            <div className={styles.publishActions}>
              {detail.status !== "published" ? <button className="button" disabled={action === "status"} onClick={() => void changeStatus("published")} type="button">PUBLICAR PERFIL</button> : <button className="button secondary" disabled={action === "status"} onClick={() => void changeStatus("draft")} type="button">VOLTAR PARA RASCUNHO</button>}
              {detail.status !== "archived" ? <button className="button secondary" disabled={action === "status"} onClick={() => void changeStatus("archived")} type="button">ARQUIVAR</button> : <button className="button secondary" disabled={action === "status"} onClick={() => void changeStatus("draft")} type="button">RESTAURAR RASCUNHO</button>}
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}

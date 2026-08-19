"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope, type AdminSessionData } from "@/lib/admin-auth";
import { brl } from "@/lib/api";
import styles from "./admin-store.module.css";

type Product = { id: string; name: string; slug: string; price_cents: number; status: "draft" | "published" | "archived" };
type VariantDraft = { sku: string; name: string; size: string; color: string; stock_quantity: string };
type MediaDraft = { file: File | null; alt_text: string };

const STATUS_LABELS = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" };

export function AdminStore() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [draft, setDraft] = useState({ name: "", slug: "", price_cents: "", description: "" });
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [mediaDrafts, setMediaDrafts] = useState<Record<string, MediaDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variantSaving, setVariantSaving] = useState<string | null>(null);
  const [mediaSaving, setMediaSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionResponse, productsResponse] = await Promise.all([
        fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/products", { credentials: "include", cache: "no-store" }),
      ]);
      if (sessionResponse.status === 401 || productsResponse.status === 401) {
        router.replace("/painel/login");
        return;
      }
      const session = await readApiEnvelope<AdminSessionData>(sessionResponse);
      const payload = await readApiEnvelope<Product[]>(productsResponse);
      if (!sessionResponse.ok || !session?.data) throw new Error(apiErrorMessage(session, "Sessão administrativa inválida."));
      if (!productsResponse.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar os produtos."));
      setSession(session.data);
      setProducts(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conectar à API.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          description: draft.description,
          price_cents: Number(draft.price_cents),
        }),
      });
      const payload = await readApiEnvelope<{ id: string; status: Product["status"] }>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível criar o produto."));
        return;
      }
      setDraft({ name: "", slug: "", price_cents: "", description: "" });
      setNotice("Produto criado como rascunho.");
      await load();
    } catch {
      setError("A API ficou indisponível durante o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  function variantDraft(productId: string): VariantDraft {
    return variantDrafts[productId] ?? { sku: "", name: "", size: "", color: "", stock_quantity: "0" };
  }

  async function createVariant(event: React.FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    if (!session) return;
    const variant = variantDraft(productId);
    setVariantSaving(productId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/products/${productId}/variants`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token },
        body: JSON.stringify({ ...variant, stock_quantity: Number(variant.stock_quantity) }),
      });
      const payload = await readApiEnvelope<{ id: string; stock_quantity: number }>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível cadastrar a variante."));
        return;
      }
      setVariantDrafts((current) => ({ ...current, [productId]: { sku: "", name: "", size: "", color: "", stock_quantity: "0" } }));
      setNotice("Variante e estoque cadastrados.");
    } catch {
      setError("A API ficou indisponível durante o cadastro da variante.");
    } finally {
      setVariantSaving(null);
    }
  }

  async function createMedia(event: React.FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    if (!session) return;
    const media = mediaDrafts[productId] ?? { file: null, alt_text: "" };
    setMediaSaving(productId);
    setError("");
    try {
      const body = new FormData();
      if (media.file) body.append("file", media.file);
      body.append("alt_text", media.alt_text);
      const response = await fetch(`/api/v1/admin/products/${productId}/media/upload`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": session.csrf_token }, body });
      const payload = await readApiEnvelope<{ id: string }>(response);
      if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível cadastrar a imagem.")); return; }
      setMediaDrafts((current) => ({ ...current, [productId]: { file: null, alt_text: "" } }));
      setNotice("Imagem cadastrada.");
    } catch { setError("A API ficou indisponível durante o cadastro da imagem."); }
    finally { setMediaSaving(null); }
  }

  return (
    <section aria-labelledby="store-title" className={`${styles.section} section`}>
      <div className={styles.heading}>
        <div><p className="eyebrow">Painel</p><h1 id="store-title">Loja</h1><p className="lead">Produtos, publicação e preparação do estoque. Pagamentos continuam manuais.</p></div>
        <button className="button secondary" type="button" onClick={() => void load()} disabled={loading}>{loading ? "ATUALIZANDO…" : "ATUALIZAR"}</button>
      </div>
      {error ? <div className="error-summary" role="alert">{error}</div> : null}
      {notice ? <div className="success" role="status">{notice}</div> : null}
      <form className={`${styles.createForm} card form`} onSubmit={createProduct}>
        <div><p className="eyebrow">Novo item</p><h2 style={{ fontSize: "2rem" }}>Cadastrar produto</h2><div className={styles.productIntro}><p><b>Nome:</b> título comercial que será exibido para o público, como “Cropped Movimento 7”. <b>Slug:</b> identificador único usado no endereço, como <code>cropped-movimento-7</code>; use somente letras minúsculas, números e hífens. <b>Preço:</b> informe o valor inteiro em centavos — 10000 representa R$ 100,00. <b>Descrição:</b> explique a peça, sua proposta e informações importantes para o cliente.</p><p className="muted">O cadastro começa como rascunho. Depois, adicione fotos, variantes e estoque; só publique quando todas as informações estiverem revisadas.</p></div></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="field"><label htmlFor="product-name">Nome</label><input id="product-name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
          <div className="field"><label htmlFor="product-slug">Slug</label><input id="product-slug" required pattern="[a-z0-9-]+" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /><small>Use apenas letras minúsculas, números e hífens.</small></div>
          <div className="field"><label htmlFor="product-price">Preço (centavos)</label><input id="product-price" required min="0" step="1" type="number" inputMode="numeric" value={draft.price_cents} onChange={(event) => setDraft({ ...draft, price_cents: event.target.value })} /><small>Exemplo: 10000 = R$ 100,00.</small></div>
          <div className="field"><label htmlFor="product-description">Descrição</label><textarea id="product-description" rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
        </div>
        <button className="button" type="submit" disabled={saving || !session}>{saving ? "SALVANDO…" : "CRIAR RASCUNHO"}</button>
      </form>
      {loading && !products.length ? <p role="status">Carregando produtos…</p> : null}
      {!loading && !products.length ? <div className="empty"><p>Nenhum produto cadastrado. A interface não cria catálogo fictício.</p></div> : null}
      {products.length ? <div className={styles.productGrid}>{products.map((product) => <article className={`${styles.productCard} card`} key={product.id}>
        <p className="eyebrow">{STATUS_LABELS[product.status]}</p>
        <h2 style={{ fontSize: "2rem" }}>{product.name}</h2>
        <p className="muted">/{product.slug}</p>
        <strong>{brl(product.price_cents)}</strong>
        <span className="status">{STATUS_LABELS[product.status]}</span>
        <div className={styles.variantIntro}>
          <strong>Como cadastrar uma variante</strong>
          <p><b>SKU:</b> código interno único, por exemplo <code>M7-CRO-P-PRETO</code>. <b>Nome:</b> identificação exibida para a equipe, como “Cropped preto P”. <b>Tamanho:</b> grade da peça, como P, M, G ou GG. <b>Cor:</b> cor ou acabamento. <b>Estoque:</b> quantidade física disponível; use apenas número inteiro maior ou igual a zero.</p>
          <p className="muted">Cadastre uma variante para cada combinação de tamanho e cor. O produto continua como rascunho até receber mídia e ser publicado.</p>
        </div>
        <form className={styles.variantForm} onSubmit={(event) => void createVariant(event, product.id)}>
          <p className="eyebrow">Nova variante</p>
          <div className={styles.variantGrid}>
            {(["sku", "name", "size", "color"] as const).map((field) => <div className="field" key={field}>
              <label htmlFor={`${product.id}-${field}`}>{field === "sku" ? "SKU" : field === "name" ? "Nome" : field === "size" ? "Tamanho" : "Cor"}</label>
              <input id={`${product.id}-${field}`} required={field === "sku" || field === "name"} value={variantDraft(product.id)[field]} onChange={(event) => setVariantDrafts((current) => ({ ...current, [product.id]: { ...variantDraft(product.id), [field]: event.target.value } }))} />
            </div>)}
            <div className="field"><label htmlFor={`${product.id}-stock`}>Estoque</label><input id={`${product.id}-stock`} min="0" step="1" type="number" required value={variantDraft(product.id).stock_quantity} onChange={(event) => setVariantDrafts((current) => ({ ...current, [product.id]: { ...variantDraft(product.id), stock_quantity: event.target.value } }))} /></div>
          </div>
          <button className="button secondary" type="submit" disabled={variantSaving === product.id || !session}>{variantSaving === product.id ? "SALVANDO…" : "ADICIONAR VARIANTE"}</button>
        </form>
        <form className={styles.variantForm} onSubmit={(event) => void createMedia(event, product.id)}>
          <p className="eyebrow">Nova imagem</p><p className="muted">Selecione uma imagem; a API valida, converte para WebP e envia para o provedor configurado.</p>
          <div className="field"><label htmlFor={`${product.id}-media-file`}>Arquivo da imagem</label><input id={`${product.id}-media-file`} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMediaDrafts((current) => ({ ...current, [product.id]: { ...(current[product.id] ?? { file: null, alt_text: "" }), file: event.target.files?.[0] ?? null } }))} /></div>
          <div className="field"><label htmlFor={`${product.id}-media-alt`}>Texto alternativo</label><input id={`${product.id}-media-alt`} required value={mediaDrafts[product.id]?.alt_text ?? ""} onChange={(event) => setMediaDrafts((current) => ({ ...current, [product.id]: { ...(current[product.id] ?? { file: null, alt_text: "" }), alt_text: event.target.value } }))} /></div>
          <button className="button secondary" type="submit" disabled={mediaSaving === product.id || !session}>{mediaSaving === product.id ? "SALVANDO…" : "ADICIONAR IMAGEM"}</button>
        </form>
      </article>)}</div> : null}
    </section>
  );
}

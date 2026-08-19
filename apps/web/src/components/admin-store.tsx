"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope, type AdminSessionData } from "@/lib/admin-auth";
import { brl } from "@/lib/api";
import styles from "./admin-store.module.css";

type ProductVariant = { id: string; sku: string; name: string; size: string | null; color: string | null; stock_quantity: number; reserved_quantity: number; active: boolean };
type Product = { id: string; name: string; slug: string; description: string; composition: string | null; price_cents: number; status: "draft" | "published" | "archived"; featured: boolean; display_order: number; variants: ProductVariant[] };
type Order = { id: string; order_code: string; status: string; payment_status: string; total_cents: number; created_at: string; customer: { name: string; email: string; phone: string }; fulfillment?: { carrier: string | null; tracking_code: string | null } | null };
type OrderDetail = Order & { subtotal_cents: number; shipping_cents: number; currency: string; address: { recipient_name: string; postal_code: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string } | null; items: { product_name: string; sku: string; variant: string; unit_price_cents: number; quantity: number }[]; payment: { provider: string; status: string; amount_cents: number; provider_reference: string | null; failure_code: string | null } | null; history: { old_status: string | null; new_status: string; reason: string | null; created_at: string }[] };
type InventoryMovement = { id: string; product_name: string; variant_name: string; sku: string; quantity_delta: number; reason: string; created_at: string };
type VariantDraft = { sku: string; name: string; size: string; color: string; stock_quantity: string };
type MediaDraft = { file: File | null; alt_text: string };

const STATUS_LABELS = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" };

export function AdminStore() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [draft, setDraft] = useState({ name: "", slug: "", price_cents: "", description: "", composition: "", featured: false, display_order: "0" });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
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
      const [sessionResponse, productsResponse, ordersResponse, movementsResponse] = await Promise.all([
        fetch("/api/v1/admin/auth/session", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/products", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/orders", { credentials: "include", cache: "no-store" }),
        fetch("/api/v1/admin/inventory/movements", { credentials: "include", cache: "no-store" }),
      ]);
      if (sessionResponse.status === 401 || productsResponse.status === 401) {
        router.replace("/painel/login");
        return;
      }
      const session = await readApiEnvelope<AdminSessionData>(sessionResponse);
      const payload = await readApiEnvelope<Product[]>(productsResponse);
      const ordersPayload = await readApiEnvelope<Order[]>(ordersResponse);
      if (!sessionResponse.ok || !session?.data) throw new Error(apiErrorMessage(session, "Sessão administrativa inválida."));
      if (!productsResponse.ok || !payload?.data) throw new Error(apiErrorMessage(payload, "Não foi possível carregar os produtos."));
      setSession(session.data);
      setProducts(payload.data);
      if (ordersResponse.ok && ordersPayload?.data) setOrders(ordersPayload.data);
      const movementsPayload = await readApiEnvelope<InventoryMovement[]>(movementsResponse);
      if (movementsResponse.ok && movementsPayload?.data) setMovements(movementsPayload.data);
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

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(editingProductId ? `/api/v1/admin/products/${editingProductId}` : "/api/v1/admin/products", {
        method: editingProductId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          description: draft.description,
          composition: draft.composition,
          featured: draft.featured,
          display_order: Number(draft.display_order),
          price_cents: Number(draft.price_cents),
        }),
      });
      const payload = await readApiEnvelope<{ id: string; status: Product["status"] }>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível criar o produto."));
        return;
      }
      setDraft({ name: "", slug: "", price_cents: "", description: "", composition: "", featured: false, display_order: "0" });
      setEditingProductId(null);
      setNotice(editingProductId ? "Produto atualizado." : "Produto criado como rascunho.");
      await load();
    } catch {
      setError("A API ficou indisponível durante o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setDraft({ name: product.name, slug: product.slug, price_cents: String(product.price_cents), description: product.description, composition: product.composition ?? "", featured: product.featured, display_order: String(product.display_order) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeProductStatus(product: Product) {
    if (!session) return;
    const next = product.status === "published" ? "draft" : product.status === "draft" ? "published" : "draft";
    const response = await fetch(`/api/v1/admin/products/${product.id}/status`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token }, body: JSON.stringify({ status: next }) });
    const payload = await readApiEnvelope<{ status: Product["status"] }>(response);
    if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível alterar o status do produto.")); return; }
    setNotice(`Produto ${next === "published" ? "publicado" : "retornado para rascunho"}.`);
    await load();
  }

  async function updateOrder(order: Order, action: "payment" | "status", value: string) {
    if (!session) return;
    const path = action === "payment" ? `/api/v1/admin/orders/${order.id}/payment` : `/api/v1/admin/orders/${order.id}/status`;
    const response = await fetch(path, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token }, body: JSON.stringify({ status: value }) });
    const payload = await readApiEnvelope<Order>(response);
    if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível atualizar o pedido.")); return; }
    setNotice(`Pedido ${order.order_code} atualizado.`);
    await load();
  }

  async function openOrderDetail(order: Order) {
    setDetailLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${order.id}`, { credentials: "include", cache: "no-store" });
      const payload = await readApiEnvelope<OrderDetail>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível carregar os detalhes do pedido."));
        return;
      }
      setOrderDetail(payload.data);
    } catch {
      setError("A API ficou indisponível ao carregar o pedido.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateFulfillment(order: Order, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/v1/admin/orders/${order.id}/fulfillment`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token }, body: JSON.stringify({ carrier: values.carrier, tracking_code: values.tracking_code }) });
    const payload = await readApiEnvelope<Order>(response);
    if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível salvar a entrega.")); return; }
    setNotice(`Entrega do pedido ${order.order_code} atualizada.`);
    await load();
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

  async function updateVariantStock(product: Product, variant: ProductVariant, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const stock = Number(stockDrafts[variant.id] ?? variant.stock_quantity);
    if (!Number.isInteger(stock) || stock < variant.reserved_quantity) {
      setError("O estoque precisa ser um número inteiro maior ou igual ao reservado.");
      return;
    }
    const response = await fetch(`/api/v1/admin/products/${product.id}/variants/${variant.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrf_token }, body: JSON.stringify({ stock_quantity: stock }) });
    const payload = await readApiEnvelope<{ stock_quantity: number }>(response);
    if (!response.ok || !payload?.data) { setError(apiErrorMessage(payload, "Não foi possível ajustar o estoque.")); return; }
    setNotice(`Estoque de ${variant.sku} atualizado.`);
    await load();
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
      <form className={`${styles.createForm} card form`} onSubmit={saveProduct}>
        <div><p className="eyebrow">{editingProductId ? "Editar item" : "Novo item"}</p><h2 style={{ fontSize: "2rem" }}>{editingProductId ? "Editar produto" : "Cadastrar produto"}</h2><div className={styles.productIntro}><p><b>Nome:</b> título comercial exibido para o público. <b>Slug:</b> identificador único do endereço. <b>Preço:</b> valor inteiro em centavos — 10000 representa R$ 100,00.</p><p className="muted">Adicione fotos, variantes e estoque antes de publicar.</p></div></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="field"><label htmlFor="product-name">Nome</label><input id="product-name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
          <div className="field"><label htmlFor="product-slug">Slug</label><input id="product-slug" required pattern="[a-z0-9-]+" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /><small>Use apenas letras minúsculas, números e hífens.</small></div>
          <div className="field"><label htmlFor="product-price">Preço (centavos)</label><input id="product-price" required min="0" step="1" type="number" inputMode="numeric" value={draft.price_cents} onChange={(event) => setDraft({ ...draft, price_cents: event.target.value })} /><small>Exemplo: 10000 = R$ 100,00.</small></div>
          <div className="field"><label htmlFor="product-description">Descrição</label><textarea id="product-description" rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
          <div className="field"><label htmlFor="product-composition">Composição</label><input id="product-composition" value={draft.composition} onChange={(event) => setDraft({ ...draft, composition: event.target.value })} /></div>
          <div className="field"><label htmlFor="product-order">Ordem de exibição</label><input id="product-order" min="0" step="1" type="number" value={draft.display_order} onChange={(event) => setDraft({ ...draft, display_order: event.target.value })} /></div>
        </div>
        <label><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /> Destacar na página inicial</label>
        <button className="button" type="submit" disabled={saving || !session}>{saving ? "SALVANDO…" : editingProductId ? "SALVAR ALTERAÇÕES" : "CRIAR RASCUNHO"}</button>{editingProductId ? <button className="button secondary" type="button" onClick={() => { setEditingProductId(null); setDraft({ name: "", slug: "", price_cents: "", description: "", composition: "", featured: false, display_order: "0" }); }}>CANCELAR EDIÇÃO</button> : null}
      </form>
      {loading && !products.length ? <p role="status">Carregando produtos…</p> : null}
      {!loading && !products.length ? <div className="empty"><p>Nenhum produto cadastrado. A interface não cria catálogo fictício.</p></div> : null}
      {products.length ? <div className={styles.productGrid}>{products.map((product) => <article className={`${styles.productCard} card`} key={product.id}>
        <p className="eyebrow">{STATUS_LABELS[product.status]}</p>
        <h2 style={{ fontSize: "2rem" }}>{product.name}</h2>
        <p className="muted">/{product.slug}</p>
        <strong>{brl(product.price_cents)}</strong>
        <span className="status">{STATUS_LABELS[product.status]}</span>
        <p className="muted">{product.variants.length} variante(s) · {product.variants.reduce((total, variant) => total + variant.stock_quantity - variant.reserved_quantity, 0)} disponível(is)</p>
        <p><button className="button secondary" type="button" onClick={() => editProduct(product)}>EDITAR PRODUTO</button>{" "}<button className="button secondary" type="button" onClick={() => void changeProductStatus(product)}>{product.status === "published" ? "RETORNAR A RASCUNHO" : "PUBLICAR PRODUTO"}</button></p>
        <div className={styles.variantIntro}>
          <strong>Como cadastrar uma variante</strong>
          <p><b>SKU:</b> código interno único, por exemplo <code>M7-CRO-P-PRETO</code>. <b>Nome:</b> identificação exibida para a equipe, como “Cropped preto P”. <b>Tamanho:</b> grade da peça, como P, M, G ou GG. <b>Cor:</b> cor ou acabamento. <b>Estoque:</b> quantidade física disponível; use apenas número inteiro maior ou igual a zero.</p>
          <p className="muted">Cadastre uma variante para cada combinação de tamanho e cor. O produto continua como rascunho até receber mídia e ser publicado.</p>
        </div>
        {product.variants.length ? <div className={styles.stockList}><p className="eyebrow">Estoque atual</p>{product.variants.map((variant) => <form className={styles.stockRow} key={variant.id} onSubmit={(event) => void updateVariantStock(product, variant, event)}><span><b>{variant.name}</b><br /><small>{variant.sku}{variant.size ? ` · ${variant.size}` : ""}{variant.color ? ` · ${variant.color}` : ""}</small></span><span className="muted">{variant.reserved_quantity} reservado(s)</span><label>Estoque<input aria-label={`Estoque ${variant.sku}`} min={variant.reserved_quantity} step="1" type="number" value={stockDrafts[variant.id] ?? variant.stock_quantity} onChange={(event) => setStockDrafts((current) => ({ ...current, [variant.id]: event.target.value }))} /></label><button className="button secondary" type="submit">SALVAR</button></form>)}</div> : null}
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
      <section className={`${styles.ordersSection} section`} aria-labelledby="orders-title">
        <div className={styles.heading}><div><p className="eyebrow">Operação</p><h2 id="orders-title">Pedidos</h2><p className="lead">Confirme pagamentos, acompanhe o processamento e registre a entrega.</p></div><span className="status">{orders.length} pedido(s)</span></div>
        {!orders.length ? <div className="empty">Nenhum pedido criado.</div> : <div className={styles.orderGrid}>{orders.map((order) => <article className="card" key={order.id}><p className="eyebrow">{order.order_code}</p><h3>{order.customer.name}</h3><p className="muted">{order.customer.email} · {new Date(order.created_at).toLocaleString("pt-BR")}</p><strong>{brl(order.total_cents)}</strong><p>Status: <b>{order.status}</b> · Pagamento: <b>{order.payment_status}</b></p><button className="button secondary" type="button" onClick={() => void openOrderDetail(order)}>{detailLoading ? "CARREGANDO…" : "VER DETALHES"}</button><div><button className="button secondary" type="button" disabled={order.payment_status !== "pending"} onClick={() => void updateOrder(order, "payment", "paid")}>CONFIRMAR PAGAMENTO</button>{" "}<button className="button secondary" type="button" disabled={order.payment_status !== "pending"} onClick={() => void updateOrder(order, "payment", "failed")}>RECUSAR PAGAMENTO</button></div>{order.status === "processing" ? <form className="form" onSubmit={(event) => void updateFulfillment(order, event)}><div className="field"><label>Transportadora<input name="carrier" defaultValue={order.fulfillment?.carrier ?? ""} /></label></div><div className="field"><label>Código de rastreio<input name="tracking_code" defaultValue={order.fulfillment?.tracking_code ?? ""} /></label></div><button className="button secondary" type="submit">SALVAR ENTREGA</button><button className="button secondary" type="button" onClick={() => void updateOrder(order, "status", "shipped")}>MARCAR COMO ENVIADO</button></form> : null}{order.status === "shipped" ? <button className="button secondary" type="button" onClick={() => void updateOrder(order, "status", "delivered")}>MARCAR COMO ENTREGUE</button> : null}{order.status === "pending_payment" ? <button className="button secondary" type="button" onClick={() => void updateOrder(order, "status", "cancelled")}>CANCELAR PEDIDO</button> : null}</article>)}</div>}
      </section>
      <section className={`${styles.inventorySection} section`} aria-labelledby="inventory-title"><div className={styles.heading}><div><p className="eyebrow">Controle</p><h2 id="inventory-title">Histórico de estoque</h2><p className="lead">Entradas, saídas, ajustes e confirmações de pagamento.</p></div><span className="status">{movements.length} registro(s)</span></div>{movements.length ? <div className={styles.movementList}>{movements.map((movement) => <div className={styles.movementRow} key={movement.id}><span><b>{movement.product_name}</b><br /><small>{movement.variant_name} · {movement.sku}</small></span><strong className={movement.quantity_delta < 0 ? styles.stockOut : movement.quantity_delta > 0 ? styles.stockIn : ""}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</strong><span>{movement.reason}</span><time dateTime={movement.created_at}>{new Date(movement.created_at).toLocaleString("pt-BR")}</time></div>)}</div> : <div className="empty">Nenhuma movimentação registrada.</div>}</section>
      {orderDetail ? <section className={`${styles.orderDetail} card`} aria-labelledby="order-detail-title"><div className={styles.detailHeading}><div><p className="eyebrow">Detalhes do pedido</p><h2 id="order-detail-title">{orderDetail.order_code}</h2></div><button className="button secondary" type="button" onClick={() => setOrderDetail(null)}>FECHAR</button></div><div className={styles.detailGrid}><div><h3>Cliente</h3><p>{orderDetail.customer.name}<br />{orderDetail.customer.email}<br />{orderDetail.customer.phone}</p></div><div><h3>Endereço</h3>{orderDetail.address ? <p>{orderDetail.address.recipient_name}<br />{orderDetail.address.street}, {orderDetail.address.number}{orderDetail.address.complement ? ` · ${orderDetail.address.complement}` : ""}<br />{orderDetail.address.neighborhood} · {orderDetail.address.city}/{orderDetail.address.state}<br />CEP {orderDetail.address.postal_code}</p> : <p className="muted">Endereço não informado.</p>}</div><div><h3>Pagamento</h3><p>{orderDetail.payment?.status ?? orderDetail.payment_status} · {orderDetail.payment?.provider ?? "—"}<br />{brl(orderDetail.payment?.amount_cents ?? orderDetail.total_cents)}</p></div><div><h3>Entrega</h3><p>{orderDetail.fulfillment?.carrier ?? "Transportadora não informada"}<br />{orderDetail.fulfillment?.tracking_code ?? "Rastreamento não informado"}</p></div></div><h3>Itens</h3><div className={styles.detailItems}>{orderDetail.items.map((item) => <div className={styles.detailItem} key={`${item.sku}-${item.variant}`}><span><b>{item.product_name}</b><br /><small>{item.variant} · SKU {item.sku}</small></span><span>{item.quantity} × {brl(item.unit_price_cents)}</span></div>)}</div><h3>Histórico</h3><ol className={styles.history}>{orderDetail.history.map((entry, index) => <li key={`${entry.created_at}-${index}`}><b>{entry.new_status}</b> · {new Date(entry.created_at).toLocaleString("pt-BR")}<br /><span className="muted">{entry.reason ?? "Sem observação"}</span></li>)}</ol></section> : null}
    </section>
  );
}

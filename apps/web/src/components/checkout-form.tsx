"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { brl, type Envelope } from "@/lib/api";

type Order = { order_code: string; access_token: string; total_cents: number; shipping_cents: number };
type ShippingQuote = { label: string; shipping_cents: number; total_cents: number; estimated_days: number | null; free_shipping: boolean };

export function CheckoutForm() {
  const router = useRouter();
  const key = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "quoting" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);

  async function quoteShipping(event: React.FocusEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const values = Object.fromEntries(new FormData(form));
    if (!String(values.postal_code ?? "").trim() || !String(values.state ?? "").trim()) return;
    setStatus("quoting");
    setMessage("");
    try {
      const response = await fetch("/api/shipping/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: { postal_code: values.postal_code, state: values.state } }) });
      const payload = await response.json() as Envelope<ShippingQuote>;
      if (!response.ok || !payload.data) { setQuote(null); setMessage(payload.error?.message ?? "Não foi possível calcular a entrega."); setStatus("error"); return; }
      setQuote(payload.data);
      setStatus("idle");
    } catch { setMessage("Não foi possível calcular a entrega agora."); setStatus("error"); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      customer: { name: values.name, email: values.email, phone: values.phone },
      address: { recipient_name: values.recipient_name, postal_code: values.postal_code, street: values.street, number: values.number, complement: values.complement, neighborhood: values.neighborhood, city: values.city, state: values.state },
      terms_accepted: values.terms_accepted === "on",
      terms_version: "2026-08-draft",
    };
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key.current }, body: JSON.stringify(body) });
      const payload = await response.json() as Envelope<Order>;
      if (!response.ok || !payload.data) { setMessage(payload.error?.message ?? "Não foi possível criar o pedido."); setStatus("error"); return; }
      router.push(`/pedido/${payload.data.order_code}?token=${encodeURIComponent(payload.data.access_token)}`);
    } catch { setMessage("Não foi possível conectar ao servidor."); setStatus("error"); }
  }

  return <form className="form" onSubmit={submit}>
    {status === "error" && <div className="error-summary" role="alert">{message}</div>}
    <fieldset className="card"><legend className="legend">Contato</legend><div className="field"><label htmlFor="checkout-name">Nome</label><input id="checkout-name" name="name" required autoComplete="name" /></div><div className="field"><label htmlFor="checkout-email">E-mail</label><input id="checkout-email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="checkout-phone">WhatsApp</label><input id="checkout-phone" name="phone" required autoComplete="tel" /></div></fieldset>
    <fieldset className="card"><legend className="legend">Endereço</legend>{[["recipient_name", "Destinatário"], ["postal_code", "CEP"], ["street", "Rua"], ["number", "Número"], ["complement", "Complemento"], ["neighborhood", "Bairro"], ["city", "Cidade"], ["state", "UF"]].map(([name, label]) => <div className="field" key={name}><label htmlFor={`checkout-${name}`}>{label}</label><input id={`checkout-${name}`} name={name} required={name !== "complement"} maxLength={name === "state" ? 2 : 180} onBlur={name === "postal_code" || name === "state" ? quoteShipping : undefined} /></div>)}</fieldset>
    {status === "quoting" && <p role="status">Calculando entrega…</p>}
    {quote && <div className="card"><p><strong>{quote.label}</strong>{quote.estimated_days ? ` · até ${quote.estimated_days} dias úteis` : ""}</p><p>Frete: <strong>{quote.free_shipping ? "Grátis" : brl(quote.shipping_cents)}</strong></p><p>Total estimado: <strong>{brl(quote.total_cents)}</strong></p></div>}
    <label><input type="checkbox" name="terms_accepted" required /> Li os termos, política de privacidade e informações de entrega. Entendo que criar o pedido não aprova pagamento.</label>
    <button className="button" disabled={status === "submitting"}>{status === "submitting" ? "CRIANDO PEDIDO…" : "CRIAR PEDIDO"}</button>
  </form>;
}

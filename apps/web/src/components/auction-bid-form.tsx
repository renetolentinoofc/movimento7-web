"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { apiRequest } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z.string().trim().min(10, "Informe um WhatsApp válido."),
  amount_cents: z.coerce.number().int().positive("Informe um lance válido."),
  terms_accepted: z.literal(true, { error: "Aceite as regras do leilão." }),
});

type Props = { lotId: string; minimumCents: number; termsVersion: string };

export function AuctionBidForm({ lotId, minimumCents, termsVersion }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: String(minimumCents / 100), terms: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";

  useEffect(() => {
    if (publicKey) initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  async function submit(cardData: { token: string; payment_method_id: string; installments: number; payer?: { email?: string } }) {
    setMessage("");
    setError("");
    setLoading(true);
    const parsed = schema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      amount_cents: Math.round(Number(form.amount.replace(",", ".")) * 100),
      terms_accepted: form.terms,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os dados informados.");
      setLoading(false);
      return;
    }
    const amountCents = parsed.data.amount_cents;
    const authorization = await apiRequest<{ id: string }>(`/api/v1/auction-lots/${lotId}/authorizations`, {
      method: "POST", body: JSON.stringify({ ...parsed.data, amount_cents: amountCents,
        terms_version: termsVersion, card_token: cardData.token,
        payment_method_id: cardData.payment_method_id, installments: cardData.installments }),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    if (!authorization.data) {
      setError(authorization.error?.message ?? "Não foi possível autorizar a garantia.");
      setLoading(false);
      return;
    }
    const response = await apiRequest<{ amount_cents: number }>(`/api/v1/auction-lots/${lotId}/bids`, {
      method: "POST", body: JSON.stringify({ ...parsed.data, amount_cents: amountCents,
        terms_version: termsVersion, authorization_id: authorization.data.id }),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    if (!response.data) {
      setError(response.error?.message ?? "A garantia foi criada, mas o lance não foi registrado. Contate o suporte.");
      setLoading(false);
      return;
    }
    setMessage("Lance enviado para validação.");
    setLoading(false);
  }

  return <div className="card" aria-label="Enviar lance">
    <h2>Enviar lance</h2>
    <label>Nome<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
    <label>E-mail<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
    <label>WhatsApp<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label>
    <label>Lance em reais<input inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
    <label><input type="checkbox" checked={form.terms} onChange={event => setForm({ ...form, terms: event.target.checked })} /> Aceito as regras de participação.</label>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {publicKey ? <CardPayment key={form.amount} initialization={{ amount: Number(form.amount.replace(",", ".")) || minimumCents / 100 }}
      customization={{ paymentMethods: { types: { included: ["credit_card"] } } }} locale="pt-BR"
      onSubmit={submit} onError={() => setError("Não foi possível carregar o formulário seguro do Mercado Pago.")} />
      : <p className="muted">O pagamento do leilão ainda não está configurado neste ambiente.</p>}
    {loading && <p role="status">Validando garantia financeira…</p>}
  </div>;
}

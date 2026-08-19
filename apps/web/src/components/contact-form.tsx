"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import styles from "./public-form.module.css";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    try {
      const response = await apiRequest<{ protocol: string; notification_status: string }>("/api/v1/contact", {
        method: "POST",
        body: JSON.stringify({ ...payload, privacy_accepted: form.get("privacy_accepted") === "on", privacy_version: "2026-08-draft" })
      });
      if (response.error) {
        setMessage(response.error.message);
        setStatus("error");
      } else {
        const forwarded = response.data?.notification_status === "sent";
        setMessage(`${forwarded ? "Mensagem encaminhada" : "Mensagem recebida, mas o encaminhamento por e-mail ficou pendente"}. Protocolo: ${response.data?.protocol}`);
        setStatus("success");
        event.currentTarget.reset();
      }
    } catch {
      setMessage("Não foi possível conectar ao serviço de contato.");
      setStatus("error");
    }
  }

  return <form className={`form ${styles.form}`} onSubmit={submit}>
    {status === "success" && <div className="success" role="status">{message}</div>}
    {status === "error" && <div className="error-summary" role="alert">{message}</div>}
    <div className="field">
      <label htmlFor="contact-name">Nome</label>
      <input id="contact-name" name="name" required autoComplete="name" />
    </div>
    <div className={styles.row}>
      <div className="field">
        <label htmlFor="contact-email">E-mail</label>
        <input id="contact-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="contact-subject">Assunto</label>
        <select id="contact-subject" name="subject" required>
          <option value="">Selecione</option>
          <option>Parceria</option><option>Inscrição</option><option>Loja</option>
          <option>Acessibilidade</option><option>Privacidade</option><option>Outro</option>
        </select>
      </div>
    </div>
    <div className="field">
      <label htmlFor="contact-message">Mensagem</label>
      <textarea id="contact-message" name="message" required minLength={10} />
    </div>
    <label className={styles.checkbox}>
      <input type="checkbox" name="privacy_accepted" required />
      <span>Autorizo o tratamento dos dados para responder este contato.</span>
    </label>
    <div className={styles.honeypot} aria-hidden="true">
      <label htmlFor="contact-fax">Não preencha</label>
      <input id="contact-fax" name="fax_number_for_bots" tabIndex={-1} autoComplete="off" />
    </div>
    <button className={`button ${styles.submit}`} disabled={status === "submitting"}>
      {status === "submitting" ? "ENVIANDO…" : "ENVIAR MENSAGEM"}
    </button>
  </form>;
}

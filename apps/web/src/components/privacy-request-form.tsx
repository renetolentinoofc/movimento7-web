"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

const options = [
  ["access", "Acesso aos dados"],
  ["correct", "Correção"],
  ["export", "Exportação"],
  ["portability", "Portabilidade"],
  ["delete", "Exclusão"],
] as const;

export function PrivacyRequestForm() {
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<string>("access");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await apiRequest<{ protocol: string; verification_sent: boolean }>(
        "/api/v1/privacy/requests",
        { method: "POST", body: JSON.stringify({ email, request_type: requestType }) },
      );
      if (response.error) setMessage(response.error.message);
      else setMessage(`Solicitação registrada. Protocolo: ${response.data?.protocol}. Confira seu e-mail para confirmar a identidade.`);
    } catch {
      setMessage("Não foi possível registrar a solicitação agora.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="card" onSubmit={submit}>
    <h2>Solicitar atendimento de dados</h2>
    <label>E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Solicitação<select value={requestType} onChange={(event) => setRequestType(event.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <button className="button" disabled={loading} type="submit">{loading ? "ENVIANDO…" : "SOLICITAR"}</button>
    {message ? <p role="status">{message}</p> : null}
  </form>;
}

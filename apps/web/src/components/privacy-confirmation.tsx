"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PrivacyConfirmation() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Confirmando sua solicitação…");
  const protocol = params.get("protocol");
  const token = params.get("token");

  useEffect(() => {
    if (!protocol || !token) return;
    fetch(`/api/v1/privacy/requests/${encodeURIComponent(protocol)}/verify?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json() as { data?: { verified?: boolean }; error?: { message?: string } };
        setMessage(response.ok && payload.data?.verified ? "Identidade confirmada. A equipe analisará sua solicitação." : payload.error?.message ?? "Link inválido ou expirado.");
      })
      .catch(() => setMessage("Não foi possível confirmar agora. Tente novamente mais tarde."));
  }, [protocol, token]);

  return <section className="section"><div className="container"><p className="eyebrow">Privacidade</p><h1>Confirmação</h1><p className="lead" role="status">{protocol && token ? message : "Link inválido ou incompleto."}</p></div></section>;
}

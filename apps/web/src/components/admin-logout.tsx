"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, readApiEnvelope, type AdminSessionData } from "@/lib/admin-auth";

type LogoutData = { logged_out: boolean };

export function AdminLogout() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setSubmitting(true);
    setError("");
    try {
      const sessionResponse = await fetch("/api/v1/admin/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      const sessionPayload = await readApiEnvelope<AdminSessionData>(sessionResponse);
      if (sessionResponse.status === 401) {
        router.replace("/painel/login");
        return;
      }
      if (!sessionResponse.ok || !sessionPayload?.data?.csrf_token) {
        setError(apiErrorMessage(sessionPayload, "Não foi possível validar a sessão."));
        return;
      }

      const response = await fetch("/api/v1/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": sessionPayload.data.csrf_token },
      });
      const payload = await readApiEnvelope<LogoutData>(response);
      if (!response.ok || !payload?.data?.logged_out) {
        setError(apiErrorMessage(payload, "Não foi possível encerrar a sessão."));
        return;
      }
      router.replace("/painel/login?status=logged-out");
      router.refresh();
    } catch {
      setError("API indisponível. Não foi possível encerrar a sessão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        className="button secondary"
        disabled={submitting}
        onClick={() => void logout()}
        type="button"
      >
        {submitting ? "SAINDO…" : "SAIR"}
      </button>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}

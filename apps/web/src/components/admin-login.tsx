"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-auth-form.module.css";

type AdminLoginProps = {
  passwordChanged?: boolean;
};

export function AdminLogin({ passwordChanged = false }: AdminLoginProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = await readApiEnvelope<AdminSessionData>(response);

      if (!response.ok || !payload?.data) {
        setError(
          apiErrorMessage(
            payload,
            response.status >= 500
              ? "O serviço de autenticação está indisponível. Tente novamente em instantes."
              : "Não foi possível entrar.",
          ),
        );
        return;
      }

      router.replace(
        payload.data.user.must_change_password ? "/admin/trocar-senha" : "/admin",
      );
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao serviço de autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel}>
      {passwordChanged ? (
        <div className={styles.notice} role="status">
          Senha alterada. Entre novamente com a nova senha.
        </div>
      ) : null}
      <form className={styles.form} onSubmit={submit}>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.field}>
          <label htmlFor="admin-email">E-mail</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue="admin@movimento7.com"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-password">Senha</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <div className={styles.actions}>
          <button className="button" disabled={loading} type="submit">
            {loading ? "ENTRANDO…" : "ENTRAR"}
          </button>
        </div>
      </form>
    </div>
  );
}

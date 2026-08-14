"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  apiErrorMessage,
  readApiEnvelope,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-auth-form.module.css";

type ChangePasswordData = {
  changed: boolean;
  reauthentication_required: boolean;
};

export function AdminChangePassword() {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/v1/admin/auth/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<AdminSessionData>(response);

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!response.ok || !payload?.data?.csrf_token) {
          setError(
            apiErrorMessage(payload, "Não foi possível validar sua sessão. Entre novamente."),
          );
          return;
        }
        setCsrfToken(payload.data.csrf_token);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Não foi possível conectar ao serviço de autenticação.");
      } finally {
        if (!controller.signal.aborted) setLoadingSession(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("current_password") ?? "");
    const newPassword = String(form.get("new_password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    if (newPassword !== confirmation) {
      setFieldErrors({ password_confirmation: ["As novas senhas não conferem."] });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const payload = await readApiEnvelope<ChangePasswordData>(response);

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !payload?.data?.changed) {
        setError(apiErrorMessage(payload, "Não foi possível trocar a senha."));
        setFieldErrors(payload?.error?.fields ?? {});
        return;
      }

      router.replace("/admin/login?status=password-changed");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao serviço de autenticação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) return <p role="status">Validando sessão…</p>;

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={submit}>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.field}>
          <label htmlFor="current-password">Senha atual</label>
          <input
            id="current-password"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-password">Nova senha</label>
          <input
            id="new-password"
            name="new_password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            aria-describedby={
              fieldErrors.new_password
                ? "new-password-hint new-password-error"
                : "new-password-hint"
            }
            aria-invalid={fieldErrors.new_password ? "true" : undefined}
          />
          <p className={styles.hint} id="new-password-hint">
            Use pelo menos 12 caracteres e uma senha diferente da atual.
          </p>
          {fieldErrors.new_password ? (
            <p className={styles.error} id="new-password-error">
              {fieldErrors.new_password.join(" ")}
            </p>
          ) : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="password-confirmation">Confirme a nova senha</label>
          <input
            id="password-confirmation"
            name="password_confirmation"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            aria-describedby={
              fieldErrors.password_confirmation ? "password-confirmation-error" : undefined
            }
            aria-invalid={fieldErrors.password_confirmation ? "true" : undefined}
          />
          {fieldErrors.password_confirmation ? (
            <p className={styles.error} id="password-confirmation-error" role="alert">
              {fieldErrors.password_confirmation.join(" ")}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button className="button" disabled={submitting || !csrfToken} type="submit">
            {submitting ? "ALTERANDO…" : "ALTERAR SENHA"}
          </button>
        </div>
      </form>
    </div>
  );
}

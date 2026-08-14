"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  adminChangePasswordSchema,
  apiErrorMessage,
  readApiEnvelope,
  validationFieldErrors,
  type AdminFieldErrors,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-auth-form.module.css";
import { PasswordField } from "./password-field";

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
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});

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
          router.replace("/painel/login");
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

  function focusField(errors: AdminFieldErrors) {
    const firstField = Object.keys(errors)[0];
    if (firstField) document.getElementById(firstField.replaceAll("_", "-"))?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = adminChangePasswordSchema.safeParse({
      current_password: String(form.get("current_password") ?? ""),
      new_password: String(form.get("new_password") ?? ""),
      password_confirmation: String(form.get("password_confirmation") ?? ""),
    });

    if (!parsed.success) {
      const errors = validationFieldErrors(parsed.error);
      setFieldErrors(errors);
      focusField(errors);
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
          current_password: parsed.data.current_password,
          new_password: parsed.data.new_password,
        }),
      });
      const payload = await readApiEnvelope<ChangePasswordData>(response);

      if (response.status === 401) {
        router.replace("/painel/login");
        return;
      }
      if (!response.ok || !payload?.data?.changed) {
        const serverFields = payload?.error?.fields ?? {};
        const normalizedFields =
          payload?.error?.code === "invalid_password" && !serverFields.current_password
            ? { ...serverFields, current_password: ["A senha atual não confere."] }
            : serverFields;
        setError(apiErrorMessage(payload, "Não foi possível trocar a senha."));
        setFieldErrors(normalizedFields);
        focusField(normalizedFields);
        return;
      }

      router.replace("/painel/login?status=password-changed");
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
      <form className={styles.form} onSubmit={submit} noValidate>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
        <PasswordField
          id="current-password"
          name="current_password"
          label="Senha atual"
          required
          autoComplete="current-password"
          error={fieldErrors.current_password?.[0]}
        />
        <PasswordField
          id="new-password"
          name="new_password"
          label="Nova senha"
          required
          minLength={12}
          autoComplete="new-password"
          hint="Use pelo menos 12 caracteres e uma senha diferente da atual."
          error={fieldErrors.new_password?.[0]}
        />
        <PasswordField
          id="password-confirmation"
          name="password_confirmation"
          label="Confirme a nova senha"
          required
          minLength={12}
          autoComplete="new-password"
          error={fieldErrors.password_confirmation?.[0]}
        />
        <div className={styles.actions}>
          <button className="button" disabled={submitting || !csrfToken} type="submit">
            {submitting ? "ALTERANDO…" : "ALTERAR SENHA"}
          </button>
        </div>
      </form>
    </div>
  );
}

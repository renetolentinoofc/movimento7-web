"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  adminLoginSchema,
  apiErrorMessage,
  readApiEnvelope,
  validationFieldErrors,
  type AdminFieldErrors,
  type AdminSessionData,
} from "@/lib/admin-auth";

import styles from "./admin-auth-form.module.css";
import { PasswordField } from "./password-field";

type AdminLoginProps = {
  passwordChanged?: boolean;
};

export function AdminLogin({ passwordChanged = false }: AdminLoginProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});
  const [loading, setLoading] = useState(false);

  function focusField(fieldErrorsToFocus: AdminFieldErrors) {
    const firstField = Object.keys(fieldErrorsToFocus)[0];
    if (firstField) document.getElementById(`admin-${firstField}`)?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = adminLoginSchema.safeParse({
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      const errors = validationFieldErrors(parsed.error);
      setFieldErrors(errors);
      focusField(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
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
        payload.data.user.must_change_password ? "/painel/trocar-senha" : "/painel",
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
      <form className={styles.form} onSubmit={submit} noValidate>
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
            aria-invalid={fieldErrors.email ? "true" : undefined}
            aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p className={styles.fieldError} id="admin-email-error" role="alert">
              {fieldErrors.email[0]}
            </p>
          ) : null}
        </div>
        <PasswordField
          id="admin-password"
          name="password"
          label="Senha"
          required
          autoComplete="current-password"
          error={fieldErrors.password?.[0]}
        />
        <div className={styles.actions}>
          <button className="button" disabled={loading} type="submit">
            {loading ? "ENTRANDO…" : "ENTRAR"}
          </button>
        </div>
      </form>
    </div>
  );
}

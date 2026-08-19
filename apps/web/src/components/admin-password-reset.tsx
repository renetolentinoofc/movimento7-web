"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  adminPasswordResetConfirmSchema,
  adminPasswordResetRequestSchema,
  apiErrorMessage,
  readApiEnvelope,
  validationFieldErrors,
  type AdminFieldErrors,
} from "@/lib/admin-auth";

import styles from "./admin-auth-form.module.css";
import { PasswordField } from "./password-field";

export function AdminPasswordResetRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEmailError("");
    const form = new FormData(event.currentTarget);
    const parsed = adminPasswordResetRequestSchema.safeParse({
      email: String(form.get("email") ?? "").trim().toLowerCase(),
    });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Informe um e-mail válido.");
      document.getElementById("reset-email")?.focus();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/auth/password-reset/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await readApiEnvelope<{ accepted: boolean; message: string }>(response);
      if (!response.ok || !payload?.data) {
        setError(apiErrorMessage(payload, "Não foi possível solicitar a recuperação."));
        return;
      }
      setAccepted(true);
    } catch {
      setError("Não foi possível conectar ao serviço de autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel}>
      {accepted ? (
        <div className={styles.notice} role="status">
          Se a conta existir, enviamos um link de uso único. Confira também a pasta de spam.
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.field}>
            <label htmlFor="reset-email">E-mail da conta</label>
            <input id="reset-email" name="email" type="email" autoComplete="email" aria-invalid={emailError ? "true" : undefined} aria-describedby={emailError ? "reset-email-error" : undefined} />
            {emailError ? <p className={styles.fieldError} id="reset-email-error">{emailError}</p> : null}
          </div>
          <div className={styles.actions}>
            <button className="button" disabled={loading} type="submit">{loading ? "ENVIANDO…" : "ENVIAR LINK SEGURO"}</button>
          </div>
        </form>
      )}
      <p><Link href="/painel/login">Voltar ao login</Link></p>
    </div>
  );
}

export function AdminPasswordResetConfirm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const parsed = adminPasswordResetConfirmSchema.safeParse({
      new_password: String(form.get("new_password") ?? ""),
      password_confirmation: String(form.get("password_confirmation") ?? ""),
    });
    if (!parsed.success) {
      const fields = validationFieldErrors(parsed.error);
      setFieldErrors(fields);
      document.getElementById(`reset-${Object.keys(fields)[0]}`)?.focus();
      return;
    }
    if (!token) {
      setError("O link de recuperação está incompleto. Solicite um novo link.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/auth/password-reset/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...parsed.data }),
      });
      const payload = await readApiEnvelope<{ changed: boolean }>(response);
      if (!response.ok || !payload?.data) {
        setFieldErrors(payload?.error?.fields ?? {});
        setError(apiErrorMessage(payload, "Não foi possível redefinir a senha."));
        return;
      }
      router.replace("/painel/login?status=password-reset");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao serviço de autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={submit} noValidate>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <PasswordField id="reset-new_password" name="new_password" label="Nova senha" autoComplete="new-password" required error={fieldErrors.new_password?.[0]} hint="Use pelo menos 12 caracteres." />
        <PasswordField id="reset-password_confirmation" name="password_confirmation" label="Confirme a nova senha" autoComplete="new-password" required error={fieldErrors.password_confirmation?.[0]} />
        <div className={styles.actions}>
          <button className="button" disabled={loading || !token} type="submit">{loading ? "SALVANDO…" : "REDEFINIR SENHA"}</button>
        </div>
      </form>
      {!token ? <p><Link href="/painel/esqueci-senha">Solicitar novo link</Link></p> : null}
    </div>
  );
}

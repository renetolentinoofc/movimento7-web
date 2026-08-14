"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentPropsWithoutRef } from "react";

import styles from "./admin-auth-form.module.css";

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function PasswordField({
  id,
  label,
  error,
  hint,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordControl}>
        <input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
        />
        <button
          className={styles.passwordToggle}
          type="button"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

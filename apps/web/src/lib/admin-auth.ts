import type { Envelope } from "@/lib/api";
import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const adminChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual."),
    new_password: z.string().min(12, "A nova senha precisa ter 12 ou mais caracteres."),
    password_confirmation: z.string().min(1, "Confirme a nova senha."),
  })
  .superRefine((values, context) => {
    if (values.new_password === values.current_password) {
      context.addIssue({
        code: "custom",
        message: "A nova senha deve ser diferente da senha atual.",
        path: ["new_password"],
      });
    }
    if (values.new_password !== values.password_confirmation) {
      context.addIssue({
        code: "custom",
        message: "As novas senhas não conferem.",
        path: ["password_confirmation"],
      });
    }
  });

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;
export type AdminChangePasswordValues = z.infer<typeof adminChangePasswordSchema>;
export type AdminFieldErrors = Record<string, string[]>;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  must_change_password: boolean;
};

export type AdminSessionData = {
  user: AdminUser;
  csrf_token: string;
};

export async function readApiEnvelope<T>(response: Response): Promise<Envelope<T> | null> {
  try {
    return (await response.json()) as Envelope<T>;
  } catch {
    return null;
  }
}

export function apiErrorMessage<T>(
  payload: Envelope<T> | null,
  fallback = "Não foi possível concluir a operação.",
): string {
  return payload?.error?.message ?? fallback;
}

export function validationFieldErrors(error: z.ZodError): AdminFieldErrors {
  return error.issues.reduce<AdminFieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    errors[field] = [...(errors[field] ?? []), issue.message];
    return errors;
  }, {});
}

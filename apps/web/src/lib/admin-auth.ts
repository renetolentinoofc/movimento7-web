import type { Envelope } from "@/lib/api";

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

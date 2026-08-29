export type ApiError = { code: string; message: string; fields: Record<string, string[]> };
export type Envelope<T> = { data: T | null; meta: Record<string, unknown>; error: ApiError | null; request_id: string | null };

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const response = await fetch(path, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  let payload: Envelope<T>;
  try {
    payload = await response.json() as Envelope<T>;
  } catch {
    throw new Error("Resposta inválida da API");
  }
  if (!response.ok && !payload.error) throw new Error("Resposta inválida da API");
  return payload;
}

export function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiErrorMessage, readApiEnvelope } from "@/lib/admin-auth";

type Data = {
  counts: Record<string, number>;
  low_stock: { sku: string; available: number }[];
};

export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch("/api/v1/admin/dashboard", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readApiEnvelope<Data>(response);

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (response.status === 403 && payload?.error?.code === "password_change_required") {
          router.replace("/admin/trocar-senha");
          return;
        }
        if (response.ok && payload?.data) {
          setData(payload.data);
          return;
        }
        setError(apiErrorMessage(payload, "Não foi possível carregar o painel."));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("API indisponível.");
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [router]);

  if (error) {
    return (
      <div className="error-summary" role="alert">
        {error} <Link href="/admin/login">Entrar</Link>
      </div>
    );
  }
  if (!data) return <p role="status">Carregando indicadores…</p>;

  return (
    <div className="grid cards">
      {Object.entries(data.counts).map(([key, value]) => (
        <article className="card" key={key}>
          <p className="muted">{key.replaceAll("_", " ")}</p>
          <h2 style={{ fontSize: "3rem" }}>{value}</h2>
        </article>
      ))}
    </div>
  );
}

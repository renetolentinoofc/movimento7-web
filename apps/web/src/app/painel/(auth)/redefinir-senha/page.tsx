import { AdminPasswordResetConfirm } from "@/components/admin-password-reset";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const value = (await searchParams).token;
  const token = typeof value === "string" ? value : "";
  return (
    <section>
      <p className="eyebrow">Acesso restrito</p>
      <h1>Nova senha</h1>
      <p className="lead">Defina uma senha nova. Depois da troca, todas as sessões serão encerradas.</p>
      <AdminPasswordResetConfirm token={token} />
    </section>
  );
}

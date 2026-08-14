import { AdminLogin } from "@/components/admin-login";

type LoginPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function PanelLoginPage({ searchParams }: LoginPageProps) {
  const status = (await searchParams).status;

  return (
    <section>
      <p className="eyebrow">Acesso restrito</p>
      <h1>Painel</h1>
      <p className="lead">
        Use sua conta individual. Cinco tentativas inválidas em quinze minutos acionam
        limitação progressiva.
      </p>
      <AdminLogin passwordChanged={status === "password-changed"} />
    </section>
  );
}

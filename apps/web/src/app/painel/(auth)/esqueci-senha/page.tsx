import { AdminPasswordResetRequest } from "@/components/admin-password-reset";

export default function ForgotPasswordPage() {
  return (
    <section>
      <p className="eyebrow">Acesso restrito</p>
      <h1>Recuperar senha</h1>
      <p className="lead">Enviaremos um link de uso único, válido por 30 minutos.</p>
      <AdminPasswordResetRequest />
    </section>
  );
}

import { AdminChangePassword } from "@/components/admin-change-password";

export default function ChangePasswordPage() {
  return (
    <section>
      <p className="eyebrow">Segurança da conta</p>
      <h1>Trocar senha</h1>
      <p className="lead">
        No primeiro acesso, defina uma senha pessoal antes de abrir os módulos do painel.
        Ao concluir, você deverá entrar novamente.
      </p>
      <AdminChangePassword />
    </section>
  );
}

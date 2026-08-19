import { notFound } from "next/navigation";

import { AdminCommunications } from "@/components/admin-communications";
import { AdminEditions } from "@/components/admin-editions";
import { AdminProfiles } from "@/components/admin-profiles";
import { AdminRegistrations } from "@/components/admin-registrations";
import { PANEL_MODULE_DETAILS } from "@/lib/panel-modules";

export default async function PanelModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const moduleSlug = (await params).module;
  const item = PANEL_MODULE_DETAILS[moduleSlug];
  if (!item) notFound();

  if (moduleSlug === "inscricoes") return <AdminRegistrations />;
  if (moduleSlug === "perfis") return <AdminProfiles />;
  if (moduleSlug === "edicoes") return <AdminEditions />;
  if (moduleSlug === "comunicacao") return <AdminCommunications />;

  return (
    <>
      <p className="eyebrow">Painel</p>
      <h1>{item.title}</h1>
      <p className="lead">{item.description}</p>
      <div className="empty">
        Nenhum registro carregado. A interface nunca cria conteúdo de produção fictício.
      </div>
    </>
  );
}

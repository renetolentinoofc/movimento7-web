import { notFound } from "next/navigation";

import { PANEL_MODULE_DETAILS } from "@/lib/panel-modules";

export default async function PanelModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const item = PANEL_MODULE_DETAILS[(await params).module];
  if (!item) notFound();

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

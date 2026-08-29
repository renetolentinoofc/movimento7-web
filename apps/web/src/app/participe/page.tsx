import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import pageStyles from "@/components/public-page.module.css";
import { RegistrationForm } from "@/components/registration-form";
import { contentText, loadSite } from "@/components/home/home-data";

export const metadata: Metadata = { title: "Participe", description: "Faça parte do Movimento 7.", alternates: { canonical: "/participe" } };

export default async function ParticipatePage() {
  const site = await loadSite();
  return <>
    <PageHero eyebrow="Inscrições" title={contentText(site.content, "participate.title", "Faça parte do Movimento 7")} description={contentText(site.content, "participate.description", "Escolha sua categoria e apresente seu trabalho. A inscrição só é concluída quando o servidor exibe um protocolo.")} />
    <section className={pageStyles.contentSection}>
      <div className={`container ${pageStyles.formContainer}`}><RegistrationForm /></div>
    </section>
  </>;
}

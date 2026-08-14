import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import pageStyles from "@/components/public-page.module.css";
import { RegistrationForm } from "@/components/registration-form";

export const metadata: Metadata = { title: "Participe", description: "Faça parte do Movimento 7.", alternates: { canonical: "/participe" } };

export default function ParticipatePage() {
  return <>
    <PageHero eyebrow="Inscrições" title="Faça parte do Movimento 7" description="Escolha sua categoria e apresente seu trabalho. A inscrição só é concluída quando o servidor exibe um protocolo." />
    <section className={pageStyles.contentSection}>
      <div className={`container ${pageStyles.formContainer}`}><RegistrationForm /></div>
    </section>
  </>;
}

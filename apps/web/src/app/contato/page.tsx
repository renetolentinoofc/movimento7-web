import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import pageStyles from "@/components/public-page.module.css";

export const metadata: Metadata = { title: "Contato", alternates: { canonical: "/contato" } };

export default function ContactPage() {
  return <>
    <PageHero eyebrow="Contato" title="Fale com o Movimento" description="Os canais oficiais aparecem aqui quando forem configurados no painel. O formulário abaixo já gera um protocolo seguro." />
    <section className={pageStyles.contentSection}>
      <div className={`container ${pageStyles.formContainer}`}><ContactForm /></div>
    </section>
  </>;
}

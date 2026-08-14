import Image from "next/image";
import Link from "next/link";
import type { HomePartner } from "./home-data";
import styles from "./home.module.css";

export function Partners({ partners }: { partners: HomePartner[] }) {
  return <section id="parceiros" className={styles.partners} aria-labelledby="partners-title">
    <div className="container">
      <p className={styles.kickerTeal}>QUEM FORTALECE O MOVIMENTO 7</p>
      <div className={styles.partnerHeading}>
        <h2 id="partners-title">Parceiros</h2>
        <Link href="/parceiros">Conheça nossa rede</Link>
      </div>
      <div className={styles.partnerGrid}>
        {partners.map((partner) => {
          const logo = <Image src={partner.logo_path} alt={partner.logo_alt || `Logo ${partner.name}`} width={520} height={520} sizes="(max-width: 560px) 42vw, 18vw" />;
          return <div className={`${styles.partnerLogo} ${partner.slug === "garagem-dos-antigos" ? styles.darkLogo : ""}`} key={partner.slug}>
            {partner.website_url ? <a href={partner.website_url} rel="noopener noreferrer" target="_blank" aria-label={`${partner.name}, abre em nova aba`}>{logo}</a> : logo}
          </div>;
        })}
      </div>
    </div>
  </section>;
}

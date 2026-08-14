import type { ReactNode } from "react";
import styles from "./page-hero.module.css";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  const titleClassName = `${styles.title} ${title.length > 24 ? styles.longTitle : ""}`;

  return (
    <section className={styles.hero} aria-labelledby="page-title">
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="page-title" className={titleClassName}>
          {title}
        </h1>
        <p className={styles.description}>{description}</p>
        {children && <div className={styles.supporting}>{children}</div>}
      </div>
    </section>
  );
}

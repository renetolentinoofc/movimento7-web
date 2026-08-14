import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export function Hero() {
  return <section id="sobre" className={styles.hero} aria-labelledby="hero-title">
    <div className={styles.heroCopy}>
      <div className={styles.heroCopyInner}>
        <p className={styles.kickerDark}>CULTURA, ARTE &amp; BELEZA</p>
        <h1 id="hero-title"><span>Um movimento</span><span>que transforma.</span></h1>
        <p>O Movimento 7 é uma plataforma de desenvolvimento cultural que conecta pessoas, revela talentos e cria oportunidades por meio da arte, da cultura urbana, da beleza e do empreendedorismo.</p>
        <div className={styles.heroActions}>
          <Link className={styles.buttonDark} href="#programacao">Conheça o festival <ArrowRight aria-hidden /></Link>
          <Link className={styles.buttonOutlineDark} href="/loja">Conheça a coleção</Link>
        </div>
      </div>
    </div>
    <div className={styles.heroVisual}>
      <span className={styles.heroCircle} aria-hidden />
      <span className={styles.heroStripe} aria-hidden />
      <Image
        className={styles.heroPerson}
        src="/assets/images/home/colecao-cropped-mov7.webp"
        alt="Modelo veste cropped da coleção Movimento 7"
        width={1130}
        height={1392}
        sizes="(max-width: 800px) 100vw, 50vw"
        priority
      />
      <div className={styles.editionBadge} aria-label="Edição 01, Belo Horizonte">
        <span>EDIÇÃO</span><strong>01</strong><small>BELO HORIZONTE</small>
      </div>
    </div>
  </section>;
}

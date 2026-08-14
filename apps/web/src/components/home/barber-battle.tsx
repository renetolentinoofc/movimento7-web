import { ArrowRight, Scissors, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export function BarberBattle() {
  return <section id="programacao" className={styles.barber} aria-labelledby="barber-title">
    <div className={`container ${styles.split}`}>
      <div className={styles.barberCopy}>
        <p className={styles.kickerYellow}>EDIÇÃO 01 <span aria-hidden>•</span> INSCRIÇÕES ABERTAS</p>
        <h2 id="barber-title">Batalha de<br /><span>Barbeiros</span></h2>
        <p className={styles.sectionLead}>Coloque sua técnica à prova e faça parte de uma celebração que valoriza talento, identidade e excelência.</p>
        <ul className={styles.modalities} aria-label="Modalidades">
          <li><Scissors aria-hidden /><span><small>MODALIDADE 01</small><strong>Corte livre</strong></span></li>
          <li><Sparkles aria-hidden /><span><small>MODALIDADE 02</small><strong>Reflexo alinhado</strong></span></li>
        </ul>
        <Link className={styles.buttonYellow} href="/participe?categoria=barbeiro">Inscreva-se agora <ArrowRight aria-hidden /></Link>
      </div>
      <div className={styles.barberArt}>
        <span className={styles.goldGlow} aria-hidden />
        <div className={styles.barberImageFrame}>
          <Image src="/assets/images/home/batalha-dos-barbeiros.webp" alt="Identidade visual oficial da Batalha dos Barbeiros" width={1200} height={1061} sizes="(max-width: 760px) 86vw, 42vw" />
        </div>
        <p><strong>Talento.</strong> Técnica. Identidade.</p>
      </div>
    </div>
  </section>;
}

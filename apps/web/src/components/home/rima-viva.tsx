import { Mic2, Music2, Paintbrush } from "lucide-react";
import Image from "next/image";
import styles from "./home.module.css";

const activities = [
  { label: "Batalha de MCs", Icon: Mic2 },
  { label: "Batalha de dança", Icon: Music2 },
  { label: "Grafite ao vivo", Icon: Paintbrush }
];

export function RimaViva() {
  return <section id="rima-viva" className={styles.rima} aria-labelledby="rima-title">
    <div className={`container ${styles.rimaGrid}`}>
      <div className={styles.rimaArt}>
        <span className={styles.purpleGlow} aria-hidden />
        <Image src="/assets/images/home/rima-viva.webp" alt="Identidade visual oficial do Rima Viva Crew" width={1200} height={1085} sizes="(max-width: 760px) 90vw, 44vw" />
      </div>
      <div className={styles.rimaCopy}>
        <p className={styles.kickerPurple}>APRESENTAÇÃO CONFIRMADA</p>
        <h2 id="rima-title">Rima <span>Viva</span></h2>
        <p className={styles.sectionLead}>O Rima Viva Crew chega com muita energia para fortalecer a cultura de rua e abrir espaço para novas vozes.</p>
        <ul className={styles.activities}>
          {activities.map(({ label, Icon }) => <li key={label}><Icon aria-hidden /><span>{label}</span></li>)}
        </ul>
        <p className={styles.rimaClose}>Cultura. Resistência. Arte.</p>
      </div>
    </div>
  </section>;
}

import Image from "next/image";
import Link from "next/link";
import styles from "./site-footer.module.css";

const navigation = [
  ["/", "Início"],
  ["/#sobre", "Sobre"],
  ["/#programacao", "Programação"],
  ["/loja", "Loja"],
  ["/leilao", "Leilão"],
  ["/contato", "Contato"]
];

export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={`container ${styles.grid}`}>
      <div className={styles.about}>
        <Image src="/brand/logo-movimento7.webp" alt="Movimento 7" width={640} height={640} sizes="112px" />
        <p>Uma plataforma de desenvolvimento cultural que conecta pessoas, revela talentos e cria oportunidades.</p>
      </div>
      <nav aria-label="Navegação do rodapé">
        <h2>Navegação</h2>
        <ul>{navigation.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
      </nav>
      <div>
        <h2>Encontre o movimento</h2>
        <p>Belo Horizonte — MG</p>
        <p><Link href="/contato">Fale com a equipe</Link></p>
        <p><Link href="/movimento-7">Galeria Movimento 7</Link></p>
      </div>
      <nav aria-label="Informações legais">
        <h2>Transparência</h2>
        <ul>
          <li><Link href="/privacidade">Privacidade</Link></li>
          <li><Link href="/termos-de-servico">Termos de serviço</Link></li>
          <li><Link href="/acessibilidade">Acessibilidade</Link></li>
        </ul>
      </nav>
    </div>
    <div className={`container ${styles.bottom}`}>
      <p>© {new Date().getFullYear()} Movimento 7. Todos os direitos reservados.</p>
      <Link href="/saude">Status do serviço</Link>
    </div>
  </footer>;
}

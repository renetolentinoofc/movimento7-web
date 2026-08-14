"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./site-header.module.css";

const links = [
  ["/", "INÍCIO"],
  ["/#sobre", "SOBRE"],
  ["/#programacao", "PROGRAMAÇÃO"],
  ["/loja", "LOJA"],
  ["/leilao", "LEILÃO"],
  ["/contato", "CONTATO"]
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();

    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = nav.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (pathname === "/painel" || pathname.startsWith("/painel/")) return null;

  return <header className={styles.header}>
    <div className={`container ${styles.bar}`}>
      <Link className={styles.brand} href="/" aria-label="Movimento 7 — início">
        <Image src="/brand/logo-movimento7-edicao-01.webp" alt="" width={1024} height={1024} priority sizes="(max-width: 1100px) 124px, 170px" />
      </Link>
      <button ref={toggle} className={styles.toggle} type="button" aria-expanded={open} aria-controls="main-nav" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      {open && <button className={styles.scrim} type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <nav ref={nav} id="main-nav" aria-label="Principal" className={`${styles.nav} ${open ? styles.open : ""}`}>
        {links.map(([href, label], index) => <Link onClick={() => setOpen(false)} ref={index === 0 ? firstLink : undefined} key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
        <Link onClick={() => setOpen(false)} className={styles.cta} href="/participe">QUERO PARTICIPAR</Link>
      </nav>
    </div>
  </header>;
}

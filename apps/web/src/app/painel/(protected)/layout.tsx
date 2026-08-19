import Link from "next/link";

import { AdminLogout } from "@/components/admin-logout";
import { PANEL_MODULES } from "@/lib/panel-modules";

import styles from "../painel.module.css";

export default function ProtectedPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className="eyebrow">Painel</p>
        <nav aria-label="Módulos administrativos">
          {PANEL_MODULES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={slug ? `/painel/${slug}` : "/painel"}
              prefetch={false}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <AdminLogout />
        </div>
      </aside>
      <div className={styles.content}>
        {children}
        <footer className="muted">
          Versão {process.env.APP_VERSION ?? "local"} · commit{" "}
          {process.env.GIT_COMMIT ?? process.env.RENDER_GIT_COMMIT ?? "local"}
        </footer>
      </div>
    </div>
  );
}

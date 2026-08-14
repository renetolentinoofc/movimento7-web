import styles from "../painel.module.css";

export default function PanelAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authShell}>
      <div className={styles.authContent}>{children}</div>
    </div>
  );
}

import { Suspense } from "react";
import { PrivacyConfirmation } from "@/components/privacy-confirmation";

export default function PrivacyConfirmationPage() {
  return <Suspense fallback={<section className="section"><div className="container"><p className="lead">Confirmando sua solicitação…</p></div></section>}><PrivacyConfirmation /></Suspense>;
}

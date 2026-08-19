"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import styles from "./public-form.module.css";

const categories = [
  ["barbeiro", "Barbeiro"], ["mc", "MC"], ["artista", "Artista"], ["trancista", "Trancista"],
  ["skatista", "Skatista"], ["grafiteiro", "Grafiteiro"], ["marca-moda", "Marca / Moda"],
  ["empreendedor", "Empreendedor"], ["dj", "DJ"], ["gastronomia", "Gastronomia"],
  ["projeto-social", "Projeto social"]
] as const;

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome.").max(140),
  professional_name: z.string().trim().max(140),
  email: z.email("Informe um e-mail válido.").max(180),
  phone: z.string().min(10, "Informe um WhatsApp com DDD."),
  instagram: z.string().max(100),
  city: z.string().trim().min(2, "Informe sua cidade.").max(120),
  category: z.string().min(1, "Escolha uma categoria."),
  presentation: z.string().trim().min(20, "Conte um pouco mais sobre seu trabalho.").max(3000),
  portfolio_url: z.union([z.literal(""), z.url("Use um link completo iniciado por http:// ou https://.")]),
  privacy_accepted: z.literal(true, { error: "Você precisa aceitar a política de privacidade." }),
  fax_number_for_bots: z.string().max(0),
  save_draft: z.boolean()
});
type Values = z.infer<typeof schema>;
type Created = { protocol: string; category: string; professional_name?: string; upload_token: string; notification_status: string };

export function RegistrationForm() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Created | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, control, formState: { errors, isDirty, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", professional_name: "", email: "", phone: "", instagram: "", city: "", category: "", presentation: "", portfolio_url: "", privacy_accepted: false as true, fax_number_for_bots: "", save_draft: false }
  });
  const saveDraft = useWatch({ control, name: "save_draft", defaultValue: false });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (isDirty && !result) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, result]);
  useEffect(() => { if (Object.keys(errors).length) summary.current?.focus(); }, [errors]);
  useEffect(() => {
    if (!saveDraft) sessionStorage.removeItem("m7-registration-draft");
  }, [saveDraft]);

  async function upload(protocol: string, token: string) {
    if (!file) return;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/v1/registrations/${encodeURIComponent(protocol)}/files`);
      xhr.setRequestHeader("X-Upload-Token", token);
      xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Falha no upload"));
      xhr.onerror = () => reject(new Error("Falha de rede"));
      const body = new FormData(); body.append("file", file); xhr.send(body);
    });
  }

  async function submitValues(values: Values) {
    setServerError(null); setProgress(0);
    if (values.save_draft) sessionStorage.setItem("m7-registration-draft", JSON.stringify({ professional_name: values.professional_name, city: values.city, category: values.category }));
    const payload = await apiRequest<Created>("/api/v1/registrations", { method: "POST", body: JSON.stringify({ ...values, privacy_version: "2026-08-draft" }) });
    if (payload.error) {
      Object.entries(payload.error.fields).forEach(([name, messages]) => setError(name as keyof Values, { message: messages[0] }));
      setServerError(payload.error.message); summary.current?.focus(); return;
    }
    if (!payload.data) return;
    try { await upload(payload.data.protocol, payload.data.upload_token); }
    catch { setServerError("A inscrição foi salva, mas o arquivo não terminou de enviar. Guarde o protocolo e tente o contato."); }
    setResult(payload.data); sessionStorage.removeItem("m7-registration-draft");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(submitValues, () => summary.current?.focus())(event);
  }

  if (result) return <div className="success" role="status"><h2>Inscrição recebida</h2><p>Protocolo: <strong>{result.protocol}</strong></p><p>Categoria: {result.category}. Guarde este código para atendimento.</p>{progress > 0 && <p>Portfólio: {progress}% enviado.</p>}</div>;
  return <form className={`form ${styles.form}`} onSubmit={submit} noValidate>
    {(serverError || Object.keys(errors).length > 0) && <div className="error-summary" role="alert" tabIndex={-1} ref={summary}><strong>Não foi possível enviar ainda.</strong><p>{serverError ?? "Revise os campos destacados."}</p></div>}
    <div className="field"><label htmlFor="full_name">Nome completo</label><input id="full_name" autoComplete="name" aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? "full_name-error" : undefined} {...register("full_name")} />{errors.full_name && <p className="error" id="full_name-error">{errors.full_name.message}</p>}</div>
    <div className="field"><label htmlFor="professional_name">Nome artístico ou profissional</label><input id="professional_name" {...register("professional_name")} /></div>
    <div className="field"><label htmlFor="registration_email">E-mail</label><input id="registration_email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "registration-email-error" : "registration-email-help"} {...register("email")} /><small id="registration-email-help" className="muted">Enviaremos o protocolo e as atualizações da seleção para este endereço.</small>{errors.email && <p className="error" id="registration-email-error">{errors.email.message}</p>}</div>
    <div className={styles.row}><div className="field"><label htmlFor="phone">WhatsApp</label><input id="phone" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : "phone-help"} {...register("phone")} /><small id="phone-help" className="muted">Inclua DDD. Ex.: (71) 99999-9999.</small>{errors.phone && <p className="error" id="phone-error">{errors.phone.message}</p>}</div><div className="field"><label htmlFor="instagram">Instagram</label><input id="instagram" autoCapitalize="none" {...register("instagram")} /><small className="muted">Pode informar apenas o @.</small></div></div>
    <div className={styles.row}><div className="field"><label htmlFor="city">Cidade</label><input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />{errors.city && <p className="error">{errors.city.message}</p>}</div><div className="field"><label htmlFor="category">Categoria</label><select id="category" aria-invalid={!!errors.category} {...register("category")}><option value="">Selecione</option>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{errors.category && <p className="error">{errors.category.message}</p>}</div></div>
    <div className="field"><label htmlFor="presentation">Breve apresentação</label><textarea id="presentation" aria-invalid={!!errors.presentation} {...register("presentation")} />{errors.presentation && <p className="error">{errors.presentation.message}</p>}</div>
    <div className="field"><label htmlFor="portfolio_url">Link de portfólio</label><input id="portfolio_url" type="url" inputMode="url" {...register("portfolio_url")} />{errors.portfolio_url && <p className="error">{errors.portfolio_url.message}</p>}</div>
    <div className="field"><label htmlFor="portfolio_file">Foto ou portfólio (JPG, PNG ou WebP, até 10 MB)</label><input id="portfolio_file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} />{file && <small className="muted">Selecionado: {file.name} ({Math.ceil(file.size / 1024)} KB)</small>}{progress > 0 && <progress value={progress} max="100" aria-label={`Upload ${progress}%`}>{progress}%</progress>}</div>
    <label className={styles.checkbox}><input type="checkbox" {...register("save_draft")} /><span>Guardar neste aparelho apenas nome profissional, cidade e categoria enquanto preencho.</span></label>
    <label className={styles.checkbox}><input id="privacy_accepted" type="checkbox" aria-invalid={!!errors.privacy_accepted} aria-describedby={errors.privacy_accepted ? "privacy-error" : undefined} {...register("privacy_accepted")} /><span>Li a <a href="/privacidade" target="_blank" rel="noopener noreferrer">política de privacidade</a> e autorizo o uso dos dados para inscrição e seleção.</span></label>{errors.privacy_accepted && <p className="error" id="privacy-error">{errors.privacy_accepted.message}</p>}
    <div className={styles.honeypot} aria-hidden="true"><label htmlFor="registration-fax">Não preencha</label><input id="registration-fax" tabIndex={-1} autoComplete="off" {...register("fax_number_for_bots")} /></div>
    <button className={`button ${styles.submit}`} type="submit" disabled={isSubmitting}>{isSubmitting ? "ENVIANDO…" : "ENVIAR INSCRIÇÃO"}</button>
  </form>;
}

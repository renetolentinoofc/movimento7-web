import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactForm } from "./contact-form";
import { RegistrationForm } from "./registration-form";

afterEach(cleanup);

function expectHiddenHoneypot(container: HTMLElement, fieldName: string) {
  const input = container.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
  expect(input).not.toBeNull();
  expect(input).toHaveAttribute("tabindex", "-1");
  expect(input).toHaveAttribute("autocomplete", "off");
  expect(input?.parentElement).toHaveAttribute("aria-hidden", "true");
  expect(input?.parentElement?.className).toMatch(/honeypot/);
}

describe("formulários públicos", () => {
  it("mantém o honeypot do contato fora da navegação e da árvore acessível", () => {
    const { container } = render(<ContactForm />);
    expectHiddenHoneypot(container, "website");
    expect(screen.queryByRole("textbox", { name: "Não preencha" })).not.toBeInTheDocument();
  });

  it("mantém o honeypot da inscrição e oferece áreas de consentimento identificáveis", () => {
    const { container } = render(<RegistrationForm />);
    expectHiddenHoneypot(container, "website");
    expect(screen.getByRole("checkbox", { name: /Guardar neste aparelho/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /política de privacidade/ })).toBeInTheDocument();
  });
});

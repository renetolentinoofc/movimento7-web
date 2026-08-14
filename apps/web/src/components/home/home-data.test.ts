import { describe, expect, it } from "vitest";
import { mergePartners, type HomePartner } from "./home-data";

describe("mergePartners", () => {
  it("mantém parceiros iniciais sem duplicar os recebidos da API", () => {
    const fromApi: HomePartner = {
      slug: "baianao-carnes",
      name: "Baianão Carnes",
      logo_path: "/media/baianao.webp",
      logo_alt: "Baianão atualizado"
    };
    const partners = mergePartners([fromApi]);

    expect(partners.filter(({ slug }) => slug === "baianao-carnes")).toHaveLength(1);
    expect(partners.find(({ slug }) => slug === "baianao-carnes")?.logo_path).toBe("/media/baianao.webp");
    expect(partners.map(({ slug }) => slug)).toEqual(expect.arrayContaining(["adega-do-jogador", "garagem-dos-antigos"]));
  });

  it("preserva parceiros adicionais cadastrados", () => {
    const extra: HomePartner = { slug: "novo-apoiador", name: "Novo apoiador", logo_path: "/logo.webp", logo_alt: "Logo do novo apoiador" };
    expect(mergePartners([extra])).toContainEqual(extra);
  });
});

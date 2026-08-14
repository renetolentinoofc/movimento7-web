import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHero } from "./page-hero";

afterEach(cleanup);

describe("PageHero", () => {
  it("mantém um único título e associa a seção a ele", () => {
    render(<PageHero eyebrow="Loja" title="Vista o Movimento" description="Coleção limitada." />);
    const title = screen.getByRole("heading", { level: 1, name: "Vista o Movimento" });
    expect(title).toHaveAttribute("id", "page-title");
    expect(title.closest("section")).toHaveAttribute("aria-labelledby", "page-title");
  });
});

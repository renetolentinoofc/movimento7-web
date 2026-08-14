import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MediaImage } from "./media-image";

afterEach(cleanup);

describe("MediaImage", () => {
  it("preserva a URL absoluta fornecida pelo provedor de mídia", () => {
    render(<MediaImage src="https://media.example.test/obra.webp" alt="Obra publicada" width={800} height={600} />);
    expect(screen.getByRole("img", { name: "Obra publicada" })).toHaveAttribute("src", "https://media.example.test/obra.webp");
  });

  it("mantém dimensões explícitas para reservar o espaço da imagem", () => {
    render(<MediaImage src="/brand/logo-movimento7-edicao-01.webp" alt="Movimento 7" width={1024} height={1024} />);
    const image = screen.getByRole("img", { name: "Movimento 7" });
    expect(image).toHaveAttribute("width", "1024");
    expect(image).toHaveAttribute("height", "1024");
  });
});

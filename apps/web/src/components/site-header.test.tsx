import { cleanup,render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach,vi,describe,it,expect } from "vitest";
vi.mock("next/navigation",()=>({usePathname:()=>"/"}));
import { SiteHeader } from "./site-header";

describe("SiteHeader",()=>{
  afterEach(() => { cleanup(); document.body.style.overflow = ""; });

  it("abre e fecha o menu móvel por teclado",async()=>{
    const user=userEvent.setup();
    render(<SiteHeader/>);
    const button=screen.getByRole("button",{name:"Abrir menu"});
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded","true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("link",{name:"INÍCIO"})).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded","false");
    expect(button).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("fecha o menu depois de selecionar uma rota",async()=>{
    const user=userEvent.setup();
    render(<SiteHeader/>);
    const button=screen.getByRole("button",{name:"Abrir menu"});
    await user.click(button);
    const storeLink = screen.getByRole("link", { name: "LOJA" });
    storeLink.addEventListener("click", event => event.preventDefault(), { once: true });
    await user.click(storeLink);
    expect(button).toHaveAttribute("aria-expanded","false");
  });
});

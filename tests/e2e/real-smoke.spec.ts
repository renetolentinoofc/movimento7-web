import { expect, test } from "@playwright/test";

test.describe("smoke com serviços reais", () => {
  test.skip(!process.env.E2E_REAL, "Execute com E2E_REAL=1 após subir API, banco e Next.");

  test("frontend confirma saúde da API", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe("ok\n");
  });

  test("navega no catálogo real sem interceptar requisições", async ({ page }) => {
    await page.goto("/loja");
    await expect(page.getByRole("heading", { name: "Vista o Movimento" })).toBeVisible();
  });

  test("abre o formulário público LGPD real", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(page.getByRole("heading", { name: "Seus dados, com propósito" })).toBeVisible();
    await expect(page.getByRole("button", { name: /solicitar/i })).toBeVisible();
  });
});

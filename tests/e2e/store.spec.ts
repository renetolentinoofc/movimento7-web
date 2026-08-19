import { expect, test } from "@playwright/test";

const envelope = (data: unknown) => ({ data, meta: {}, error: null, request_id: "e2e-store" });

test("abre a vitrine pública da loja", async ({ page }) => {
  await page.goto("/loja");
  await expect(page.getByRole("heading", { name: "Vista o Movimento" })).toBeVisible();
  await expect(page.getByText("Entrega, trocas e privacidade da loja")).toBeVisible();
});

test("conclui o fluxo de carrinho, cotação de frete e checkout", async ({ page }) => {
  await page.route("**/api/cart", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({
        items: [{ variant_id: "variant-1", product_slug: "cropped-teste", product_name: "Cropped Teste", variant_name: "M · Preto", unit_price_cents: 10000, quantity: 1, available_quantity: 4 }],
        subtotal_cents: 10000,
      })),
    });
  });
  await page.route("**/api/shipping/quote", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({ label: "Entrega padrão", shipping_cents: 1500, total_cents: 11500, estimated_days: 5, free_shipping: false })),
    });
  });
  await page.route("**/api/checkout", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(envelope({ order_code: "PED-E2E-001", access_token: "token-e2e", total_cents: 11500, shipping_cents: 1500 })),
    });
  });

  await page.goto("/carrinho");
  await expect(page.getByRole("heading", { name: "Cropped Teste" })).toBeVisible();
  await page.getByRole("link", { name: "INICIAR CHECKOUT" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel("Nome").fill("Cliente E2E");
  await page.getByLabel("E-mail").fill("cliente-e2e@example.test");
  await page.getByLabel("WhatsApp").fill("11999999999");
  await page.getByLabel("Destinatário").fill("Cliente E2E");
  await page.getByLabel("CEP").fill("01001000");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("UF").blur();
  await expect(page.getByText("Frete:")).toBeVisible();
  await expect(page.getByText("R$ 15,00")).toBeVisible();
  await page.getByLabel("Rua").fill("Rua E2E");
  await page.getByLabel("Número").fill("10");
  await page.getByLabel("Bairro").fill("Centro");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("Li os termos, política de privacidade e informações de entrega.").check();
  await page.getByRole("button", { name: "CRIAR PEDIDO" }).click();
  await expect(page).toHaveURL(/\/pedido\/PED-E2E-001\?token=token-e2e$/);
});

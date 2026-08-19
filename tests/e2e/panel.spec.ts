import { expect, test, type Page } from "@playwright/test";

const envelope = (data: unknown) => ({
  data,
  meta: {},
  error: null,
  request_id: "e2e-test",
});

async function mockSession(page: Page) {
  await page.route("**/api/v1/admin/auth/session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ csrf_token: "csrf-e2e" })) });
  });
}

test("redireciona visitante sem sessão para o login", async ({ page }) => {
  await page.goto("/painel/galeria");
  await expect(page).toHaveURL(/\/painel\/login$/);
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
});

test("faz login e abre o painel", async ({ page, context }) => {
  await page.route("**/api/v1/admin/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Set-Cookie": "m7_session=e2e-session; Path=/; HttpOnly" },
      contentType: "application/json",
      body: JSON.stringify(envelope({ csrf_token: "csrf-e2e", user: { must_change_password: false } })),
    });
  });
  await page.route("**/api/v1/admin/dashboard", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope({ counts: { registrations: 4 }, low_stock: [] })) });
  });
  await page.goto("/painel/login");
  await page.getByLabel("E-mail").fill("admin@movimento7.com");
  await page.getByLabel("Senha").fill("senha-segura-e2e");
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  expect(await context.cookies()).toEqual(expect.arrayContaining([expect.objectContaining({ name: "m7_session" })]));
});

test("carrega a galeria do painel para o álbum selecionado", async ({ page, context }) => {
  await context.addCookies([{ name: "m7_session", value: "e2e-session", url: "http://127.0.0.1:3000" }]);
  await mockSession(page);
  await page.route("**/api/v1/admin/gallery/albums", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope([{ id: "album-1", title: "Edição 2026", slug: "edicao-2026", description: null, status: "draft" }])) });
  });
  await page.route("**/api/v1/admin/gallery/albums/album-1/media", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(envelope([{ id: "media-1", title: "Abertura", category: "Eventos", alt_text: "Abertura", width: 640, height: 480, status: "draft" }])) });
  });
  await page.goto("/painel/galeria");
  await expect(page.getByRole("heading", { name: "Galeria" })).toBeVisible();
  await expect(page.getByText("Abertura").first()).toBeVisible();
  await expect(page.getByText("Edição 2026")).toBeVisible();
});

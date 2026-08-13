# Movimento 7 Web

Frontend público e administrativo do Movimento 7, construído com Next.js, React e TypeScript. A aplicação consome a API Flask separada por meio de `INTERNAL_API_URL`.

## Desenvolvimento

Requer Node.js 24 ou superior.

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

Acesse `http://localhost:3000`.

## Variáveis

- `INTERNAL_API_URL`: origem completa da API Flask, sem barra final;
- `NEXT_PUBLIC_SITE_URL`: URL canônica pública do frontend;
- `APP_VERSION`: versão exibida no painel;
- `RENDER_GIT_COMMIT`: fornecida automaticamente pelo Render.

Nunca configure credenciais de banco, OAuth, senha administrativa ou `SECRET_KEY` neste serviço.

## Verificação

```bash
npm run lint
npm run typecheck
npm run test:web
npm run build
```

## Render

O `render.yaml` cria somente o serviço Next.js. Informe `INTERNAL_API_URL` e `NEXT_PUBLIC_SITE_URL` durante a criação do Blueprint. O build usa `npm ci --include=dev` porque TypeScript, ESLint e os tipos são necessários durante a compilação mesmo com `NODE_ENV=production`. O health check público é `/saude`.

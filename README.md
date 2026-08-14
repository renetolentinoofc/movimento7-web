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

## Painel administrativo

As rotas sob `/admin` exigem o cookie de sessão `HttpOnly`. Uma visita sem sessão é redirecionada
para `/admin/login`. No primeiro acesso, contas com troca obrigatória seguem para
`/admin/trocar-senha`; a alteração usa o token CSRF da sessão e termina todas as sessões anteriores.

O usuário inicial padrão é `admin@movimento7.com`; sua senha não existe no frontend e deve ser
definida com segurança no serviço da API. A configuração do primeiro usuário, o diagnóstico do
proxy e o exemplo de requisição manual estão em [docs/ACESSO_ADMIN.md](docs/ACESSO_ADMIN.md).

## Landing page

A página inicial é montada em `apps/web/src/components/home`. Cada bloco possui uma responsabilidade própria (apresentação, programação, Rima Viva, produtos, leilão e parceiros), com estilos compartilhados em `home.module.css`. Os tokens específicos da identidade Movimento 7 ficam em `packages/ui/src/tokens.css`.

As imagens otimizadas da landing estão organizadas em:

- `apps/web/public/assets/images/home`;
- `apps/web/public/assets/images/products`;
- `apps/web/public/assets/images/partners`.

Produtos, disponibilidade, valores e lotes publicados são carregados no servidor a partir de `INTERNAL_API_URL`, com revalidação de 60 segundos. Quando a API não possui produtos ou lotes publicados, a home mostra somente uma prévia editorial sem preço, estoque, data ou lance fictício; os CTAs continuam apontando para `/loja` e `/leilao`. A lista local inicial garante a exibição dos logotipos fornecidos mesmo durante uma indisponibilidade da API; parceiros cadastrados são combinados com essa lista, substituem dados do mesmo `slug` e são preservados sem duplicação.

O cabeçalho e o rodapé permanecem compartilhados por todas as rotas. As âncoras `#sobre` e `#programacao` são destinos reais da landing, enquanto inscrições, loja, leilão, contato, galeria e páginas legais usam as rotas existentes.

## Verificação

```bash
npm run lint
npm run typecheck
npm run test:web
npm run build
```

## Render

O `render.yaml` cria somente o serviço Next.js. Informe `INTERNAL_API_URL` e `NEXT_PUBLIC_SITE_URL` durante a criação do Blueprint. O build usa `npm ci --include=dev` porque TypeScript, ESLint e os tipos são necessários durante a compilação mesmo com `NODE_ENV=production`. Configure o health check do Render como `/api/health`; esse endpoint é mínimo e não renderiza React nem consulta a API. A página `/saude` continua exibindo o estado integrado para visitantes.

Não use um monitor externo a cada poucos segundos para impedir o repouso dos serviços Free. Dois serviços continuamente ativos ultrapassam a franquia mensal de 750 horas do workspace. Para disponibilidade contínua, use instâncias pagas e monitore a curva de memória na aba **Metrics** do Render.

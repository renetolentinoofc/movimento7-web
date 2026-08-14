# Primeiro acesso ao painel administrativo

## Configuração necessária no Render

O frontend e a API são serviços diferentes. No serviço `movimento7-web`, configure:

```text
INTERNAL_API_URL=https://movimento7.onrender.com
NEXT_PUBLIC_SITE_URL=https://movimento7.com.br
```

`INTERNAL_API_URL` é somente a origem da API, sem `/api/v1` e sem barra final. Depois de
alterar a variável, faça um novo deploy do frontend, pois os rewrites do Next.js são gerados
durante o build.

No serviço da API, a conexão com o Aiven permanece em `DATABASE_URL`. Para o primeiro seed de
um banco sem usuário administrativo, configure:

```text
PUBLIC_BASE_URL=https://movimento7.com.br
CORS_ORIGINS=https://movimento7.com.br
SESSION_COOKIE_SECURE=true
INITIAL_ADMIN_EMAIL=admin@movimento7.com
INITIAL_ADMIN_NAME=Administrador Movimento 7
INITIAL_ADMIN_PASSWORD=<senha-inicial-com-12-ou-mais-caracteres>
```

`CORS_ORIGINS` também é usado para validar a origem das mutações protegidas por CSRF. Se ele
permanecer em `http://localhost:3000`, o login poderá responder, mas a troca de senha em produção
será recusada com `origin_invalid`.

Não grave a senha em arquivo ou no Git. O comando `flask seed` cria esse usuário somente quando
a tabela `admin_users` ainda não possui nenhum usuário. Executar o seed novamente não redefine
uma senha existente.

## Fluxo pela interface

1. Abra `https://movimento7.com.br/painel`.
2. Sem cookie de sessão, a aplicação redireciona para `/painel/login`.
3. Entre com `admin@movimento7.com` e com o valor configurado em
   `INITIAL_ADMIN_PASSWORD` no primeiro seed.
4. Uma conta marcada para primeiro acesso é enviada automaticamente a
   `/painel/trocar-senha`.
5. Informe a senha inicial e uma nova senha com 12 ou mais caracteres.
6. A sessão é invalidada após a troca. Entre novamente com a nova senha.

O token CSRF existe somente em memória durante a tela de troca. A sessão continua em cookie
`HttpOnly`; nenhum token ou senha é salvo em `localStorage`.

## Requisição manual para diagnóstico

Use este fluxo apenas em uma máquina confiável. Substitua os marcadores sem publicar as senhas
em logs, tickets ou histórico compartilhado.

Primeiro, autentique e salve temporariamente o cookie retornado:

```bash
COOKIE_JAR="$(mktemp)"
curl --request POST 'https://movimento7.com.br/api/v1/admin/auth/login' \
  --header 'Content-Type: application/json' \
  --cookie-jar "$COOKIE_JAR" \
  --data '{"email":"admin@movimento7.com","password":"<SENHA_ATUAL>"}'
```

Copie o valor de `data.csrf_token` da resposta. Depois, envie a troca com o mesmo cookie:

```bash
curl --request POST 'https://movimento7.com.br/api/v1/admin/auth/change-password' \
  --header 'Content-Type: application/json' \
  --header 'X-CSRF-Token: <CSRF_TOKEN>' \
  --cookie "$COOKIE_JAR" \
  --data '{"current_password":"<SENHA_ATUAL>","new_password":"<NOVA_SENHA_COM_12_OU_MAIS_CARACTERES>"}'
```

Uma resposta bem-sucedida contém:

```json
{
  "data": {
    "changed": true,
    "reauthentication_required": true
  },
  "error": null
}
```

Apague o arquivo temporário ao terminar:

```bash
rm -- "$COOKIE_JAR"
```

Se o login retornar `502`, verifique primeiro `INTERNAL_API_URL` no frontend. Se retornar `401`,
as credenciais não conferem. Cinco falhas em quinze minutos acionam bloqueio temporário com
resposta `429`. Se não houver mais acesso à senha de uma conta já criada, não tente redefini-la
pelo seed: use um procedimento administrativo de recuperação no banco ou um comando interno
autorizado, nunca um endpoint público sem autenticação.

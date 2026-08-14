# Relatório de revisão do painel

Data da revisão: 14 de agosto de 2026.

## Escopo

A revisão cobriu rotas, autenticação, troca de senha, navegação, prefetch, acessibilidade dos
campos, contrato com a API, configuração do Next.js, testes e automação de qualidade do
repositório `movimento7-web`.

## Fluxo da aplicação

```mermaid
flowchart LR
    U[Pessoa administradora] -->|Acessa /painel| P[Proxy do Next.js]
    P -->|Sem cookie| L[/painel/login]
    P -->|Cookie presente| UI[Módulo solicitado]
    L -->|POST login same-origin| BFF[Rewrite /api/v1]
    UI -->|Somente ao navegar; sem prefetch| BFF
    BFF --> API[API Flask /api/v1/admin]
    API --> DB[(PostgreSQL Aiven)]
    API -->|Cookie HttpOnly + CSRF| L
    L -->|Primeiro acesso| C[/painel/trocar-senha]
    C -->|Senha válida + CSRF| API
    API -->|Revoga sessão| L
```

O caminho público da interface é `/painel`. O namespace `/api/v1/admin` permanece na API para
evitar quebra de contrato entre frontend e backend. As URLs antigas `/admin` redirecionam com
status permanente para `/painel`.

## Problemas confirmados e correções

### Validação de senha

- A validação dependia de atributos HTML e verificava no cliente apenas a confirmação.
- Não havia verificação local para nova senha igual à atual.
- Erros da API como `invalid_password` não eram ligados ao campo de senha atual.
- O primeiro campo inválido não recebia foco.

Foi criado um esquema Zod compartilhado com as mesmas regras essenciais da API: campos
obrigatórios, mínimo de 12 caracteres, nova senha diferente da atual e confirmação idêntica.
Erros locais e remotos agora são ligados aos campos com `aria-invalid`, `aria-describedby` e foco
no primeiro erro. A API continua sendo a autoridade final.

### Mostrar e ocultar senha

Foi criado um componente reutilizável para todos os campos de senha administrativos. O controle:

- usa botão `type="button"`, sem disparar o formulário;
- anuncia “Mostrar” ou “Ocultar” para tecnologia assistiva;
- informa o estado por `aria-pressed`;
- mantém autocomplete correto para senha atual e nova;
- utiliza ícones já presentes no projeto.

### Carregamento das telas

Os links do menu lateral usavam o comportamento padrão do `Link`, que pode pré-carregar rotas
visíveis. Todos os módulos administrativos agora usam `prefetch={false}`. O cabeçalho e o rodapé
públicos deixam de ser renderizados em `/painel`, evitando também o prefetch das rotas públicas.
O Next.js continua fazendo divisão de código por rota, e foi incluído um estado `loading.tsx` para
feedback durante a navegação sob demanda.

### Organização das rotas

O login foi separado do layout protegido por route groups. Assim, a tela de autenticação não
monta o menu completo do painel. Detalhes dos módulos ficam centralizados em
`src/lib/panel-modules.ts`, reduzindo duplicação entre navegação e páginas.

## Automação

O workflow `frontend-ci.yml` executa em Ubuntu e Node.js 24:

1. instalação reproduzível com `npm ci`;
2. ESLint;
3. TypeScript sem emissão;
4. testes Vitest;
5. build de produção do Next.js.

Execuções concorrentes da mesma branch são canceladas para evitar consumo desnecessário.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, sem erros |
| `npm run typecheck` | Aprovado, TypeScript estrito sem erros |
| `npm run test:web` | Aprovado, 9 arquivos e 24 testes |
| `npm run build` | Aprovado, rotas `/painel` geradas corretamente |
| `npm audit --audit-level=high` | Aprovado, nenhuma vulnerabilidade encontrada |
| `git diff --check` | Aprovado, sem erros de whitespace |

O smoke test HTTP no build de produção confirmou:

- `/admin` responde `308` para `/painel`;
- `/admin/login?status=teste` preserva a query no redirecionamento;
- `/painel`, `/painel/trocar-senha` e módulos sem cookie respondem `307` para o login;
- `/painel/login` responde `200` sem montar cabeçalho e rodapé públicos;
- `/painel` com cookie de teste chega ao layout protegido; a API ainda valida a sessão real.

## Limitações encontradas

- Os módulos administrativos além do dashboard e autenticação ainda exibem estados vazios; CRUDs
  completos dependem de implementação posterior e das permissões/endpoints correspondentes.
- Este repositório não possui suíte Playwright própria. A cobertura atual do fluxo é unitária,
  complementada por build e smoke tests HTTP.
- A alteração da rota da interface não muda o namespace administrativo da API Flask.

# CredFlow

Monorepo **Next.js** (frontend) + **NestJS** (API) com Turborepo e pnpm.

## Estrutura

```
CredFlow/
├── apps/
│   ├── web/          # Next.js (porta 3000)
│   └── api/          # NestJS (porta 4000)
├── packages/
│   ├── database/     # Prisma + MySQL
│   ├── ui/           # Componentes React compartilhados
│   └── shared/       # DTOs, types, utils
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Pré-requisitos

- Node.js >= 20
- pnpm 9
- MySQL (para Prisma)

## Instalação

```bash
cd CredFlow
pnpm install
```

## Banco de dados (MySQL)

1. Copie o exemplo de env do database:

```bash
cp packages/database/.env.example packages/database/.env
```

2. Ajuste `DATABASE_URL` no `packages/database/.env`:

```
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/credflow"
```

3. Gere o client e aplique o schema:

```bash
pnpm db:generate
pnpm db:push
```

4. (Opcional) Popule dados de teste com o seed:

```bash
pnpm --filter @credflow/database db:seed
```

**Contas criadas pelo seed:**

| Perfil   | E-mail                  | Senha   |
|----------|-------------------------|---------|
| Admin    | admin@credflow.com      | admin123 |
| Vendedor | vendedor1@credflow.com  | 123456   |
| Vendedor | vendedor2@credflow.com  | 123456   |
| Preposto | preposto1@credflow.com  | 123456   |
| Preposto | preposto2@credflow.com  | 123456   |

Links de acompanhamento de teste: `/acompanhar/LINK01` até `/acompanhar/LINK05`.

5. API: crie `apps/api/.env` com `JWT_SECRET=seu-secret-forte` (opcional; há valor padrão em dev).

## Desenvolvimento

Subir tudo (web + api):

```bash
pnpm dev
```

Ou só um app:

```bash
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:4000
```

## Build

```bash
pnpm build
```

## Scripts úteis

| Comando        | Descrição                    |
|----------------|------------------------------|
| `pnpm dev`     | Sobe web e api em modo dev   |
| `pnpm build`   | Build de todos os pacotes    |
| `pnpm db:generate` | Gera Prisma Client         |
| `pnpm db:push`     | Aplica schema no MySQL      |
| `pnpm db:studio`   | Abre Prisma Studio         |

## Sistema (MVP)

- **Perfis:** Admin, Vendedor, Preposto
- **Vendedor:** login, cadastro de clientes, link individual de acompanhamento, comissões
- **Admin:** dashboard geral, todos os vendedores/clientes, aprovação de pagamentos, ranking
- **Cliente:** página pública `/acompanhar/[link]` com status, linha do tempo e pagamento (PIX)
- **Comissões:** calculadas automaticamente ao confirmar pagamento (env: `COMISSAO_VENDEDOR`, `COMISSAO_PREPOSTO`)

## Stack

- **Frontend:** Next.js 15, React 19, Tailwind, Plus Jakarta Sans
- **Backend:** NestJS 10, JWT, Passport, Prisma
- **Monorepo:** pnpm workspaces + Turborepo
- **Banco:** Prisma + MySQL

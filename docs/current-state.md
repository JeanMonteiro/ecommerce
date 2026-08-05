# Estado atual do código

Snapshot do repositório em relação à arquitetura alvo.  
Atualize este arquivo quando a estrutura mudar de forma relevante.

---

## Git

- Repositório único na raiz `ecommerce/` (monorepo)
- O `.git` antigo em `auth/` foi removido
- Ainda sem commits / remote

## O que existe hoje

```
ecommerce/
├── .git/                    # repo do monorepo
├── .gitignore
├── auth/                    # único serviço parcialmente implementado
│   ├── app.ts
│   ├── src/routes.ts
│   ├── prisma/
│   ├── docker-compose.yaml  # só deste serviço
│   └── ...
├── auth-middleware/         # stub vazio (app.ts / index.js vazios)
└── docs/                    # documentação de arquitetura (este diretório)
```

### auth (parcial)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `POST /api/users`, `POST /api/auth`, `GET /api/users`
- JWT na criação/login
- Testes Jest + Supertest com Prisma mockado
- Docker Compose local (app + Postgres)

### auth-middleware

- Pasta criada, **sem implementação**
- Destino: virar `packages/auth-middleware` (lib, não serviço)

---

## Lacunas vs arquitetura alvo

| Item | Status |
|------|--------|
| Microserviços (8) | Só `auth` existe |
| RabbitMQ | Não iniciado |
| api-gateway | Não iniciado |
| Monorepo `services/` + `packages/` | Não iniciado |
| Hash de senha (bcrypt) | Dependência presente, **não usada** |
| JWT com expiry | Não |
| Validação de input | Não |
| Compose raiz | Não |
| Eventos / consumers | Não |

---

## Débitos conhecidos no auth (corrigir na Fase 1)

1. Senha em texto puro no banco (usar bcrypt)
2. JWT sem `expiresIn`
3. `GET /api/users` sem autenticação
4. Sem validação de body (username/password)
5. `DATABASE_URL` no compose usa `${DB_PORT}` — dentro da rede Docker deve ser `5432`
6. Dockerfile sem `CMD`; command do compose comentado
7. `bodyParser` redundante / depois das rotas
8. `tsconfig` pode não incluir `app.ts` na raiz do serviço

---

## Próximo passo

Seguir [roadmap.md](./roadmap.md) — **Fase 1: Foundation**.

# Estado atual do código

Snapshot do repositório em relação à arquitetura alvo.  
Atualize este arquivo quando a estrutura mudar de forma relevante.

---

## Git

- Repositório único na raiz `ecommerce/` (monorepo)
- O `.git` antigo em `auth/` foi removido
- Remote: [github.com/JeanMonteiro/ecommerce](https://github.com/JeanMonteiro/ecommerce) (**público**, conta pessoal — não é org da empresa)

## O que existe hoje

```
ecommerce/
├── .git/                    # repo do monorepo
├── .gitignore
├── services/
│   └── auth/                # único serviço parcialmente implementado
│       ├── app.ts
│       ├── src/routes.ts
│       ├── prisma/
│       ├── docker-compose.yaml  # só deste serviço
│       └── ...
├── packages/
│   └── auth-middleware/     # stub vazio (app.ts / index.js vazios)
└── docs/                    # documentação de arquitetura (este diretório)
```

**Nota:** reorganização do monorepo (`services/` + `packages/`) concluída na Fase 1.

### auth (parcial)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `POST /api/users`, `POST /api/auth`, `GET /api/users`
- JWT na criação/login
- Testes Jest + Supertest com Prisma mockado
- Docker Compose local (app + Postgres)

### auth-middleware

- Pasta em `packages/auth-middleware`, **sem implementação**
- Lib compartilhada (verificação JWT) — não é microserviço

---

## Lacunas vs arquitetura alvo

| Item | Status |
|------|--------|
| Microserviços (8) | Só `services/auth` existe |
| RabbitMQ | Não iniciado |
| api-gateway | Não iniciado |
| Monorepo `services/` + `packages/` | **Feito** |
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

Seguir [roadmap.md](./roadmap.md) — **Fase 1: Foundation** (endurecer auth, extrair middleware JWT, compose raiz, gateway stub).

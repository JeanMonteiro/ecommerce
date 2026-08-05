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
├── .env.example             # variáveis para compose raiz
├── docker-compose.yml       # RabbitMQ + auth-db + auth
├── services/
│   └── auth/                # único serviço parcialmente implementado
│       ├── app.ts
│       ├── src/routes.ts
│       ├── prisma/
│       ├── docker-compose.yaml  # legado (preferir compose raiz)
│       └── ...
├── packages/
│   └── auth-middleware/     # lib JWT compartilhada (@ecommerce/auth-middleware)
└── docs/                    # documentação de arquitetura (este diretório)
```

**Nota:** reorganização do monorepo (`services/` + `packages/`) concluída na Fase 1.

### auth (parcial)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `POST /api/users`, `POST /api/auth`, `GET /api/users` (JWT obrigatório)
- Senhas com **bcrypt** (hash no register, compare no login)
- JWT com **`expiresIn`** (`24h` por padrão; `JWT_EXPIRES_IN` opcional)
- Validação de input (username trim, password mín. 6 caracteres)
- `JWT_HASH` obrigatório no startup
- Testes Jest + Supertest com Prisma/bcrypt mockados
- Docker Compose legado em `services/auth/` (app + Postgres)
- **Compose raiz** (`docker-compose.yml`): RabbitMQ + `auth-db` + `auth` — auth ainda **não publica eventos** no broker

### auth-middleware

- Pacote `@ecommerce/auth-middleware` — middleware Express para `Authorization: Bearer <token>`
- Verifica JWT com `jsonwebtoken` + `JWT_HASH`; expõe `req.user` (`userId`, `username`)
- Respostas 401 JSON em falha; testes unitários com `jwt.verify` mockado
- Consumido por `services/auth` em `GET /api/users` (dependência `file:../../packages/auth-middleware`)
- Lib compartilhada — **não** é microserviço; sem Prisma/DB

---

## Lacunas vs arquitetura alvo

| Item | Status |
|------|--------|
| Microserviços (8) | Só `services/auth` existe |
| RabbitMQ | **No compose raiz** (auth ainda não conecta) |
| api-gateway | Não iniciado |
| Monorepo `services/` + `packages/` | **Feito** |
| Hash de senha (bcrypt) | **Feito** |
| JWT com expiry | **Feito** (`24h` default) |
| Validação de input | **Feito** |
| Compose raiz | **Feito** (RabbitMQ + auth-db + auth) |
| Eventos / consumers | Não (RabbitMQ sobe no stack; publishers na Fase 2+) |

---

## Débitos conhecidos no auth (corrigir na Fase 1)

1. ~~Senha em texto puro no banco~~ — **resolvido** (bcrypt)
2. ~~JWT sem `expiresIn`~~ — **resolvido**
3. ~~`GET /api/users` sem autenticação~~ — **resolvido** (Bearer JWT)
4. ~~Sem validação de body~~ — **resolvido**
5. ~~`DATABASE_URL` no compose usa `${DB_PORT}` — dentro da rede Docker deve ser `5432`~~ — **resolvido** no compose raiz (`auth-db:5432`)
6. ~~Dockerfile sem `CMD`; command do compose comentado~~ — **resolvido** (`prisma migrate deploy` + `node dist/app.js`)
7. ~~`bodyParser` redundante / depois das rotas~~ — **resolvido**
8. ~~`tsconfig` pode não incluir `app.ts` na raiz do serviço~~ — **resolvido**
9. ~~Verificação JWT inline nas rotas~~ — **resolvido** (`@ecommerce/auth-middleware`)

---

## Próximo passo

Seguir [roadmap.md](./roadmap.md) — **Fase 1: Foundation** (gateway stub).

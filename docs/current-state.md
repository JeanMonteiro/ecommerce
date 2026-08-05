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
├── docker-compose.yml       # RabbitMQ + auth-db + catalog-db + inventory-db + serviços + api-gateway
├── services/
│   ├── auth/                # microserviço de autenticação
│   │   ├── app.ts
│   │   ├── src/routes.ts
│   │   ├── prisma/
│   │   ├── docker-compose.yaml  # legado (preferir compose raiz)
│   │   └── ...
│   ├── api-gateway/         # proxy HTTP na porta 3000
│   │   ├── app.ts
│   │   ├── Dockerfile
│   │   └── ...
│   ├── catalog/             # microserviço de catálogo (Fase 2)
│   │   ├── app.ts
│   │   ├── prisma/
│   │   └── ...
│   └── inventory/           # microserviço de estoque (Fase 2)
│       ├── app.ts
│       ├── prisma/
│       └── ...
├── packages/
│   ├── auth-middleware/     # lib JWT compartilhada (@ecommerce/auth-middleware)
│   └── messaging/           # lib RabbitMQ (@ecommerce/messaging)
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

### api-gateway (stub — Fase 2 parcial)

- Express + TypeScript + `http-proxy-middleware`
- `GET /health` → `{ status: 'ok' }`
- Proxy para auth (paths preservados): `POST /api/users`, `POST /api/auth`, `GET /api/users`
- Proxy para catalog: `/api/products` (CRUD produtos)
- Proxy para inventory: `/api/inventory` (consulta/atualização de estoque)
- Porta **3000** (`GATEWAY_PORT` / `API_GATEWAY_PORT`)
- Upstreams via env (`AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, `INVENTORY_SERVICE_URL`)
- CORS habilitado; **sem** JWT no gateway ainda (TODO Fase 6 — `@ecommerce/auth-middleware`)
- No compose raiz: depende de `auth`, `catalog`, `inventory`; expõe `:3000`

### auth-middleware

- Pacote `@ecommerce/auth-middleware` — middleware Express para `Authorization: Bearer <token>`
- Verifica JWT com `jsonwebtoken` + `JWT_HASH`; expõe `req.user` (`userId`, `username`)
- Respostas 401 JSON em falha; testes unitários com `jwt.verify` mockado
- Consumido por `services/auth` em `GET /api/users` (dependência `file:../../packages/auth-middleware`)
- Lib compartilhada — **não** é microserviço; sem Prisma/DB

### messaging

- Pacote `@ecommerce/messaging` — helpers RabbitMQ compartilhados
- `createMessagingClient()` conecta via `RABBITMQ_URL` (default `amqp://guest:guest@localhost:5672`)
- Assert topic exchange `ecommerce.events`; `publish(routingKey, payload)` e `subscribe(pattern, queue, handler)`
- Consumido por `services/catalog` e `services/inventory`

### catalog (Fase 2 — concluído)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT/PATCH /api/products/:id`
- Validação: `name` não vazio, `price >= 0`
- Publica `product.created` no create e `product.updated` no update (via `@ecommerce/messaging`)
- Porta **3002** local (`CATALOG_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma e publish mockados
- **Compose raiz:** `catalog-db` + `catalog` com `DATABASE_URL` e `RABBITMQ_URL`

### inventory (Fase 2 — concluído)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `GET /api/inventory`, `GET /api/inventory/:productId`, `PATCH /api/inventory/:productId`
- Consome `product.created` via `@ecommerce/messaging` (queue `inventory.product-created`) — cria stock com quantity **0** (idempotente)
- Porta **3005** local (`INVENTORY_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma e messaging mockados
- **Compose raiz:** `inventory-db` + `inventory` com `DATABASE_URL` e `RABBITMQ_URL`

---

## Fluxo de eventos (Fase 2)

```mermaid
sequenceDiagram
  participant Client
  participant GW as api-gateway
  participant Cat as catalog
  participant MQ as RabbitMQ
  participant Inv as inventory

  Client->>GW: POST /api/products
  GW->>Cat: POST /api/products
  Cat->>Cat: persist product
  Cat->>MQ: publish product.created
  MQ->>Inv: consume product.created
  Inv->>Inv: create stock (qty=0)

  Client->>GW: GET /api/inventory/:productId
  GW->>Inv: GET /api/inventory/:productId
  Inv-->>Client: stock record
```

1. Cliente cria produto via gateway → `catalog` persiste e publica `product.created`.
2. `inventory` consome o evento e cria registro de estoque com quantity **0**.
3. Consulta de estoque via gateway → `GET /api/inventory/:productId`.

---

## Lacunas vs arquitetura alvo

| Item | Status |
|------|--------|
| Microserviços (8) | `auth` + **api-gateway** + **`catalog`** + **`inventory`**; demais pendentes |
| RabbitMQ | **No compose raiz**; **`catalog` publica** eventos; **`inventory` consome** `product.created` |
| api-gateway | **Stub Fase 2** — proxy auth + catalog + inventory; JWT guard na Fase 6 |
| Monorepo `services/` + `packages/` | **Feito** |
| Hash de senha (bcrypt) | **Feito** |
| JWT com expiry | **Feito** (`24h` default) |
| Validação de input | **Feito** |
| Compose raiz | **Feito** (RabbitMQ + 3 DBs + auth + catalog + inventory + api-gateway) |
| Eventos / consumers | **`catalog` publica** `product.created` / `product.updated`; **`inventory` consome** `product.created` |

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

Seguir [roadmap.md](./roadmap.md) — **Fase 3: Cart** (carrinho add/remove/list; HTTP interno para `catalog`).

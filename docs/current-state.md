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
├── docker-compose.yml       # RabbitMQ + auth-db + catalog-db + inventory-db + cart-db + orders-db + serviços + api-gateway
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
│   ├── inventory/           # microserviço de estoque (Fase 2)
│   │   ├── app.ts
│   │   ├── prisma/
│   │   └── ...
│   ├── cart/                # microserviço de carrinho (Fase 3)
│   │   ├── app.ts
│   │   ├── prisma/
│   │   └── ...
│   ├── orders/              # microserviço de pedidos (Fase 4 — concluído)
│   │   ├── app.ts
│   │   ├── prisma/
│   │   └── ...
│   └── payment/             # microserviço de pagamento mock (Fase 5 Step 1)
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

### api-gateway (stub — Fase 4)

- Express + TypeScript + `http-proxy-middleware`
- `GET /health` → `{ status: 'ok' }`
- Proxy para auth (paths preservados): `POST /api/users`, `POST /api/auth`, `GET /api/users`
- Proxy para catalog: `/api/products` (CRUD produtos)
- Proxy para inventory: `/api/inventory` (consulta/atualização de estoque)
- Proxy para cart: `/api/cart` (carrinho — JWT validado no serviço cart)
- Proxy para orders: `/api/orders` (checkout — JWT validado no serviço orders)
- Porta **3000** (`GATEWAY_PORT` / `API_GATEWAY_PORT`)
- Upstreams via env (`AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `CART_SERVICE_URL`, `ORDERS_SERVICE_URL`)
- CORS habilitado; **sem** JWT no gateway ainda (TODO Fase 6 — `@ecommerce/auth-middleware`)
- No compose raiz: depende de `auth`, `catalog`, `inventory`, `cart`, `orders`; expõe `:3000`

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
- Consumido por `services/catalog`, `services/inventory` e `services/orders`

### catalog (Fase 2 — concluído)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT/PATCH /api/products/:id`
- Validação: `name` não vazio, `price >= 0`
- Publica `product.created` no create e `product.updated` no update (via `@ecommerce/messaging`)
- Porta **3002** local (`CATALOG_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma e publish mockados
- **Compose raiz:** `catalog-db` + `catalog` com `DATABASE_URL` e `RABBITMQ_URL`

### cart (Fase 3 + Fase 5 Step 3)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints (JWT obrigatório via `@ecommerce/auth-middleware`): `GET /api/cart`, `POST /api/cart`, `PATCH /api/cart/:productId`, `DELETE /api/cart/:productId`, `DELETE /api/cart`
- HTTP interno para `catalog`: `GET /api/products/:id` via `CATALOG_SERVICE_URL` (valida produto + snapshot de preço/nome)
- Consome `order.confirmed` (queue `cart.order-confirmed`) via `@ecommerce/messaging` — limpa carrinho do `userId` (idempotente)
- Porta **3003** local (`CART_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma, catalog client e messaging mockados
- **Compose raiz:** `cart-db` + `cart` com `DATABASE_URL`, `JWT_HASH` e `CATALOG_SERVICE_URL` (falta `RABBITMQ_URL` — Step 4)
- **Gateway:** proxy `/api/cart`

### orders (Fase 4 + Fase 5 Step 2)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints (JWT via `@ecommerce/auth-middleware`): `POST /api/orders` (202 PENDING), `GET /api/orders`, `GET /api/orders/:id`
- HTTP interno para `cart`: `GET /api/cart` via `CART_SERVICE_URL` — **repassa o JWT** do usuário
- Publica `order.created` no checkout (via `@ecommerce/messaging`)
- Consome `stock.reserved` / `stock.rejected` (queue `orders.stock-events`, pattern `stock.*`) → atualiza status (`AWAITING_PAYMENT` / `CANCELLED`)
- Consome `payment.succeeded` / `payment.failed` (queue `orders.payment-events`, pattern `payment.*`) → atualiza status (`CONFIRMED` / `CANCELLED`) e publica `order.confirmed` / `order.cancelled`
- Porta **3004** local (`ORDERS_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma, messaging e cart client mockados
- **Compose raiz:** `orders-db` + `orders` com `DATABASE_URL`, `JWT_HASH`, `CART_SERVICE_URL` e `RABBITMQ_URL`
- **Gateway:** proxy `/api/orders`

### inventory (Fase 2 + Fase 4 Step 2 + Fase 5 Step 3)

- Express + TypeScript + Prisma + PostgreSQL
- Endpoints: `GET /api/inventory`, `GET /api/inventory/:productId`, `PATCH /api/inventory/:productId`
- Consome `product.created` via `@ecommerce/messaging` (queue `inventory.product-created`) — cria stock com quantity **0** (idempotente)
- Consome `order.created` (queue `inventory.order-created`) — reserva estoque em transação; publica `stock.reserved` ou `stock.rejected` (idempotente por `orderId`)
- Consome `order.confirmed` (queue `inventory.order-confirmed`) — commit reserva (`RESERVED` → `COMMITTED`; idempotente)
- Consome `order.cancelled` (queue `inventory.order-cancelled`) — release reserva (restaura stock, `RESERVED` → `RELEASED`; idempotente)
- Modelos Prisma: `Stock`, `Reservation`, `ReservationItem` (`quantity` em Stock = disponível; reserva decrementa)
- Porta **3005** local (`INVENTORY_PORT`); **3000** no container Docker
- Testes Jest + Supertest com Prisma e messaging mockados
- **Compose raiz:** `inventory-db` + `inventory` com `DATABASE_URL` e `RABBITMQ_URL`

### payment (Fase 5 Step 1 — concluído)

- Express + TypeScript + Prisma + PostgreSQL
- `GET /health` apenas (serviço interno — sem rotas públicas de checkout)
- Consome `stock.reserved` (queue `payment.stock-reserved`) via `@ecommerce/messaging`
- Mock de cobrança via `PAYMENT_FORCE_RESULT`: `success` (default) | `failure` | `random`
- Publica `payment.succeeded` `{ orderId, paymentId }` ou `payment.failed` `{ orderId, reason }`
- Modelo Prisma `Payment` (`orderId` unique, `status` SUCCEEDED|FAILED, `reason` opcional)
- Handler idempotente: pagamento existente → re-publica o evento correspondente
- Porta **3006** local (`PAYMENT_PORT`); **3000** no container Docker
- Testes Jest com Prisma e publish mockados (success, failure, idempotência)
- **Ainda não no compose raiz** — wiring + saga completa no próximo passo

---

## Fluxo de eventos (Fase 2) e HTTP síncrono (Fase 3)

```mermaid
sequenceDiagram
  participant Client
  participant GW as api-gateway
  participant Cat as catalog
  participant Cart as cart
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

  Client->>GW: POST /api/cart (Bearer JWT)
  GW->>Cart: POST /api/cart
  Cart->>Cat: GET /api/products/:id (HTTP sync)
  Cat-->>Cart: product snapshot
  Cart->>Cart: persist cart item
  Cart-->>Client: cart item
```

1. Cliente cria produto via gateway → `catalog` persiste e publica `product.created`.
2. `inventory` consome o evento e cria registro de estoque com quantity **0**.
3. Consulta de estoque via gateway → `GET /api/inventory/:productId`.
4. Carrinho via gateway → `cart` valida produto/preço com HTTP síncrono para `catalog`.

---

## Fluxo saga parcial (Fase 4)

```mermaid
sequenceDiagram
  participant Client
  participant GW as api-gateway
  participant Cart as cart
  participant Orders as orders
  participant MQ as RabbitMQ
  participant Inv as inventory

  Client->>GW: POST /api/orders (Bearer JWT)
  GW->>Orders: POST /api/orders
  Orders->>Cart: GET /api/cart (HTTP sync, JWT repassado)
  Cart-->>Orders: cart items
  Orders->>Orders: persist order (PENDING)
  Orders->>MQ: publish order.created
  Orders-->>Client: 202 PENDING

  MQ->>Inv: consume order.created
  alt stock available
    Inv->>Inv: reserve stock
    Inv->>MQ: publish stock.reserved
    MQ->>Orders: consume stock.reserved
    Orders->>Orders: status → AWAITING_PAYMENT
  else insufficient stock
    Inv->>MQ: publish stock.rejected
    MQ->>Orders: consume stock.rejected
    Orders->>Orders: status → CANCELLED
  end

  Client->>GW: GET /api/orders/:id
  GW->>Orders: GET /api/orders/:id
  Orders-->>Client: AWAITING_PAYMENT or CANCELLED
```

1. Checkout via gateway → `orders` lê carrinho via HTTP para `cart`, persiste pedido `PENDING` e publica `order.created`.
2. `inventory` consome, reserva estoque e publica `stock.reserved` ou `stock.rejected`.
3. `orders` consome `stock.*` e atualiza para `AWAITING_PAYMENT` ou `CANCELLED`.
4. `payment` consome `stock.reserved`, cobra (mock) e publica `payment.succeeded` ou `payment.failed`.
5. `orders` consome `payment.*` → `CONFIRMED` + `order.confirmed` ou `CANCELLED` + `order.cancelled`.
6. Cliente consulta `GET /api/orders/:id` — saga fechada no orders; **inventory/cart ainda não reagem** (próximo passo).

---

## Lacunas vs arquitetura alvo

| Item | Status |
|------|--------|
| Microserviços (8) | `auth` + **api-gateway** + **`catalog`** + **`inventory`** + **`cart`** + **`orders`** + **`payment`** (Step 1); `notifications` pendente |
| RabbitMQ | **No compose raiz**; **`catalog` publica** eventos; **`inventory` consome** `product.created` e **`order.created`**; **`orders` publica/consome** saga parcial |
| api-gateway | **Stub Fase 4** — proxy auth + catalog + inventory + cart + orders; JWT guard na Fase 6 |
| Monorepo `services/` + `packages/` | **Feito** |
| Hash de senha (bcrypt) | **Feito** |
| JWT com expiry | **Feito** (`24h` default) |
| Validação de input | **Feito** |
| Compose raiz | **Feito** (RabbitMQ + 5 DBs + auth + catalog + inventory + cart + orders + api-gateway) |
| Eventos / consumers | **`catalog` publica** `product.created` / `product.updated`; **`inventory` consome** `product.created` e **`order.created`** (publica `stock.reserved` / `stock.rejected`); **`orders` publica** `order.created`, **consome** `stock.*` e **`payment.*`** (publica `order.confirmed` / `order.cancelled`); **`payment` consome** `stock.reserved` (publica `payment.succeeded` / `payment.failed`) |

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

## Cobertura de testes (auditoria pós–Fase 4)

| Área | Veredito |
|------|----------|
| Unitários `auth` / `orders` / `inventory` | Adequado (~44 testes passando nos 5 serviços) |
| Unitários `catalog` / `cart` | Fino (faltam PATCH cart, alguns GETs/validações) |
| `@ecommerce/auth-middleware` | Testes existem, runner quebrado (deps) |
| `@ecommerce/messaging` | **Sem testes** |
| `api-gateway` | **Sem testes** |
| Contratos de evento / E2E compose / CI | **Ausentes** |

Conclusão: suficiente para continuar Fases 5–6; fechar gaps na **Fase 7 — Test coverage** (ver roadmap).

---

## Próximo passo

Seguir [roadmap.md](./roadmap.md) — **Fase 5 Step 4:** wiring `payment` no compose raiz + `RABBITMQ_URL` no cart; compensação (inventory release + cart clear) concluída via `order.confirmed` / `order.cancelled`.

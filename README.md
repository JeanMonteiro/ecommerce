# Ecommerce (estudo)

Lab de ecommerce com **microserviços** + **RabbitMQ**.  
Overkill intencional — foco em aprender padrões distribuídos.

## Documentação (fonte da verdade)

| Doc | Conteúdo |
|-----|----------|
| [docs/architecture.md](./docs/architecture.md) | Mapa de serviços, diagramas, eventos, saga, decisões |
| [docs/roadmap.md](./docs/roadmap.md) | Fases de implementação |
| [docs/current-state.md](./docs/current-state.md) | O que o código tem hoje vs o alvo |

Leia a arquitetura antes de adicionar serviços, rotas ou eventos.

## Estado rápido

- Implementado: **8 serviços** — `auth`, `catalog`, `inventory`, `cart`, `orders`, `payment`, `notifications`, `api-gateway` (proxy unificado + JWT guard; payment interno, sem proxy)
- Libs compartilhadas: `packages/auth-middleware/`, `packages/messaging/`, `packages/event-contracts/`
- Compose raiz: RabbitMQ + 6 DBs + 8 serviços (Fases 1–6 concluídas)
- Testes: `yarn test` na raiz (CI no GitHub Actions); E2E compose via `yarn test:e2e` (local, requer Docker)

## Stack alvo

- Node.js + TypeScript + Express + Prisma + Postgres (por serviço)
- RabbitMQ (`ecommerce.events`, topic)
- API Gateway na porta 3000

## Subir o stack local (Fase 6)

Na raiz do repositório:

```bash
cp .env.example .env
# Edite .env e defina JWT_HASH (string longa e aleatória)
docker compose up --build
```

| Serviço | URL / porta |
|---------|-------------|
| **api-gateway** | http://localhost:3000 |
| auth (direto) | http://localhost:3001 |
| catalog (direto) | http://localhost:3002 |
| cart (direto) | http://localhost:3003 |
| orders (direto) | http://localhost:3004 |
| inventory (direto) | http://localhost:3005 |
| payment (direto, interno) | http://localhost:3006 — `GET /health` apenas |
| notifications (direto) | http://localhost:3007 — `GET /api/notifications` (mock emails) |
| RabbitMQ management | http://localhost:15672 (guest/guest por padrão) |
| auth-db (host) | localhost:5433 |
| catalog-db (host) | localhost:5434 |
| inventory-db (host) | localhost:5435 |
| cart-db (host) | localhost:5436 |
| orders-db (host) | localhost:5437 |
| payment-db (host) | localhost:5438 |

Endpoints via gateway (`:3000`):

- Auth: `POST /api/users`, `POST /api/auth`, `GET /api/users` (Bearer JWT)
- Catalog: `GET/POST /api/products`, `GET/PUT/PATCH /api/products/:id`
- Inventory: `GET /api/inventory`, `GET/PATCH /api/inventory/:productId`
- Cart (Bearer JWT): `GET/POST/DELETE /api/cart`, `PATCH/DELETE /api/cart/:productId`
- Orders (Bearer JWT): `POST /api/orders` (202 PENDING), `GET /api/orders`, `GET /api/orders/:id`
- Notifications (público): `GET /api/notifications` — lista mock emails em memória

Health do gateway: `GET http://localhost:3000/health`

### Fluxo Fase 2 (produto → estoque)

1. `POST http://localhost:3000/api/products` — catalog persiste e publica `product.created`
2. inventory consome o evento e cria stock com quantity **0**
3. `GET http://localhost:3000/api/inventory/:productId` — consulta estoque

### Fluxo Fase 3 (carrinho + catalog HTTP)

1. Registrar/login via gateway → obter JWT
2. `POST http://localhost:3000/api/cart` com `{ "productId": "...", "quantity": 1 }` — cart valida produto/preço via HTTP interno para catalog
3. `GET http://localhost:3000/api/cart` — listar itens do carrinho

### Fluxo Fase 4–5 (checkout + saga completa)

1. Adicionar itens ao carrinho (Fase 3) e ajustar estoque (`PATCH /api/inventory/:productId`)
2. `POST http://localhost:3000/api/orders` com Bearer JWT — retorna **202** com `status: PENDING`
3. Saga assíncrona: reserva estoque → pagamento mock (`PAYMENT_FORCE_RESULT=success` por padrão) → `CONFIRMED` ou `CANCELLED`
4. Em sucesso: inventory commit + cart limpo via `order.confirmed`; em falha: inventory release via `order.cancelled`
5. `GET http://localhost:3000/api/orders/:id` — poll até `CONFIRMED` ou `CANCELLED`

Opcional: `PAYMENT_FORCE_RESULT=failure` no `.env` para simular falha de pagamento e compensação.

### Fluxo Fase 6 (notifications)

1. `POST http://localhost:3000/api/users` — auth publica `user.registered` → notifications envia welcome email mock
2. Após checkout confirmado/cancelado (Fase 4–5) → notifications consome `order.confirmed` / `order.cancelled`
3. `GET http://localhost:3000/api/notifications` — debug: lista emails mock em memória

## Testes (Fase 7)

Na raiz do repositório, rode todos os testes unitários dos pacotes e serviços:

```bash
yarn test
```

O script `scripts/run-all-tests.js` percorre, em ordem:

- `packages/auth-middleware`, `packages/messaging`, `packages/event-contracts`
- `services/auth`, `catalog`, `cart`, `orders`, `inventory`, `payment`, `notifications`, `api-gateway`

Em cada diretório: `yarn install` (com `--frozen-lockfile` quando há `yarn.lock`) e `yarn test --watchman=false --ci`. Falha se qualquer alvo falhar.

CI: workflow `.github/workflows/test.yml` executa `yarn test` em push/PR para `main`/`master` (Node 18).

Para testar um serviço isolado: `cd services/<nome> && yarn install && yarn test`.

### E2E smoke (Fase 7 — checkout saga)

Requer **Docker**, **curl** e **jq**. Não faz parte do `yarn test` padrão (stack completo + filas).

**Pré-requisitos**

```bash
cp .env.example .env
# Edite .env: JWT_HASH com string longa e aleatória (obrigatório)
docker compose up -d --build
# Aguarde o gateway responder (o script também faz wait em GET /health)
```

**Executar**

```bash
yarn test:e2e
# ou: bash scripts/e2e-checkout.sh
```

Variáveis opcionais:

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GATEWAY_URL` | `http://localhost:3000` | Base URL do api-gateway |
| `PAYMENT_FORCE_RESULT` | `success` | `success` → assert `CONFIRMED`; `failure` → assert `CANCELLED` |
| `ORDER_TIMEOUT` | `60` | Segundos para poll de `GET /api/orders/:id` |
| `HEALTH_TIMEOUT` | `120` | Segundos para wait em `GET /health` |

**Fluxo automatizado** (via gateway `:3000`):

1. `POST /api/users` — register
2. `POST /api/auth` — login → JWT
3. `POST /api/products` — criar produto (JWT)
4. Poll `GET /api/inventory/:productId` até stock existir (consumer `product.created`)
5. `PATCH /api/inventory/:productId` — quantity > 0 (JWT)
6. `POST /api/cart` — adicionar item (JWT)
7. `POST /api/orders` — checkout → **202 PENDING**
8. Poll `GET /api/orders/:id` até `CONFIRMED` ou `CANCELLED`
9. Assert outcome conforme `PAYMENT_FORCE_RESULT`; verifica mock emails em `GET /api/notifications`

CI opcional: `.github/workflows/e2e.yml` (`workflow_dispatch` manual — não roda no push).

## Desenvolvimento local (sem Docker para o gateway)

Com os serviços já rodando (ex.: `docker compose up` ou cada serviço na porta local):

```bash
cd services/api-gateway
yarn install
AUTH_SERVICE_URL=http://localhost:3001 \
CATALOG_SERVICE_URL=http://localhost:3002 \
INVENTORY_SERVICE_URL=http://localhost:3005 \
CART_SERVICE_URL=http://localhost:3003 \
ORDERS_SERVICE_URL=http://localhost:3004 \
NOTIFICATIONS_SERVICE_URL=http://localhost:3007 \
yarn dev
```

## Próximo passo

Fase 8 do [roadmap](./docs/roadmap.md): **Polish** — idempotência, DLQ/outbox opcional, DX final.

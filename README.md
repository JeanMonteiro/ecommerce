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

- Implementado: `services/auth/`, `services/catalog/`, `services/inventory/`, `services/cart/`, `services/orders/`, `services/api-gateway/` (proxy auth + catalog + inventory + cart + orders)
- Libs compartilhadas: `packages/auth-middleware/`, `packages/messaging/`
- Compose raiz: RabbitMQ + auth-db + catalog-db + inventory-db + cart-db + orders-db + auth + catalog + inventory + cart + orders + api-gateway
- Alvo: 8 serviços + libs + RabbitMQ — ver docs

## Stack alvo

- Node.js + TypeScript + Express + Prisma + Postgres (por serviço)
- RabbitMQ (`ecommerce.events`, topic)
- API Gateway na porta 3000

## Subir o stack local (Fase 4)

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
| RabbitMQ management | http://localhost:15672 (guest/guest por padrão) |
| auth-db (host) | localhost:5433 |
| catalog-db (host) | localhost:5434 |
| inventory-db (host) | localhost:5435 |
| cart-db (host) | localhost:5436 |
| orders-db (host) | localhost:5437 |

Endpoints via gateway (`:3000`):

- Auth: `POST /api/users`, `POST /api/auth`, `GET /api/users` (Bearer JWT)
- Catalog: `GET/POST /api/products`, `GET/PUT/PATCH /api/products/:id`
- Inventory: `GET /api/inventory`, `GET/PATCH /api/inventory/:productId`
- Cart (Bearer JWT): `GET/POST/DELETE /api/cart`, `PATCH/DELETE /api/cart/:productId`
- Orders (Bearer JWT): `POST /api/orders` (202 PENDING), `GET /api/orders`, `GET /api/orders/:id`

Health do gateway: `GET http://localhost:3000/health`

### Fluxo Fase 2 (produto → estoque)

1. `POST http://localhost:3000/api/products` — catalog persiste e publica `product.created`
2. inventory consome o evento e cria stock com quantity **0**
3. `GET http://localhost:3000/api/inventory/:productId` — consulta estoque

### Fluxo Fase 3 (carrinho + catalog HTTP)

1. Registrar/login via gateway → obter JWT
2. `POST http://localhost:3000/api/cart` com `{ "productId": "...", "quantity": 1 }` — cart valida produto/preço via HTTP interno para catalog
3. `GET http://localhost:3000/api/cart` — listar itens do carrinho

### Fluxo Fase 4 (checkout + saga parcial)

1. Adicionar itens ao carrinho (Fase 3) e ajustar estoque (`PATCH /api/inventory/:productId`)
2. `POST http://localhost:3000/api/orders` com Bearer JWT — retorna **202** com `status: PENDING`
3. `inventory` reserva estoque assincronamente; `orders` atualiza para `AWAITING_PAYMENT` ou `CANCELLED`
4. `GET http://localhost:3000/api/orders/:id` — consultar status final da saga parcial

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
yarn dev
```

## Próximo passo

Fase 5 do [roadmap](./docs/roadmap.md): **Payment** mock + fechar saga (`payment.succeeded` / `payment.failed`, limpar carrinho em `order.confirmed`).

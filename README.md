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

- Implementado: `services/auth/`, `services/catalog/`, `services/inventory/`, `services/api-gateway/` (proxy auth + catalog + inventory)
- Libs compartilhadas: `packages/auth-middleware/`, `packages/messaging/`
- Compose raiz: RabbitMQ + auth-db + catalog-db + inventory-db + auth + catalog + inventory + api-gateway
- Alvo: 8 serviços + libs + RabbitMQ — ver docs

## Stack alvo

- Node.js + TypeScript + Express + Prisma + Postgres (por serviço)
- RabbitMQ (`ecommerce.events`, topic)
- API Gateway na porta 3000

## Subir o stack local (Fase 2)

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
| inventory (direto) | http://localhost:3005 |
| RabbitMQ management | http://localhost:15672 (guest/guest por padrão) |
| auth-db (host) | localhost:5433 |
| catalog-db (host) | localhost:5434 |
| inventory-db (host) | localhost:5435 |

Endpoints via gateway (`:3000`):

- Auth: `POST /api/users`, `POST /api/auth`, `GET /api/users` (Bearer JWT)
- Catalog: `GET/POST /api/products`, `GET/PUT/PATCH /api/products/:id`
- Inventory: `GET /api/inventory`, `GET/PATCH /api/inventory/:productId`

Health do gateway: `GET http://localhost:3000/health`

### Fluxo Fase 2 (produto → estoque)

1. `POST http://localhost:3000/api/products` — catalog persiste e publica `product.created`
2. inventory consome o evento e cria stock com quantity **0**
3. `GET http://localhost:3000/api/inventory/:productId` — consulta estoque

## Desenvolvimento local (sem Docker para o gateway)

Com os serviços já rodando (ex.: `docker compose up` ou cada serviço na porta local):

```bash
cd services/api-gateway
yarn install
AUTH_SERVICE_URL=http://localhost:3001 \
CATALOG_SERVICE_URL=http://localhost:3002 \
INVENTORY_SERVICE_URL=http://localhost:3005 \
yarn dev
```

## Próximo passo

Fase 3 do [roadmap](./docs/roadmap.md): **Cart** (carrinho add/remove/list).

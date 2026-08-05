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

- Implementado: `services/auth/`, `services/api-gateway/` (stub)
- Lib compartilhada: `packages/auth-middleware/`
- Compose raiz: RabbitMQ + auth-db + auth + api-gateway
- Alvo: 8 serviços + lib JWT + RabbitMQ — ver docs

## Stack alvo

- Node.js + TypeScript + Express + Prisma + Postgres (por serviço)
- RabbitMQ (`ecommerce.events`, topic)
- API Gateway na porta 3000

## Subir o stack local (Fase 1)

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
| RabbitMQ management | http://localhost:15672 (guest/guest por padrão) |
| auth-db (host) | localhost:5433 |

Endpoints de auth via gateway (`:3000`) ou direto no auth (`:3001`): `POST /api/users`, `POST /api/auth`, `GET /api/users` (Bearer JWT).

Health do gateway: `GET http://localhost:3000/health`

## Desenvolvimento local (sem Docker para o gateway)

Com auth já rodando (ex.: `docker compose up auth-db auth` ou auth na porta 3001):

```bash
cd services/api-gateway
yarn install
AUTH_SERVICE_URL=http://localhost:3001 yarn dev
```

## Próximo passo

Fase 2 do [roadmap](./docs/roadmap.md): **Catalog + Inventory**.

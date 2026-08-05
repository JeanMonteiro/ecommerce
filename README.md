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

- Implementado (parcial): `services/auth/`
- Lib compartilhada: `packages/auth-middleware/`
- Compose raiz: RabbitMQ + auth-db + auth
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
| auth | http://localhost:3001 |
| RabbitMQ management | http://localhost:15672 (guest/guest por padrão) |
| auth-db (host) | localhost:5433 |

Endpoints do auth (direto, sem gateway ainda): `POST /api/users`, `POST /api/auth`, `GET /api/users` (Bearer JWT).

## Próximo passo

Fase 1 do [roadmap](./docs/roadmap.md): **api-gateway stub** (proxy básico).

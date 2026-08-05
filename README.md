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
- Stub: `packages/auth-middleware/`
- Alvo: 8 serviços + lib JWT + RabbitMQ — ver docs

## Stack alvo

- Node.js + TypeScript + Express + Prisma + Postgres (por serviço)
- RabbitMQ (`ecommerce.events`, topic)
- API Gateway na porta 3000

## Próximo passo

Fase 1 do [roadmap](./docs/roadmap.md): foundation (monorepo, auth endurecido, RabbitMQ, middleware JWT).

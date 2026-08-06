# Roadmap de implementação

Ordem pensada para aprender uma peça por vez, sem subir 8 serviços vazios de uma vez.

---

## Fase 1 — Foundation

**Entrega**
- Reorganizar monorepo (`services/`, `packages/`)
- Mover `auth` → `services/auth`
- Endurecer auth: bcrypt, JWT com `expiresIn`, validação de input
- Extrair `packages/auth-middleware` (verificação JWT)
- `docker-compose.yml` na raiz com RabbitMQ (+ auth + auth-db)
- Gateway stub (proxy básico)

**Aprende:** base sólida, compose, JWT compartilhado

---

## Fase 2 — Catalog + Inventory

**Entrega**
- `catalog`: CRUD produtos
- Evento `product.created` → `inventory` cria stock=0
- Endpoint de consulta de estoque

**Aprende:** pub/sub básico no RabbitMQ

---

## Fase 3 — Cart

**Entrega**
- Carrinho (add/remove/list)
- HTTP interno para `catalog` (validar produto/preço)

**Aprende:** comunicação síncrona entre serviços

---

## Fase 4 — Orders + saga parcial

**Entrega**
- Criar pedido (`PENDING`, `202`)
- `order.created` → inventory reserva
- `stock.reserved` / `stock.rejected` → orders atualiza status

**Aprende:** coreografia de eventos

---

## Fase 5 — Payment + fechar saga

**Entrega**
- `payment` mock (sucesso/falha configurável)
- `payment.succeeded` → `order.confirmed`
- `payment.failed` → `order.cancelled` + libera estoque
- Cart limpa em `order.confirmed`

**Aprende:** compensação / rollback eventual

---

## Fase 6 — Notifications + Gateway completo

**Entrega**
- `notifications` consome eventos e “envia” email (log/mock)
- Rotas unificadas no `api-gateway :3000`
- Auth guard no gateway via `auth-middleware`

**Aprende:** superfície única para o cliente

---

## Fase 7 — Test coverage

Auditoria (pós–Fase 4): unitários dos 5 serviços passam (~44), mas pacotes compartilhados, gateway, contratos de evento, E2E e CI estão fracos ou ausentes. Esta fase fecha essa lacuna **depois** do fluxo de negócio completo (Fases 5–6), para o E2E cobrir a saga inteira.

**Entrega**
- Corrigir runners quebrados: `packages/auth-middleware` (deps/`jsonwebtoken`) e política de teste em `packages/messaging`
- Unit tests para `@ecommerce/messaging` (publish/subscribe/ack/nack com mock do amqplib)
- Smoke tests do `api-gateway` (`/health` + proxy com upstream mockado)
- Preencher gaps unitários finos: cart `PATCH`, catalog GET-by-id/validação de preço, auth JWT inválido/expirado
- Contratos de evento compartilhados (fixtures/schemas) para `product.created`, `order.created`, `stock.*`, `payment.*`, `order.confirmed` / `order.cancelled`
- Testes do `payment` + paths de compensação (sucesso/falha) e limpeza do cart
- **1 fluxo E2E** via `docker compose`: register → produto → stock → cart → checkout → poll até `CONFIRMED` ou `CANCELLED`
- CI (GitHub Actions) rodando `yarn test` em todos os packages/services no push

**Aprende:** confiança em sistema distribuído (contrato + integração + regressão automática)

---

## Fase 8 — Polish

**Entrega**
- Idempotência reforçada nos consumers
- Dead-letter queues (opcional)
- Outbox pattern (opcional)
- README de onboarding / DX final
- Hardening operacional (logs estruturados, healthchecks consistentes)

**Aprende:** robustez de sistemas distribuídos em produção de lab

---

## Status

| Fase | Status |
|------|--------|
| 1. Foundation | **Concluída (foundation)** — monorepo, auth hardening, `@ecommerce/auth-middleware`, compose raiz, **api-gateway stub** (proxy auth). Polish fino pode continuar na Fase 8. |
| 2. Catalog + Inventory | **Concluída** — `@ecommerce/messaging`, `catalog` (CRUD + eventos), `inventory` (consumer + HTTP), compose raiz (`catalog-db`, `inventory-db`, RabbitMQ) e gateway proxy `/api/products` + `/api/inventory` |
| 3. Cart | **Concluída** — `services/cart` (add/remove/list + HTTP catalog), compose raiz (`cart-db`, `cart`) e gateway proxy `/api/cart` |
| 4. Orders + saga parcial | **Concluída** — `orders` (criar pedido 202 PENDING, `order.created`, consumers `stock.*`), `inventory` reserva em `order.created`, compose raiz (`orders-db`, `orders`) e gateway proxy `/api/orders` |
| 5. Payment + fechar saga | Pendente |
| 6. Notifications + Gateway | Pendente |
| 7. Test coverage | Pendente — criada após auditoria: unitários OK nos serviços; faltam messaging, gateway, contratos, E2E e CI |
| 8. Polish | Pendente |

Atualize a coluna **Status** conforme for avançando.

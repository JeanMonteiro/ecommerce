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

## Fase 7 — Polish

**Entrega**
- Idempotência nos consumers
- `.env.example` por serviço / raiz
- README de onboarding
- Testes dos fluxos críticos
- (Opcional) outbox pattern, dead-letter queues

**Aprende:** robustez de sistemas distribuídos

---

## Status

| Fase | Status |
|------|--------|
| 1. Foundation | **Concluída (foundation)** — monorepo, auth hardening, `@ecommerce/auth-middleware`, compose raiz, **api-gateway stub** (proxy auth). Polish fino pode continuar na Fase 7. |
| 2. Catalog + Inventory | **Concluída** — `@ecommerce/messaging`, `catalog` (CRUD + eventos), `inventory` (consumer + HTTP), compose raiz (`catalog-db`, `inventory-db`, RabbitMQ) e gateway proxy `/api/products` + `/api/inventory` |
| 3. Cart | **Em progresso** — `services/cart` (add/remove/list + HTTP catalog) **concluído**; compose/gateway wiring = Step 2 |
| 4. Orders + saga parcial | Pendente |
| 5. Payment + fechar saga | Pendente |
| 6. Notifications + Gateway | Pendente |
| 7. Polish | Pendente |

Atualize a coluna **Status** conforme for avançando.

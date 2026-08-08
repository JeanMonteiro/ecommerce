# Ecommerce — Arquitetura

Projeto de estudo: ecommerce com **microserviços** + **RabbitMQ**.  
O “overkill” é intencional — o objetivo é aprender padrões, não minimizar infra.

Documento vivo: atualize este arquivo quando decisões de arquitetura mudarem.

---

## Decisões fechadas

| Decisão | Escolha |
|---------|---------|
| Broker | **RabbitMQ** (topic exchange `ecommerce.events`) |
| Escopo | **8 serviços** + lib compartilhada `auth-middleware` |
| Saga de checkout | **Coreografia** (sem orchestrator central) |
| Stack por serviço | Node.js + TypeScript + Express + Prisma + Postgres |
| Comunicação | HTTP síncrono para request/response; eventos para efeitos colaterais |
| Checkout | Resposta assíncrona (`202 PENDING` → eventos) |
| Dados | **1 Postgres (database) por serviço** — sem DB compartilhado |

---

## Mapa de serviços

```mermaid
flowchart TB
  Client[Web / Postman]

  GW[api-gateway :3000]

  subgraph services [Microserviços]
    Auth[auth :3001]
    Catalog[catalog :3002]
    Cart[cart :3003]
    Orders[orders :3004]
    Inventory[inventory :3005]
    Payment[payment :3006]
    Notify[notifications :3007]
  end

  MQ[(RabbitMQ :5672 / UI :15672)]

  subgraph dbs [Postgres - 1 DB por serviço]
    AuthDB[(auth_db)]
    CatalogDB[(catalog_db)]
    CartDB[(cart_db)]
    OrdersDB[(orders_db)]
    InventoryDB[(inventory_db)]
    PaymentDB[(payment_db)]
  end

  Client --> GW
  GW --> Auth & Catalog & Cart & Orders
  GW -.->|interno se precisar| Inventory & Payment

  Auth --> AuthDB
  Catalog --> CatalogDB
  Cart --> CartDB
  Orders --> OrdersDB
  Inventory --> InventoryDB
  Payment --> PaymentDB

  Auth & Catalog & Cart & Orders & Inventory & Payment -->|publish| MQ
  MQ -->|consume| Inventory & Orders & Cart & Payment & Notify
```

### Responsabilidades e portas

| Serviço | Porta | DB | HTTP (via gateway) | Consome eventos |
|---------|-------|-----|--------------------|-----------------|
| **api-gateway** | 3000 | — | proxy + valida JWT | — |
| **auth** | 3001 | auth_db | register, login | — |
| **catalog** | 3002 | catalog_db | CRUD produtos | — |
| **cart** | 3003 | cart_db | add/remove/list | `order.confirmed` → limpa |
| **orders** | 3004 | orders_db | criar/listar pedido | `stock.*`, `payment.*` |
| **inventory** | 3005 | inventory_db | consultar estoque | `order.created`, `order.confirmed`, `order.cancelled` |
| **payment** | 3006 | payment_db | — (interno) | `stock.reserved` |
| **notifications** | 3007 | — | — | `order.confirmed`, `order.cancelled`, `user.registered` |

`auth-middleware` é **pacote compartilhado** (verificação JWT), não um microserviço.

`notifications` e `api-gateway` não precisam de banco no início.

---

## Quando usar HTTP vs fila

```mermaid
flowchart TD
  Q{Precisa da resposta<br/>na mesma request?}
  Q -->|Sim| HTTP[HTTP síncrono]
  Q -->|Não| Queue[Publica evento]

  HTTP --> H1[Login / JWT]
  HTTP --> H2[Listar produtos]
  HTTP --> H3[Ver carrinho]
  HTTP --> H4[Criar pedido - aceitar PENDING]

  Queue --> Q1[Reservar estoque]
  Queue --> Q2[Cobrar pagamento]
  Queue --> Q3[Limpar carrinho]
  Queue --> Q4[Enviar email]
```

### Chamadas HTTP síncronas

```mermaid
flowchart LR
  GW[api-gateway]

  GW -->|POST /auth/register<br/>POST /auth/login| Auth
  GW -->|GET/POST /products| Catalog
  GW -->|GET/POST/DELETE /cart| Cart
  GW -->|POST/GET /orders| Orders
  GW -->|GET /inventory/:productId| Inventory

  Cart -.->|HTTP interno:<br/>valida produto/preço| Catalog
  Orders -.->|HTTP interno:<br/>lê itens do carrinho| Cart
```

Regra: efeitos em outro domínio **depois** de aceitar o pedido → **fila**, não HTTP encadeado longo.

---

## Contratos de eventos (RabbitMQ)

- **Exchange:** `ecommerce.events`
- **Tipo:** `topic`
- **Routing keys:** ver tabela abaixo

| Routing key | Publisher | Payload (essencial) | Consumers |
|-------------|-----------|---------------------|-----------|
| `user.registered` | auth | `{ userId, username }` | notifications |
| `product.created` | catalog | `{ productId, name, price }` | inventory (cria stock=0) |
| `product.updated` | catalog | `{ productId, price? }` | — (futuro) |
| `order.created` | orders | `{ orderId, userId, items[] }` | inventory |
| `stock.reserved` | inventory | `{ orderId, reservationId }` | orders, payment |
| `stock.rejected` | inventory | `{ orderId, reason }` | orders |
| `payment.succeeded` | payment | `{ orderId, paymentId }` | orders |
| `payment.failed` | payment | `{ orderId, reason }` | orders |
| `order.confirmed` | orders | `{ orderId, userId }` | cart, notifications, inventory (commit reserva) |
| `order.cancelled` | orders | `{ orderId, userId?, reason }` | notifications, inventory (libera reserva) |

### Mapa producers → eventos

```mermaid
flowchart LR
  subgraph producers [Producers]
    A[auth]
    C[catalog]
    O[orders]
    I[inventory]
    P[payment]
  end

  subgraph events [Routing keys]
    UserRegistered[user.registered]
    ProductCreated[product.created]
    ProductUpdated[product.updated]
    OrderCreated[order.created]
    StockReserved[stock.reserved]
    StockRejected[stock.rejected]
    PaymentSucceeded[payment.succeeded]
    PaymentFailed[payment.failed]
    OrderConfirmed[order.confirmed]
    OrderCancelled[order.cancelled]
  end

  A --> UserRegistered
  C --> ProductCreated & ProductUpdated
  O --> OrderCreated & OrderConfirmed & OrderCancelled
  I --> StockReserved & StockRejected
  P --> PaymentSucceeded & PaymentFailed
```

---

## Saga do checkout (coreografia)

O cliente **não espera** o saga inteiro: recebe `202` com `status: PENDING` e consulta `GET /orders/:id`.

### Estados do pedido

```mermaid
stateDiagram-v2
  [*] --> PENDING: POST /orders
  PENDING --> AWAITING_PAYMENT: StockReserved
  PENDING --> CANCELLED: StockRejected
  AWAITING_PAYMENT --> CONFIRMED: PaymentSucceeded
  AWAITING_PAYMENT --> CANCELLED: PaymentFailed
  CONFIRMED --> [*]
  CANCELLED --> [*]
```

### Sequência

```mermaid
sequenceDiagram
  participant C as Client
  participant GW as api-gateway
  participant O as orders
  participant MQ as RabbitMQ
  participant I as inventory
  participant P as payment
  participant Cart as cart
  participant N as notifications

  C->>GW: POST /orders
  GW->>O: cria Order PENDING
  O-->>C: 202 { orderId, status: PENDING }
  O->>MQ: order.created

  MQ->>I: reserve stock
  alt estoque ok
    I->>MQ: stock.reserved
    MQ->>P: charge
    alt pago
      P->>MQ: payment.succeeded
      MQ->>O: status CONFIRMED
      O->>MQ: order.confirmed
      MQ->>I: commit reservation
      MQ->>Cart: clear cart
      MQ->>N: email sucesso
    else falha pagamento
      P->>MQ: payment.failed
      MQ->>O: status CANCELLED
      O->>MQ: order.cancelled
      MQ->>I: release reservation
      MQ->>N: email falha
    end
  else sem estoque
    I->>MQ: stock.rejected
    MQ->>O: status CANCELLED
    O->>MQ: order.cancelled
    MQ->>N: email falha
  end
```

---

## Estrutura do monorepo (alvo)

```
ecommerce/
├── docker-compose.yml
├── package.json                 # workspaces (opcional)
├── packages/
│   └── auth-middleware/         # lib JWT — NÃO é serviço
├── services/
│   ├── api-gateway/
│   ├── auth/
│   ├── catalog/
│   ├── cart/
│   ├── orders/
│   ├── inventory/
│   ├── payment/
│   └── notifications/
└── docs/
    ├── architecture.md          # este arquivo
    ├── roadmap.md
    └── current-state.md
```

Cada serviço: Express + Prisma + Postgres próprio + publisher/consumer RabbitMQ.

---

## Compose raiz

Arquivo **`docker-compose.yml`** na raiz do monorepo.

**Fase 1 (implementado):** `rabbitmq`, `auth-db`, `auth`.  
**Próximas fases:** demais DBs e serviços conforme o roadmap.

| Serviço | Imagem / build | Portas (host) |
|---------|----------------|---------------|
| rabbitmq | `rabbitmq:3-management` | 5672 (AMQP), 15672 (UI) |
| auth-db | `postgres:13` | 5433 → 5432 (default no `.env.example`) |
| auth | build `services/auth/Dockerfile` (contexto = raiz do repo) | 3001 → 3000 |

Onboarding: `cp .env.example .env`, editar `JWT_HASH`, depois `docker compose up --build`.

O build do `auth` usa contexto na **raiz** do monorepo porque depende de `packages/auth-middleware` (`file:../../...`). Auth ainda **não publica** eventos no RabbitMQ — o broker sobe no stack para as fases seguintes.

Esqueleto alvo (serviços futuros):

```yaml
services:
  rabbitmq: ...
  auth-db: ...
  catalog-db: ...
  cart-db: ...
  orders-db: ...
  inventory-db: ...
  payment-db: ...
  auth: ...
  catalog: ...
  cart: ...
  orders: ...
  inventory: ...
  payment: ...
  notifications: ...
  api-gateway: ...
```

Preferência pedagógica: **um container Postgres por serviço** (ou um Postgres com vários databases, se o Compose ficar pesado demais no início).

---

## Princípios do projeto

1. **Um bounded context = um serviço = um banco.**
2. **HTTP para pergunta/resposta; eventos para “aconteceu X”.**
3. **Checkout assíncrono** — aceitar rápido, processar via fila.
4. **Saga coreografada** — cada serviço reage a eventos e publica o próximo.
5. **Overkill intencional** — priorizar aprendizado de padrões sobre simplicidade.
6. **Idempotência nos consumers** — processar o mesmo evento duas vezes não deve corromper estado (meta da fase de polish).

---

## Referências internas

- [Roadmap de implementação](./roadmap.md)
- [Estado atual do código](./current-state.md)

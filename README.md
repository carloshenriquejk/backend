# Backend API

REST API construída com NestJS seguindo arquitetura limpa e boas práticas de produção.

## Arquitetura

```
src/
  auth/           # JWT + Passport (register, login, guards, strategies)
  products/       # CRUD com repository pattern, cache e upload de imagem
  queues/         # BullMQ workers (processamento assíncrono)
  common/         # Filtros, interceptors e decorators reutilizáveis
  prisma/         # PrismaService global
  main.ts         # Servidor HTTP
  worker.ts       # Entry point exclusivo dos workers (sem HTTP)
```

**Stack:** NestJS · PostgreSQL · Prisma ORM · BullMQ · Redis · JWT · Docker

## Pré-requisitos

- Node.js 22+
- Docker Desktop
- npm 10+

## Configuração

```bash
cp .env.example .env
```

Edite `.env` conforme necessário (os valores padrão funcionam com Docker).

## Subir com Docker

```bash
# Sobe PostgreSQL e Redis
docker compose up -d postgres redis

# Verifica se estão saudáveis
docker compose ps
```

## Migrations e Seed

```bash
# Criar/aplicar migrations
npx prisma migrate dev

# Popular banco com dados de teste
npm run prisma:seed
```

## Desenvolvimento

```bash
npm install
npm run start:dev       # API em modo watch — http://localhost:3000
```

## Workers (BullMQ)

```bash
# Em outro terminal
npm run start:worker
```

O worker processa jobs da fila `product-processing` (otimização de imagem, indexação, notificações).

## Testes

```bash
npm test              # Todos os testes unitários
npm run test:cov      # Com relatório de cobertura
```

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run start:dev` | API em modo desenvolvimento (hot reload) |
| `npm run start:prod` | API em produção (requer build) |
| `npm run start:worker` | Worker BullMQ |
| `npm run build` | Compila TypeScript |
| `npm test` | Testes unitários |
| `npm run test:cov` | Testes com cobertura |
| `npm run lint` | ESLint + fix automático |
| `npm run prisma:migrate` | Aplica migrations |
| `npm run prisma:seed` | Popula o banco com dados de teste |

## Endpoints da API

Base URL: `http://localhost:3000/api/v1`

### Auth

| Método | Rota | Auth | Body |
|--------|------|------|------|
| POST | `/auth/register` | — | `{ name, email, password }` |
| POST | `/auth/login` | — | `{ email, password }` |

### Products

| Método | Rota | Auth | Body / Query |
|--------|------|------|-------------|
| POST | `/products` | JWT | `{ name, category, price, description?, stock? }` + `image` (multipart) |
| GET | `/products` | JWT | `?category=&page=&limit=&search=` |
| GET | `/products/:id` | JWT | — |
| PATCH | `/products/:id` | JWT | campos parciais do produto |
| DELETE | `/products/:id` | JWT | — |

> Todos os endpoints de produtos exigem header `Authorization: Bearer <token>`.

## Credenciais de teste (após seed)

```
Email:    test@example.com
Password: Test@1234
```

Exemplo de fluxo:

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}' | jq -r '.access_token')

# Listar produtos
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/products | jq .
```

## Decisões arquiteturais

| Decisão | Motivo |
|---------|--------|
| **Repository Pattern** | Desacopla a lógica de negócio do Prisma — facilita testes unitários com mocks |
| **PrismaModule `@Global()`** | Evita reimportar em cada módulo sem perder controle de injeção |
| **BullMQ separado em `worker.ts`** | Workers podem escalar independentemente da API HTTP |
| **Cache por chave `userId+filtros`** | Garante isolamento entre usuários e invalidação precisa |
| **`HttpExceptionFilter` global** | Resposta padronizada em todos os erros, com log de 5xx |
| **Prisma 5 (não v7)** | Prisma 7 usa ESM puro, incompatível com o setup CommonJS do NestJS |
| **`@CurrentUser()` decorator** | Elimina o acoplamento direto ao `@Request()` nos controllers |

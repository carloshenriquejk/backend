# Backend API

API REST production-ready construída com NestJS, PostgreSQL, BullMQ e Redis, seguindo Clean Architecture com separação em camadas (controller → service → repository).

## Stack

| Tecnologia | Uso |
|------------|-----|
| NestJS 11 | Framework HTTP |
| PostgreSQL | Banco de dados relacional |
| Prisma ORM 5 | Acesso ao banco + migrations |
| BullMQ + Redis | Filas de processamento assíncrono |
| Redis (cache-manager) | Cache de listagens |
| JWT + Passport | Autenticação |
| Multer | Upload de imagens |
| Swagger/OpenAPI | Documentação interativa |
| Docker + Docker Compose | Containerização |
| ESLint + Prettier + Husky | Qualidade de código |
| Jest | Testes unitários |

## Arquitetura

```
src/
├── auth/               # Autenticação JWT + Local strategies
│   ├── dto/            # RegisterDto, LoginDto
│   ├── guards/         # JwtAuthGuard, LocalAuthGuard
│   └── strategies/     # jwt.strategy, local.strategy
├── products/           # CRUD de produtos
│   ├── dto/            # CreateProductDto, UpdateProductDto, PaginateProductsDto
│   └── repositories/   # ProductsRepository (Repository Pattern)
├── queues/             # BullMQ
│   └── processors/     # ProductProcessor (otimização, indexação, notificação)
├── prisma/             # PrismaService global
├── common/             # Utilitários reutilizáveis
│   ├── decorators/     # @CurrentUser()
│   ├── filters/        # HttpExceptionFilter global
│   ├── interceptors/   # LoggingInterceptor global
│   └── multer/         # Configuração de upload
├── main.ts             # Entry point da API HTTP
└── worker.ts           # Entry point do worker BullMQ (processo separado)
```

## Fluxo de criação de produto

```
POST /products
      │
      ▼
ProductsService.create()
      │
      ├─ Salva no PostgreSQL via ProductsRepository
      ├─ Enfileira job no BullMQ (product.created)
      └─ Invalida cache Redis do usuário
             │
             ▼ (worker.ts — processo independente)
       ProductProcessor
             ├─ optimizeImage  (2s)
             ├─ indexProduct   (500ms)
             └─ sendNotification (200ms)
```

## Pré-requisitos

- Node.js 20+
- Docker Desktop

## Setup local

### 1. Clone e instale

```bash
git clone https://github.com/carloshenriquejk/backend.git
cd backend
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
```

Os valores padrão já funcionam com o Docker Compose:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/backend_db
JWT_SECRET=sua-chave-secreta-longa-e-aleatoria
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

### 3. Suba PostgreSQL e Redis

```bash
docker compose up -d
docker compose ps   # confirme que estão "healthy"
```

### 4. Execute as migrations

```bash
npm run prisma:migrate
```

### 5. Popule o banco

```bash
npm run prisma:seed
```

Cria:
- Usuário admin: `test@example.com` / `Test@1234`
- 3 produtos de exemplo

### 6. Inicie a API

```bash
npm run start:dev       # desenvolvimento (hot reload)
```

### 7. Inicie o worker (terminal separado)

```bash
npm run start:worker
```

API disponível em `http://localhost:3000/api/v1`
Swagger em `http://localhost:3000/docs`

## Como rodar migrations em produção

```bash
DATABASE_URL="postgresql://user:pass@host:port/db" npx prisma migrate deploy
DATABASE_URL="postgresql://user:pass@host:port/db" npm run prisma:seed
```

## Como subir workers e filas

O worker é um processo Node.js separado que consome a fila `product-processing` do Redis. Em produção (Railway), é um serviço independente configurado em `railway.worker.toml`:

```bash
node dist/worker.js
```

Variáveis necessárias: `DATABASE_URL`, `REDIS_URL` (ou `REDIS_HOST`/`REDIS_PORT`).

## Como executar testes

```bash
npm test              # unitários
npm run test:cov      # com relatório de cobertura
```

Cobertura:
- `AuthService`: 10 casos (registro, login, validação, erros)
- `ProductsService`: 8 casos (CRUD, cache, fila)

## Endpoints

Base URL: `http://localhost:3000/api/v1`

### Auth (público)

| Método | Rota | Body |
|--------|------|------|
| POST | `/auth/register` | `{ name, email, password }` |
| POST | `/auth/login` | `{ email, password }` |

### Products (requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/products` | Criar produto (multipart/form-data — aceita campo `image`) |
| GET | `/products` | Listar com paginação (`?page=&limit=&category=&search=`) |
| GET | `/products/:id` | Buscar por ID |
| PATCH | `/products/:id` | Atualizar parcialmente |
| DELETE | `/products/:id` | Remover |

### Health

| Método | Rota |
|--------|------|
| GET | `/health` |

> Documentação interativa completa em `/docs` (Swagger UI).

## Credenciais de teste

```
Email:    test@example.com
Senha:    Test@1234
Role:     ADMIN
```

Exemplo de uso via curl:

```bash
# 1. Login e captura do token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}' | jq -r '.access_token')

# 2. Listar produtos
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/products?page=1&limit=10" | jq .

# 3. Criar produto
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -F "name=Produto Teste" \
  -F "category=eletronicos" \
  -F "price=99.90" \
  -F "stock=10"
```

## Deploy (Railway)

Configurado via `railway.toml` (API) e `railway.worker.toml` (worker).

### Variáveis do serviço API

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | string aleatória longa |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` |

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run start:dev` | API em modo desenvolvimento |
| `npm run start:prod` | API em produção |
| `npm run start:worker` | Worker BullMQ |
| `npm run build` | Compila TypeScript |
| `npm test` | Testes unitários |
| `npm run test:cov` | Testes com cobertura |
| `npm run lint` | ESLint com auto-fix |
| `npm run prisma:migrate` | Cria e aplica migrations |
| `npm run prisma:seed` | Popula o banco |

## Decisões arquiteturais

| Decisão | Motivo |
|---------|--------|
| **Repository Pattern** | Desacopla negócio do Prisma — facilita mocks nos testes |
| **Worker como processo separado** | Falha na fila não derruba a API; escala independentemente |
| **Cache com chave `userId+filtros`** | Isolamento entre usuários e invalidação precisa |
| **Produtos escopados por usuário** | Modelo marketplace — cada usuário gerencia seus próprios produtos |
| **HttpExceptionFilter global** | Resposta padronizada em todos os erros, com stack trace em 5xx |
| **Prisma 5 (não v7)** | Prisma 7 usa ESM puro, incompatível com o CommonJS do NestJS |
| **`@CurrentUser()` decorator** | Elimina acoplamento direto ao `@Request()` nos controllers |
| **BullMQ retry exponencial** | Jobs falhos são reprocessados até 3× com backoff |

# 🍪 Crazy Cookies E-commerce

E-commerce escalable para venta de galletas y postres artesanales, construido con arquitectura moderna y modular.

## 🚀 Stack Tecnológico

### Backend
- **Framework**: NestJS 10
- **Language**: TypeScript (strict mode)
- **Database**: MySQL 8.0
- **ORM**: Prisma 5
- **Authentication**: JWT + Bcrypt
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer + Sharp
- **Email**: Nodemailer
- **Testing**: Jest (unit + integration + e2e)
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Validation**: Zod
- **Testing**: Vitest (unit) + Playwright (e2e)
- **State Management**: React Context API

### DevOps
- **Containerization**: Docker + Docker Compose
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + Commitlint
- **CI/CD**: GitHub Actions

## 📁 Estructura del Proyecto

```
crazy-cookies-ecommerce/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/        # Módulos por dominio
│   │   ├── common/         # Guards, filters, pipes, interceptors
│   │   ├── config/         # Configuración
│   │   └── database/       # Prisma + seeds
│   ├── test/               # Tests
│   └── uploads/            # Archivos subidos (gitignored)
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router (pages)
│   │   ├── features/      # Features (lógica + componentes)
│   │   ├── components/    # Componentes compartidos
│   │   ├── lib/           # Utilidades
│   │   └── types/         # Tipos globales
│   └── test/              # Tests
├── docker/                # Dockerfiles
├── docs/                  # Documentación
├── .github/               # GitHub Actions
├── .husky/                # Git hooks
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## 🎯 Características Principales

### Para Clientes
- ✅ Catálogo de productos con categorías
- ✅ Búsqueda y filtros avanzados
- ✅ Carrito de compras (sin login requerido)
- ✅ Checkout con formulario de datos
- ✅ Integración con WhatsApp para confirmación de órdenes
- ✅ Sistema de reviews y ratings
- ✅ Responsive design (mobile-first)

### Para Administradores
- ✅ Panel de administración completo
- ✅ Autenticación JWT (solo admin)
- ✅ CRUD de productos y categorías
- ✅ Gestión de inventario avanzado (stock disponible/reservado/mínimo)
- ✅ Gestión de órdenes con estados
- ✅ Moderación de reviews
- ✅ Sistema de notificaciones (email + WhatsApp)
- ✅ Logs y auditoría completa
- ✅ Dashboard con estadísticas

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker y Docker Compose
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/der-matt02/E-commerce-Crazy-Cookies.git
cd E-commerce-Crazy-Cookies
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local

# Root (para Docker)
cp .env.example .env
```

**Importante**: Actualiza las variables de entorno con tus credenciales reales.

### 4. Levantar la base de datos

```bash
docker-compose up -d
```

Esto levantará MySQL en el puerto 3306.

### 5. Ejecutar migraciones y seeds

```bash
cd backend
pnpm db:migrate
pnpm db:seed
```

**Credenciales de admin creadas**:
- Email: `admin@crazycookies.com`
- Password: `Admin123!`

### 6. Iniciar el proyecto

#### Opción 1: Ambos servicios en paralelo
```bash
# Desde la raíz del proyecto
pnpm dev
```

#### Opción 2: Servicios separados
```bash
# Backend (puerto 3000)
cd backend
pnpm start:dev

# Frontend (puerto 3001)
cd frontend
pnpm dev
```

### 7. Acceder a la aplicación

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Docs**: http://localhost:3000/api/docs
- **Prisma Studio**: `pnpm db:studio` (puerto 5555)

## 🧪 Testing

### Backend

```bash
cd backend

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

### Frontend

```bash
cd frontend

# Unit tests (Vitest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# E2E con UI
pnpm test:e2e:ui
```

## 🎨 Linting y Formato

```bash
# Lint
pnpm lint

# Format
pnpm format

# Format check (CI)
pnpm format:check
```

## 📦 Build para Producción

```bash
# Build todo
pnpm build

# Build backend
cd backend && pnpm build

# Build frontend
cd frontend && pnpm build
```

## 🐳 Docker Production

```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## 📖 Documentación Adicional

- [Arquitectura](docs/ARCHITECTURE.md) - Decisiones técnicas y diagramas
- [API](docs/API.md) - Endpoints y ejemplos
- [Deployment](docs/DEPLOYMENT.md) - Guía de despliegue
- [Development](docs/DEVELOPMENT.md) - Guía para desarrolladores

## 🗺️ Roadmap

### ✅ Fase 1: Fundación (Completada)
- Monorepo con pnpm workspaces
- Backend NestJS + Prisma
- Frontend Next.js 14
- Docker Compose con MySQL
- Configuración de ESLint, Prettier, Husky

### 🚧 Fase 2: Autenticación y Admin (En progreso)
- Login JWT para administradores
- Panel de administración básico
- Guards y middleware de seguridad

### 📅 Fase 3-12: Futuras Fases
Ver [Plan de Implementación](C:\Users\Mbaquero\.claude\plans\ancient-sparking-volcano.md) para detalles completos.

## 🤝 Contribución

Este proyecto sigue **GitFlow**:

- `main`: Producción estable
- `develop`: Desarrollo activo
- `feature/*`: Nuevas características
- `release/*`: Preparación de releases
- `hotfix/*`: Fixes urgentes

### Convención de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add product search feature
fix: resolve cart persistence issue
docs: update API documentation
style: format code with prettier
refactor: simplify inventory service
test: add unit tests for orders
chore: update dependencies
```

## 📄 Licencia

MIT © Crazy Cookies

## 👥 Autores

- Equipo Crazy Cookies

## 🔗 Enlaces

- **Repositorio**: https://github.com/der-matt02/E-commerce-Crazy-Cookies
- **Issues**: https://github.com/der-matt02/E-commerce-Crazy-Cookies/issues
- **Documentación**: [Ver docs/](docs/)

---

Hecho con ❤️ y ☕ por el equipo de Crazy Cookies

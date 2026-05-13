<!--
INSTRUCCIONES DE FORMATO PARA WORD (aplicar al convertir este documento):
- Fuente general: Arial 12
- Títulos (Heading 1): Arial 14, negrita, color negro
- Subtítulos (Heading 2): Arial 13, negrita, color negro
- Subtítulos menores (Heading 3): Arial 12, negrita, color negro
- Sin colores azules en ningún heading
- Interlineado: 1.15
- Márgenes: Normal (2.54 cm)
- Insertar tabla de contenido automática al inicio
-->

---

**UNIVERSIDAD DE LAS AMÉRICAS — UDLA**
Facultad de Ingeniería y Ciencias Aplicadas
Ingeniería en Software

| | |
|---|---|
| **Materia:** | Procesos de Software |
| **Docente:** | Por definir |
| **Semestre:** | 202510 |
| **Fecha:** | Mayo 2026 |
| **Autores:** | Mathew Baquero · Luis Pineda |

---

# Pipeline CI con CircleCI — E-commerce Crazy Cookies

---

## 1. ¿Qué hicimos y por qué?

El objetivo fue construir un **pipeline de Integración Continua (CI)** profesional usando CircleCI sobre el mismo monorepo TypeScript con backend NestJS y frontend Next.js. A diferencia de Jenkins —que corre en un servidor propio— CircleCI es una plataforma de CI/CD en la nube: no hay servidor que mantener, los jobs corren en contenedores efímeros y el pipeline se define completamente en un archivo `.circleci/config.yml` dentro del repositorio.

Se implementaron tres estrategias clave que se usan en equipos de desarrollo reales:

- **Paralelismo** con `circleci tests split` para distribuir tests entre múltiples contenedores
- **Workspace compartido** para evitar reinstalar dependencias en cada job
- **Notificaciones post-acción** con condiciones `when: on_fail`, `when: on_success` y `when: always`

---

## 2. Arquitectura general

```
GitHub (rama main)
    └── push → CircleCI detecta cambio automáticamente
            │
            ▼
    Workflow "ci" — 5 stages secuenciales
    ┌─────────────────────────────────────────────────────────┐
    │  Stage 1: install                                        │
    │      └── instala deps, genera Prisma, persiste workspace │
    │                                                          │
    │  Stage 2: calidad (4 jobs en paralelo)                  │
    │      ├── lint-backend                                    │
    │      ├── lint-frontend                                   │
    │      ├── typecheck-backend                               │
    │      └── typecheck-frontend                              │
    │                                                          │
    │  Stage 3: tests (3 jobs en paralelo)                    │
    │      ├── test-backend-unit  (parallelism: 4)            │
    │      ├── test-backend-e2e  (con MySQL real)             │
    │      └── test-frontend      (parallelism: 2)            │
    │                                                          │
    │  Stage 4: build (2 jobs en paralelo)                    │
    │      ├── build-backend                                   │
    │      └── build-frontend                                  │
    │                                                          │
    │  Stage 5: notify-pipeline-result                        │
    └─────────────────────────────────────────────────────────┘
```

**Por qué usar CircleCI y no seguir con Jenkins:**
Jenkins requiere un servidor propio (en Docker o VM) que hay que mantener, actualizar y monitorear. CircleCI es un servicio gestionado: los contenedores se crean al inicio de cada job y se destruyen al final. No hay estado residual entre ejecuciones, lo que garantiza builds reproducibles.

---

## 3. Estrategia 1 — Executors y workspace compartido

En CircleCI, un *executor* define el entorno donde corre un job. Se definieron dos:

```yaml
executors:
  node-default:
    docker:
      - image: cimg/node:18.20
    working_directory: ~/project
    resource_class: medium

  node-mysql:
    docker:
      - image: cimg/node:18.20
        environment:
          DATABASE_URL: mysql://crazy_cookies_user:secure_password@127.0.0.1:3306/crazy_cookies_test
          NODE_ENV: test
          JWT_SECRET: ci-test-secret-key-not-for-production
          JWT_REFRESH_SECRET: ci-test-refresh-secret-not-for-production
          BACKEND_PORT: "3000"
          CORS_ORIGIN: http://localhost:3001
      - image: mysql:8.0
        environment:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: crazy_cookies_test
          MYSQL_USER: crazy_cookies_user
          MYSQL_PASSWORD: secure_password
    working_directory: ~/project
    resource_class: medium
```

**Por qué dos executors:**
Los tests unitarios no necesitan base de datos. Los tests E2E sí. Separar los executors significa que MySQL solo se levanta cuando es necesario, sin contaminar los otros jobs.

### 3.1 Workspace compartido

CircleCI no comparte archivos entre jobs por defecto. Para evitar reinstalar `node_modules` en cada job (lo que tomaría varios minutos adicionales), el job `install` persiste todo el directorio:

```yaml
- persist_to_workspace:
    root: ~/project
    paths:
      - .
```

Y cada job posterior lo adjunta:

```yaml
- attach_workspace:
    at: ~/project
```

**Por qué esto importa:**
`node_modules` pesa varios cientos de MB. Instalarlo 11 veces (una por job) tomaría aproximadamente 15 minutos en total. Con workspace compartido, solo se instala una vez y el resto de jobs arranca en segundos.

---

## 4. Estrategia 2 — Commands reutilizables (DRY)

En lugar de repetir los mismos pasos en cada job, se definieron tres comandos reutilizables:

```yaml
commands:

  setup-pnpm:
    description: Activar pnpm via corepack y restaurar caché
    steps:
      - run:
          name: Enable pnpm via corepack
          command: |
            corepack enable
            corepack prepare pnpm@9 --activate
            pnpm config set store-dir ~/.pnpm-store
      - restore_cache:
          keys:
            - pnpm-v2-{{ checksum "pnpm-lock.yaml" }}
            - pnpm-v2-

  restore-workspace:
    description: Adjuntar workspace y activar pnpm via corepack
    steps:
      - attach_workspace:
          at: ~/project
      - run:
          name: Enable pnpm via corepack
          command: |
            corepack enable
            corepack prepare pnpm@9 --activate

  notify-on-fail:
    description: Registrar fallo en log (post action on_fail)
    steps:
      - run:
          name: "[POST] Notificacion — fallo"
          when: on_fail
          command: |
            echo "FALLO EN PIPELINE"
            echo "Job: ${CIRCLE_JOB} | Branch: ${CIRCLE_BRANCH}"
            echo "Commit: ${CIRCLE_SHA1} | Autor: ${CIRCLE_USERNAME}"
            echo "URL: ${CIRCLE_BUILD_URL}"
```

### 4.1 Decisión técnica: corepack en lugar de npm install -g pnpm

En las imágenes `cimg/node`, el usuario es `circleci` y no tiene permisos de escritura en `/usr/local/lib/node_modules/`. Intentar `npm install -g pnpm` produce un error de permisos (`EACCES`). La solución correcta es `corepack`, que viene incluido con Node.js 16.9+ y gestiona package managers sin necesitar permisos de administrador. Se usa pnpm@9 porque el `pnpm-lock.yaml` del proyecto tiene `lockfileVersion: '9.0'`.

### 4.2 Por qué notify-on-fail como command reutilizable

La clave `when: on_fail` en CircleCI hace que un paso se ejecute **solo si el job falló**. Al definirlo como command reutilizable, se agrega `- notify-on-fail` al final de cada job y automáticamente registra qué job falló, en qué rama, con qué commit y quién lo hizo, sin repetir código. Es el principio DRY (Don't Repeat Yourself) aplicado a pipelines.

---

## 5. Estrategia 3 — Paralelismo con circleci tests split

CircleCI tiene soporte nativo para distribuir tests entre múltiples contenedores idénticos. Esto se configura con la clave `parallelism` y los comandos `circleci tests glob` + `circleci tests split`.

### 5.1 Tests unitarios del backend (parallelism: 4)

```yaml
test-backend-unit:
  executor: node-default
  parallelism: 4
  steps:
    - restore-workspace
    - run:
        name: Split & run unit tests
        command: |
          cd backend

          SPEC_FILES=$(
            circleci tests glob "src/**/*.spec.ts" \
              | circleci tests split --split-by=timings --timings-type=filename \
              | tr '\n' ' '
          )

          pnpm exec jest ${SPEC_FILES} \
            --coverage \
            --coverageDirectory=../coverage/unit \
            --forceExit \
            --runInBand
```

**Cómo funciona:**

1. `circleci tests glob "src/**/*.spec.ts"` lista todos los archivos de test
2. `circleci tests split --split-by=timings` los distribuye entre los 4 contenedores según tiempos históricos de ejecución (en el primer run, distribuye por nombre de archivo)
3. Cada contenedor ejecuta solo su porción de tests

**Resultado práctico:**
Si hay 20 archivos de test y cada uno tarda 5 segundos, en un solo contenedor tardaría 100 segundos. Con 4 contenedores en paralelo, tarda aproximadamente 25 segundos.

### 5.2 Tests del frontend (parallelism: 2)

```yaml
test-frontend:
  executor: node-default
  parallelism: 2
  steps:
    - restore-workspace
    - run:
        name: Split & run frontend tests
        command: |
          cd frontend

          TEST_FILES=$(
            circleci tests glob "src/**/*.{test,spec}.{ts,tsx}" \
              | circleci tests split --split-by=timings --timings-type=filename \
              | tr '\n' ' '
          )

          pnpm exec vitest run --passWithNoTests ${TEST_FILES}
```

La opción `--passWithNoTests` permite que el job pase aunque no haya tests asignados a un contenedor, evitando falsos negativos.

---

## 6. Estrategia 4 — Notificaciones post-acción

CircleCI tiene un mecanismo nativo de `when` que permite ejecutar pasos según el resultado del job. Se implementaron en dos niveles:

### 6.1 Nivel job: notify-on-fail

Todo job que puede fallar termina con `- notify-on-fail`, que usa `when: on_fail`:

```yaml
- run:
    name: "[POST] Notificacion — fallo"
    when: on_fail
    command: |
      echo "FALLO EN PIPELINE"
      echo "Job: ${CIRCLE_JOB} | Branch: ${CIRCLE_BRANCH}"
      echo "Commit: ${CIRCLE_SHA1} | Autor: ${CIRCLE_USERNAME}"
      echo "URL: ${CIRCLE_BUILD_URL}"
```

### 6.2 Nivel pipeline: notify-pipeline-result

El último job del workflow tiene dos pasos con condiciones distintas:

```yaml
notify-pipeline-result:
  executor: node-default
  steps:
    - run:
        name: "[POST] Notificacion — exito"
        when: on_success
        command: |
          echo "PIPELINE COMPLETADO EXITOSAMENTE"
          echo "Repo: ${CIRCLE_PROJECT_REPONAME}"
    - run:
        name: "[POST] Cierre del pipeline"
        when: always
        command: |
          echo "Pipeline finalizado — Build #${CIRCLE_BUILD_NUM}"
```

| Condición | Cuándo corre |
|-----------|-------------|
| `when: on_fail` | Solo si el job o paso anterior falló |
| `when: on_success` | Solo si todo completó sin errores |
| `when: always` | Siempre, sin importar el resultado |

**Por qué no usar Slack:**
CircleCI tiene integración nativa con Slack vía Orb, pero requiere configurar un webhook y permisos adicionales. Para el propósito de esta tarea —demostrar acciones post— el mecanismo `when:` nativo es suficiente y no depende de servicios externos. CircleCI además envía emails automáticos al committer cuando un build falla.

---

## 7. Tests E2E con base de datos real

El job `test-backend-e2e` usa el executor `node-mysql` que levanta un contenedor MySQL 8.0 como servicio. Los tests necesitan que la base de datos esté lista antes de migrar:

```yaml
test-backend-e2e:
  executor: node-mysql
  steps:
    - restore-workspace
    - run:
        name: Wait for MySQL
        command: |
          for i in $(seq 1 30); do
            if (echo > /dev/tcp/127.0.0.1/3306) 2>/dev/null; then
              echo "MySQL listo tras ${i} intentos."
              exit 0
            fi
            echo "Esperando MySQL... ${i}/30"
            sleep 2
          done
          echo "ERROR: MySQL no respondió en 60 s." && exit 1
    - run:
        name: Generate Prisma client
        command: pnpm --filter backend db:generate
    - run:
        name: Apply migrations
        command: pnpm --filter backend db:migrate:deploy
    - run:
        name: Run e2e tests
        command: pnpm --filter backend test:e2e
    - notify-on-fail
```

**Técnica /dev/tcp para esperar MySQL:**
Es un mecanismo de Bash que intenta abrir una conexión TCP al puerto 3306. Si MySQL aún no está listo, el comando falla silenciosamente. El loop espera hasta 60 segundos (30 intentos por 2 segundos) antes de declarar error.

**Por qué aplicar migraciones y no usar un seed:**
`prisma migrate deploy` aplica las migraciones en orden sobre la base de datos vacía, garantizando que el esquema en CI coincide exactamente con el de producción. Un seed podría estar desactualizado respecto al schema real.

---

## 8. Decisiones técnicas que resolvieron problemas reales

### 8.1 Prisma generate en el job install

El cliente Prisma (`@prisma/client`) genera tipos TypeScript automáticamente. La imagen `cimg/node:18.20` no tiene el cliente pre-generado. Sin este paso, todos los jobs de TypeScript fallaban con 125 errores del tipo: `Module '@prisma/client' has no exported member 'OrderStatus'`.

```yaml
- run:
    name: Generate Prisma client
    command: pnpm --filter backend db:generate
```

Se agrega en el job `install` para que el workspace ya incluya el cliente generado. Los jobs de compilación también lo regeneran por precaución.

### 8.2 moduleNameMapper en jest-e2e.json

Los tests E2E importan `AppModule`, que a su vez usa path aliases TypeScript (`@modules/*`, `@common/*`, `@config/*`, `@database/*`). Jest no sabe cómo resolver estos aliases sin configuración explícita.

```json
{
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1",
    "^@modules/(.*)$": "<rootDir>/../src/modules/$1",
    "^@common/(.*)$": "<rootDir>/../src/common/$1",
    "^@config/(.*)$": "<rootDir>/../src/config/$1",
    "^@database/(.*)$": "<rootDir>/../src/database/$1"
  }
}
```

`<rootDir>` en este contexto es el directorio `test/`, por lo que `<rootDir>/../src/modules/$1` resuelve correctamente a `backend/src/modules/`.

### 8.3 Autenticación JWT en tests E2E

Algunos endpoints del API requieren autenticación admin (`@UseGuards(JwtAuthGuard)`): actualizar estado de orden y aprobar reseñas. El test crea un admin temporal en la base de datos, hace login para obtener el JWT, y lo incluye en las peticiones protegidas:

```typescript
// Obtener token en beforeAll
const loginResponse = await request(app.getHttpServer())
  .post('/auth/login')
  .send({ email: 'test-admin@e2e.com', password: 'TestPass123!' });
authToken = loginResponse.body.token;

// Usar token en petición protegida
await request(app.getHttpServer())
  .patch(`/orders/${orderId}/status`)
  .set('Authorization', `Bearer ${authToken}`)
  .send({ status: 'CONFIRMED', note: 'Order confirmed by test' });
```

El admin se crea con `bcrypt.hash` directamente en la base de datos de test y se elimina en el `afterAll` del cleanup.

### 8.4 Campos DECIMAL de MySQL devueltos como string

La respuesta del API para `order.total` llega como `"35700"` (string) porque MySQL devuelve los campos `DECIMAL` como cadenas de texto. La aserción del test usaba `toBeGreaterThan(0)` que requiere un número:

```typescript
// Incorrecto — falla porque "35700" es string
expect(response.body.total).toBeGreaterThan(0);

// Correcto — convierte a número antes de comparar
expect(Number(response.body.total)).toBeGreaterThan(0);
```

---

## 9. Grafo de dependencias del workflow

```
install
  ├── lint-backend  ─────────────────────────────────────────┐
  ├── lint-frontend ─────────────────────────────────────────┤
  ├── typecheck-backend ───────────────────────────────────── ┤
  └── typecheck-frontend ──────────────────────────────────── ┤
                                                              │
                   ┌── test-backend-unit (parallelism: 4) ───┤
                   ├── test-backend-e2e  (MySQL service)  ───┤
                   └── test-frontend     (parallelism: 2) ───┤
                                                              │
                             ┌── build-backend ──────────────┤
                             └── build-frontend ─────────────┤
                                                              │
                                notify-pipeline-result ───────┘
```

Los stages de calidad (lint, typecheck) deben pasar antes de correr los tests. Los tests deben pasar antes de compilar. Todo el pipeline debe completar antes de notificar el resultado.

---

## 10. Nivel de complejidad

| Concepto | Nivel |
|----------|-------|
| Workflow con múltiples jobs y dependencias `requires` | Básico |
| Executors personalizados (node-default, node-mysql) | Básico |
| Commands reutilizables (setup-pnpm, restore-workspace) | Intermedio |
| Workspace compartido entre jobs (`persist_to_workspace`) | Intermedio |
| Caché del pnpm store con `save_cache` / `restore_cache` | Intermedio |
| Paralelismo con `circleci tests split --split-by=timings` | Avanzado |
| MySQL como servicio en executor con espera `/dev/tcp` | Avanzado |
| Post-acciones `when: on_fail / on_success / always` | Intermedio |
| Tests E2E con JWT y admin temporal en base de datos real | Avanzado |
| Diagnóstico y corrección de errores iterativos en CI cloud | Avanzado |

Lo que hace este pipeline de nivel **intermedio-avanzado** no es ninguna técnica por separado, sino la combinación de todas. Un pipeline que solo hace checkout + build es trivial. Este pipeline ejecuta sobre infraestructura cloud sin estado, con paralelismo real distribuido entre contenedores, una base de datos real para los tests E2E, y un sistema de notificaciones sin dependencias externas. Son 11 jobs que forman un grafo de dependencias donde cada etapa solo avanza si la anterior fue exitosa.

---

## 11. Resultado final

```
Workflow: ci — rama main — commit 66302a5
├── install                  ✅  1m 02s
├── lint-backend             ✅    17s
├── lint-frontend            ✅    17s
├── typecheck-backend        ✅    22s
├── typecheck-frontend       ✅    23s
├── test-backend-unit        ✅    24s  (4 contenedores paralelos)
├── test-backend-e2e         ✅    41s  (MySQL real + 18 tests)
├── test-frontend            ✅    13s  (2 contenedores paralelos)
├── build-backend            ✅    22s
├── build-frontend           ✅  1m 13s
└── notify-pipeline-result   ✅    15s
                                 ─────
                           Total: 9m 11s
```

Todos los jobs en verde. El job `notify-pipeline-result` se ejecuta como confirmación de que la cadena completa de dependencias completó sin errores.

---

## 12. config.yml completo

```yaml
version: 2.1

# ─────────────────────────────────────────────────────────────────────────────
# Executors
# ─────────────────────────────────────────────────────────────────────────────
executors:

  node-default:
    docker:
      - image: cimg/node:18.20
    working_directory: ~/project
    resource_class: medium

  node-mysql:
    docker:
      - image: cimg/node:18.20
        environment:
          DATABASE_URL: mysql://crazy_cookies_user:secure_password@127.0.0.1:3306/crazy_cookies_test
          NODE_ENV: test
          JWT_SECRET: ci-test-secret-key-not-for-production
          JWT_REFRESH_SECRET: ci-test-refresh-secret-not-for-production
          BACKEND_PORT: "3000"
          CORS_ORIGIN: http://localhost:3001
      - image: mysql:8.0
        environment:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: crazy_cookies_test
          MYSQL_USER: crazy_cookies_user
          MYSQL_PASSWORD: secure_password
    working_directory: ~/project
    resource_class: medium

# ─────────────────────────────────────────────────────────────────────────────
# Commands reutilizables
# ─────────────────────────────────────────────────────────────────────────────
commands:

  setup-pnpm:
    description: Activar pnpm via corepack y restaurar caché
    steps:
      - run:
          name: Enable pnpm via corepack
          command: |
            corepack enable
            corepack prepare pnpm@9 --activate
            pnpm config set store-dir ~/.pnpm-store
      - restore_cache:
          keys:
            - pnpm-v2-{{ checksum "pnpm-lock.yaml" }}
            - pnpm-v2-

  save-deps-cache:
    description: Persistir pnpm store en caché
    steps:
      - save_cache:
          key: pnpm-v2-{{ checksum "pnpm-lock.yaml" }}
          paths:
            - ~/.pnpm-store

  restore-workspace:
    description: Adjuntar workspace y activar pnpm via corepack
    steps:
      - attach_workspace:
          at: ~/project
      - run:
          name: Enable pnpm via corepack
          command: |
            corepack enable
            corepack prepare pnpm@9 --activate

  notify-on-fail:
    description: Registrar fallo en log (post action on_fail)
    steps:
      - run:
          name: "[POST] Notificacion — fallo"
          when: on_fail
          command: |
            echo "================================================"
            echo "  FALLO EN PIPELINE"
            echo "================================================"
            echo "  Job      : ${CIRCLE_JOB}"
            echo "  Branch   : ${CIRCLE_BRANCH}"
            echo "  Commit   : ${CIRCLE_SHA1}"
            echo "  Autor    : ${CIRCLE_USERNAME}"
            echo "  Build #  : ${CIRCLE_BUILD_NUM}"
            echo "  URL      : ${CIRCLE_BUILD_URL}"
            echo "================================================"
            echo "CircleCI enviará email de fallo automáticamente."

# ─────────────────────────────────────────────────────────────────────────────
# Jobs
# ─────────────────────────────────────────────────────────────────────────────
jobs:

  install:
    executor: node-default
    steps:
      - checkout
      - setup-pnpm
      - run:
          name: Install dependencies
          command: pnpm install --frozen-lockfile
      - run:
          name: Generate Prisma client
          command: pnpm --filter backend db:generate
      - save-deps-cache
      - persist_to_workspace:
          root: ~/project
          paths:
            - .

  lint-backend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: Lint backend
          command: pnpm --filter backend lint
      - notify-on-fail

  lint-frontend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: Lint frontend
          command: pnpm --filter frontend lint
      - notify-on-fail

  typecheck-backend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: TypeScript check backend
          command: pnpm --filter backend exec tsc --noEmit
      - notify-on-fail

  typecheck-frontend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: TypeScript check frontend
          command: pnpm --filter frontend type-check
      - notify-on-fail

  test-backend-unit:
    executor: node-default
    parallelism: 4
    steps:
      - restore-workspace
      - run:
          name: Generate Prisma client
          command: pnpm --filter backend db:generate
      - run:
          name: Split & run unit tests
          command: |
            cd backend

            SPEC_FILES=$(
              circleci tests glob "src/**/*.spec.ts" \
                | circleci tests split --split-by=timings --timings-type=filename \
                | tr '\n' ' '
            )

            echo "Archivos en este contenedor: ${SPEC_FILES:-<ninguno>}"

            if [ -z "${SPEC_FILES// }" ]; then
              echo "Sin tests asignados a este contenedor, saltando."
              exit 0
            fi

            pnpm exec jest ${SPEC_FILES} \
              --coverage \
              --coverageDirectory=../coverage/unit \
              --forceExit \
              --runInBand
      - store_artifacts:
          path: coverage/unit
          destination: backend-unit-coverage
      - notify-on-fail

  test-backend-e2e:
    executor: node-mysql
    steps:
      - restore-workspace
      - run:
          name: Wait for MySQL
          command: |
            for i in $(seq 1 30); do
              if (echo > /dev/tcp/127.0.0.1/3306) 2>/dev/null; then
                echo "MySQL listo tras ${i} intentos."
                exit 0
              fi
              echo "Esperando MySQL... ${i}/30"
              sleep 2
            done
            echo "ERROR: MySQL no respondió en 60 s." && exit 1
      - run:
          name: Generate Prisma client
          command: pnpm --filter backend db:generate
      - run:
          name: Apply migrations
          command: pnpm --filter backend db:migrate:deploy
      - run:
          name: Run e2e tests
          command: pnpm --filter backend test:e2e
      - notify-on-fail

  test-frontend:
    executor: node-default
    parallelism: 2
    steps:
      - restore-workspace
      - run:
          name: Split & run frontend tests
          command: |
            cd frontend

            TEST_FILES=$(
              circleci tests glob "src/**/*.{test,spec}.{ts,tsx}" \
                | circleci tests split --split-by=timings --timings-type=filename \
                | tr '\n' ' '
            )

            echo "Archivos en este contenedor: ${TEST_FILES:-<ninguno>}"

            pnpm exec vitest run --passWithNoTests ${TEST_FILES}
      - notify-on-fail

  build-backend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: Generate Prisma client
          command: pnpm --filter backend db:generate
      - run:
          name: Build backend
          command: pnpm --filter backend build
      - store_artifacts:
          path: backend/dist
          destination: backend-dist
      - notify-on-fail

  build-frontend:
    executor: node-default
    steps:
      - restore-workspace
      - run:
          name: Build frontend
          command: pnpm --filter frontend build
          environment:
            NEXT_PUBLIC_API_URL: http://localhost:3000
            NEXT_PUBLIC_SITE_URL: http://localhost:3001
      - store_artifacts:
          path: frontend/.next
          destination: frontend-next
      - notify-on-fail

  notify-pipeline-result:
    executor: node-default
    steps:
      - run:
          name: "[POST] Notificacion — exito"
          when: on_success
          command: |
            echo "================================================"
            echo "  PIPELINE COMPLETADO EXITOSAMENTE"
            echo "================================================"
            echo "  Repo     : ${CIRCLE_PROJECT_REPONAME}"
            echo "  Branch   : ${CIRCLE_BRANCH}"
            echo "  Commit   : ${CIRCLE_SHA1}"
            echo "  Autor    : ${CIRCLE_USERNAME}"
            echo "  Build #  : ${CIRCLE_BUILD_NUM}"
            echo "  URL      : ${CIRCLE_BUILD_URL}"
            echo "================================================"
      - run:
          name: "[POST] Cierre del pipeline"
          when: always
          command: |
            echo "Pipeline finalizado — Build #${CIRCLE_BUILD_NUM} | Branch: ${CIRCLE_BRANCH}"

# ─────────────────────────────────────────────────────────────────────────────
# Workflow principal
# ─────────────────────────────────────────────────────────────────────────────
workflows:
  ci:
    jobs:
      - install

      - lint-backend:
          requires: [install]
      - lint-frontend:
          requires: [install]
      - typecheck-backend:
          requires: [install]
      - typecheck-frontend:
          requires: [install]

      - test-backend-unit:
          requires:
            - lint-backend
            - typecheck-backend
      - test-backend-e2e:
          requires:
            - lint-backend
            - typecheck-backend
      - test-frontend:
          requires:
            - lint-frontend
            - typecheck-frontend

      - build-backend:
          requires:
            - test-backend-unit
            - test-backend-e2e
      - build-frontend:
          requires:
            - test-frontend

      - notify-pipeline-result:
          requires:
            - build-backend
            - build-frontend
```

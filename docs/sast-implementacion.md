# Guía de Implementación SAST — E-commerce Crazy Cookies

## ¿Qué es este proyecto?

**Crazy Cookies** es un e-commerce de galletas y postres artesanales construido con una arquitectura moderna de monorepo:

- **Backend:** NestJS + TypeScript + Prisma ORM + MySQL
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Infraestructura:** Docker Compose (desarrollo), Kubernetes + Argo CD (producción)
- **Pipeline CI:** GitHub Actions

El proyecto maneja información sensible de clientes (datos personales, credenciales, órdenes de compra) y expone una API REST pública. Por eso, incorporar análisis estático de seguridad (SAST) desde el inicio del ciclo de desarrollo es una decisión arquitectónica clave, no un añadido opcional.

---

## ¿Qué es SAST y por qué lo necesitábamos?

**SAST (Static Application Security Testing)** analiza el código fuente sin ejecutarlo para detectar vulnerabilidades de seguridad antes de que lleguen a producción.

El proyecto ya tenía ESLint configurado para calidad de código (`@typescript-eslint`), pero **ESLint sin plugins de seguridad no es SAST** — solo detecta errores de tipado y estilo. La diferencia es:

| Herramienta | Detecta |
|---|---|
| ESLint base | Errores de tipos, variables no usadas, estilo |
| ESLint + security plugin | Vulnerabilidades reales: path traversal, eval injection, ReDoS, timing attacks |
| Semgrep | Patrones OWASP Top 10, JWT mal configurado, inyección SQL, XSS |

---

## Herramientas seleccionadas

De la lista de opciones disponibles para proyectos TypeScript, elegimos dos que encajan con el stack y el tamaño del proyecto:

| Herramienta | Por qué encaja |
|---|---|
| **ESLint + `eslint-plugin-security`** | Ya teníamos ESLint — solo se extendió con reglas de seguridad. Cero fricción para el equipo. |
| **Semgrep** | Multilenguaje, gratuito para OSS, reglas específicas para NestJS/Node.js/JWT, se integra fácilmente en CI. |

**Descartadas:**

| Herramienta | Razón |
|---|---|
| SonarQube | Requiere servidor propio o SonarCloud — overkill para el tamaño actual |
| Bandit | Solo analiza Python |
| Checkov | Útil para IaC (Terraform, K8s) — candidato para una segunda fase |

---

## Paso 1 — Instalar `eslint-plugin-security`

El plugin se instala como dependencia de desarrollo en ambos workspaces del monorepo:

```bash
pnpm --filter backend add -D eslint-plugin-security
pnpm --filter frontend add -D eslint-plugin-security
```

---

## Paso 2 — Configurar ESLint en el backend

Archivo: `backend/.eslintrc.js`

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin', 'security'],  // añadir 'security'
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended-legacy',                      // añadir esta línea
    'plugin:prettier/recommended',
  ],
  // ... resto de la configuración
};
```

---

## Paso 3 — Configurar ESLint en el frontend

Archivo: `frontend/.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended-legacy",
    "plugin:prettier/recommended"
  ],
  "plugins": ["@typescript-eslint", "security"],
  // ... resto de la configuración
}
```

---

## Paso 4 — Verificar que detecta vulnerabilidades

Al correr el linter, el plugin detectó hallazgos reales en el proyecto:

```bash
pnpm --filter backend lint
```

**Resultado:**
```
backend/src/modules/products/products.service.ts:363
  security/detect-non-literal-fs-filename
  → existsSync() con argumento variable (riesgo de path traversal)

backend/src/modules/products/products.service.ts:364
  security/detect-non-literal-fs-filename
  → unlink() con argumento variable (riesgo de path traversal)
```

Esto confirma que el plugin está funcionando y detectando problemas reales.

---

## Paso 5 — Crear el workflow de GitHub Actions con Semgrep

Se creó el archivo `.github/workflows/ci.yml` con el siguiente flujo:

```
push / PR
│
├── lint-backend   → ESLint + security plugin
├── lint-frontend  → ESLint + security plugin
│
├── semgrep        → Escaneo con reglas OWASP, Node.js, JWT, TypeScript
│                    └── sube resultados SARIF al GitHub Security tab
│
├── test-backend   → Jest (corre solo si lint-backend pasa)
└── test-frontend  → Vitest (corre solo si lint-frontend pasa)
```

**Triggers configurados:**
- Push a: `develop`, `main`, `feature/**`, `release/**`, `hotfix/**`
- Pull Request hacia: `develop`, `main`

Fragmento relevante del workflow para Semgrep:

```yaml
semgrep:
  name: Semgrep SAST
  runs-on: ubuntu-latest
  container:
    image: semgrep/semgrep
  steps:
    - uses: actions/checkout@v4

    - name: Semgrep scan
      run: >
        semgrep scan
        --config p/typescript
        --config p/nodejs
        --config p/jwt
        --config p/owasp-top-ten
        --error
        --sarif
        --output semgrep.sarif

    - name: Upload SARIF results
      if: always()
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: semgrep.sarif
```

Los rulesets usados cubren:

| Ruleset | Qué analiza |
|---|---|
| `p/typescript` | Vulnerabilidades comunes en TypeScript |
| `p/nodejs` | Patrones inseguros de Node.js (eval, exec, etc.) |
| `p/jwt` | Tokens sin expiración, algoritmos débiles, secretos en código |
| `p/owasp-top-ten` | A1–A10: inyección, auth rota, exposición de datos, etc. |

---

## ¿Por qué este stack y estas herramientas encajan bien?

El proyecto tiene características que hacen de SAST una herramienta especialmente valiosa:

1. **Maneja datos sensibles** — credenciales de usuarios, datos de órdenes, tokens JWT. Un error de seguridad tiene impacto directo en clientes reales.

2. **API REST pública** — el backend está expuesto en `localhost:3000/api`. Sin validación estática, vulnerabilidades como inyección o auth rota son difíciles de detectar manualmente.

3. **TypeScript estricto** — el proyecto ya usa `"no-explicit-any": "error"`. Semgrep y ESLint security se alinean perfectamente con esa filosofía de seguridad en el tipado.

4. **Uploads de archivos** — el módulo de productos permite subir imágenes. Esto es exactamente el tipo de funcionalidad donde `detect-non-literal-fs-filename` agrega valor real (ya detectó dos hallazgos reales).

5. **JWT para auth** — el ruleset `p/jwt` de Semgrep verifica que los tokens tengan expiración configurada, que no se use el algoritmo `none`, y que los secretos no estén hardcodeados.

6. **GitFlow con múltiples ramas** — el CI corre en `feature/**`, `develop` y `main`, lo que significa que los problemas se detectan antes de que el código llegue a producción.

---

## Estado final

| Aspecto | Estado |
|---|---|
| ESLint con reglas de seguridad | Activo en backend y frontend |
| Semgrep en CI | Activo en GitHub Actions |
| Resultados visibles en GitHub | Sí — via SARIF en Security tab |
| Hallazgos detectados | 2 en `products.service.ts` (path traversal) |
| Bloquea el CI si hay errores | Sí — `--error` flag en Semgrep, `--max-warnings=0` en ESLint |

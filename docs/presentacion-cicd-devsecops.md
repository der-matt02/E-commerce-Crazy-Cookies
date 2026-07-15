# Presentación — CI/CD con enfoque DevSecOps

**ISWZ3205 · Procesos de Software — 10 láminas máx.**

> Nota para quien retome este markdown: cada `##` es una lámina. Contenido real y verificado el 2026-07-07 (mismos datos que el informe técnico). Falta: diseño visual final del PPT/PDF y las 2-3 capturas de pantalla marcadas. Mantené cada lámina corta — es guion de exposición oral de 12 min, no el informe completo.
>
> **Se evalúa contra la rúbrica ADN_FICA_RC3** (mismos 3 indicadores que el informe: Comunicación, Argumentación, Presentación — ver nota completa en `informe-tecnico-cicd-devsecops.md`). Para esta presentación puntual, lo que más pesa es **Presentación** ("datos relevantes de forma impecable, efectiva y relevante a los objetivos y la audiencia") — cada lámina debe poder leerse en 10-15 segundos desde el fondo de un salón, sin párrafos largos.
>
> **La consigna exige explícitamente "asegurando que todos los integrantes participen"** — repartir las láminas entre el equipo (hasta 3 personas) antes de ensayar, no dejarlo para el momento de exponer. Sugerencia de reparto y tiempo para los 12 minutos exactos:
>
> | Lámina | Tema | Tiempo sugerido | Orador |
> |---|---|---|---|
> | 1 | Portada | 0:30 | `[COMPLETAR]` |
> | 2 | Objetivo | 1:00 | `[COMPLETAR]` |
> | 3 | Arquitectura del pipeline | 1:30 | `[COMPLETAR]` |
> | 4 | Herramientas | 1:00 | `[COMPLETAR]` |
> | 5 | Evidencia CI | 1:30 | `[COMPLETAR]` |
> | 6 | DAST — ZAP | 1:00 | `[COMPLETAR]` |
> | 7 | CD — GitOps | 1:30 | `[COMPLETAR]` |
> | 8 | Hallazgo principal (hook de migración) | 2:00 | `[COMPLETAR]` |
> | 9 | Verificación funcional | 1:00 | `[COMPLETAR]` |
> | 10 | Conclusiones | 1:00 | `[COMPLETAR]` |
> | — | Total | **12:00** | — |
>
> La lámina 8 tiene más tiempo asignado a propósito: es el hallazgo con diagnóstico de causa raíz más profundo, el que mejor demuestra el indicador de Argumentación. Si el equipo es de 3, una división natural es: Persona A láminas 1-3 (contexto), Persona B láminas 4-7 (herramientas y arquitectura), Persona C láminas 8-10 (hallazgos y cierre) — así cada uno defiende una porción con profundidad real en vez de leer una lámina cada uno sin contexto del resto.

---

## Lámina 1 — Portada

**CI/CD con enfoque DevSecOps**
Crazy Cookies E-commerce — pipeline real, cluster real, seguridad integrada.

- Integrantes: `[COMPLETAR]`
- Fecha de exposición: `[COMPLETAR]`
- Repositorio: `github.com/der-matt02/E-commerce-Crazy-Cookies`

---

## Lámina 2 — Objetivo

**Qué se propuso demostrar**

- Implementar un flujo de CI/CD real — no simulado — con build, pruebas, generación de artefactos y despliegue en un cluster Kubernetes.
- Integrar dos herramientas de seguridad (SAST + DAST), más validación de integridad de artefactos, con evidencia real de resultados.
- Corregir un intento anterior que se había armado sin selección justificada de herramientas ni cluster accesible.

---

## Lámina 3 — Arquitectura: las 10 etapas del pipeline

```
Lint ×2 → Semgrep SAST → Tests ×3
        ↓
   Build & push (GHCR)
        ↓
   Trivy  +  ZAP DAST
        ↓
 Actualizar manifiestos
        ↓
  Argo CD sincroniza
```

GitHub Actions nunca toca el cluster directamente — solo actualiza un manifiesto en Git. Argo CD, corriendo dentro del cluster, hace el resto (patrón GitOps).

> 📸 **[IMAGEN 1] Captura:** grafo visual de dependencias entre jobs en GitHub Actions (pestaña *Actions* → abrir un run).

---

## Lámina 4 — Herramientas: selección deliberada, no relleno

| Herramienta | Rol | Por qué |
|---|---|---|
| GitHub Actions | CI/CD | Repo ya público en GitHub, cero infra extra |
| Argo CD | CD / GitOps | Hace pull desde dentro del cluster local |
| Kubernetes (OrbStack) | Orquestación | Cluster real, sin costo de nube |
| ESLint + Semgrep | SAST (2 capas) | Patrones inseguros de código + reglas OWASP/CI |
| Trivy | Integridad de artefactos | CVEs de imágenes + SBOM (1198 componentes) |
| OWASP ZAP | DAST | Ataca la app corriendo, no el código |

---

## Lámina 5 — Evidencia: los 6 primeros jobs, en verde

| Job | Resultado | Tiempo |
|---|---|---|
| ESLint Backend / Frontend | ✅ | ~25-32s c/u |
| Semgrep SAST | ✅ | 32s |
| Tests unitarios (backend + frontend) | ✅ | 399 + 127 tests |
| Tests e2e backend (MySQL real) | ✅ | 44 tests, 59s |

Run completo: [#28883374703](https://github.com/der-matt02/E-commerce-Crazy-Cookies/actions/runs/28883374703) — **10/10 jobs verdes**.

> 📸 **[IMAGEN 2] Captura:** vista de GitHub Actions con los 10 jobs en verde.

---

## Lámina 6 — DevSecOps: OWASP ZAP contra la app real

```
High: 0    Medium: 2    Low: 6    Informational: 8
```

- Content Security Policy Header Not Set (Medium)
- Missing Anti-clickjacking Header (Medium)
- Cabeceras opcionales (Permissions-Policy, X-Content-Type-Options, etc.) — Low

**Cero alertas críticas o de riesgo alto.** El tipo de hallazgo que solo un DAST encuentra — no existe en el código, solo en runtime.

> 📸 **[IMAGEN 5] Captura:** reporte HTML de ZAP abierto en el navegador (tabla de alertas por severidad).

---

## Lámina 7 — CD: de un commit a un pod corriendo

| Paso | Qué pasa |
|---|---|
| 1-2 · Build y publicación | CI construye backend/frontend, publica en GHCR taggeados por SHA |
| 3 · Commit del manifiesto | CI actualiza `k8s/*/kustomization.yaml` y pushea a `main` |
| 4 · Argo CD detecta | Compara Git (deseado) vs. cluster (real) — sin credenciales del cluster en el CI |
| 5 · Sincroniza | Corre la migración (hook PreSync) y hace rolling update |

**Estado final:** las 4 Applications de Argo CD — `Synced` + `Healthy`, sin excepciones.

> 📸 **[IMAGEN 6] Captura:** árbol de recursos de `crazy-cookies-root` en Argo CD UI (`https://localhost:8080`), con sus 3 apps hijas en verde.

---

## Lámina 8 — El hallazgo más real de esta entrega

**El hook de migración fallaba en Argo CD desde hacía días.**

- Diagnóstico sin tocar la base de datos: inspección de permisos dentro de la imagen Docker.
- Causa raíz: `chown` nunca se ejecutó — el directorio de Prisma quedaba `root:root`, no escribible por el usuario no-root del contenedor.
- Fix: una línea en el Dockerfile.
- Verificado en el cluster real: commit → pipeline (10/10) → Argo CD sincronizó solo → hook completó con **0 reintentos**.

**Bonus, documentado sin corregir:** 89 reinicios del backend en 45h — el rate limiter bloqueaba al propio health check de Kubernetes con 429. Causa raíz identificada, fix pendiente.

> 📸 **[IMAGEN 7] Captura — la más importante de toda la presentación:** panel de `crazy-cookies-backend` en Argo CD, antes (`OutOfSync`/`Sync failed`, rojo) y después (`Synced`/`Healthy`, verde) del fix. Si el equipo solo saca una captura de todo el proyecto, que sea esta.

---

## Lámina 9 — Verificación funcional real

```
$ curl http://localhost:30080/api/health
{"status":"ok"}

$ curl -o /dev/null -w "%{http_code}" http://localhost:30090
200
```

Health check, base de datos real y frontend respondiendo — verificado con requests reales contra el cluster desplegado, no solo el estado del dashboard de Argo CD.

> 📸 **[IMAGEN 8] Captura:** catálogo de productos abierto en `http://localhost:30090` + panel de GHCR (`github.com/der-matt02?tab=packages`) con las imágenes publicadas.

---

## Lámina 10 — Conclusiones

> "El GitOps recién se entiende cuando se rompe y se arregla de verdad" — el hook de migración fallando no era culpa de Kubernetes, era una línea faltante en un Dockerfile.

- Un DAST encuentra una clase de problema que un SAST no puede: comportamiento en runtime.
- Tener una herramienta de seguridad instalada no es lo mismo que tenerla activa — se auditó y corrigió una capa de SAST que llevaba sesiones apagada sin que nadie lo notara.
- **Reportar** una vulnerabilidad no es lo mismo que **bloquearla** — Trivy/ZAP hoy generan evidencia, no gatean el build. Es la mejora más honesta a reconocer.
- La mayoría de la fricción real no fue "seguridad" en sentido estricto — fue infraestructura: arquitecturas de CPU, permisos, dependencias rotas de terceros.

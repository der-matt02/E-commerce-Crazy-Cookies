# CI/CD con enfoque DevSecOps — Crazy Cookies E-commerce

**Informe técnico · ISWZ3205-5437_5438 Procesos de Software — UDLA**

> Nota para quien retome este markdown: es la base de contenido para el informe técnico PDF (**máx. 12 páginas, límite duro de la consigna**) que pide la actividad. Todos los números y capturas descritas son reales, verificados el 2026-07-07 contra el pipeline y el cluster corriendo de verdad — no son de relleno. Falta: diseño/maquetación final, capturas de pantalla reales (dejé marcado dónde van con 📸), y los datos de portada. **Si al maquetar se pasa de 12 páginas**, orden de recorte sin perder lo que más pesa para la rúbrica: primero la sección 8.4 (infraestructura, pasarla a lista compacta), después achicar la tabla de §11 (Referencias) a 2 columnas más angostas o tipografía menor — **no recortar** 8.2 (diagnóstico del hook), 8.5 (bug sin corregir), ni las tablas de OWASP CI/CD y métricas DORA en §3/§9: son la evidencia más fuerte de Argumentación.
>
> **Contra qué se evalúa esto — no es una nota al margen, es la rúbrica real de calificación** (ADN_FICA_RC3, "Se comunica efectivamente ante un amplio rango de audiencias propias de la disciplina"). El objetivo propuesto de la consigna es explícitamente sobre *comunicar*, no solo sobre que el pipeline funcione: *"Demostrar la capacidad de comunicar de manera clara, estructurada y fundamentada los procesos, decisiones y resultados obtenidos..."* Al maquetar, priorizar estos 3 indicadores por sobre agregar más contenido técnico:
>
> | Indicador | Nivel EXCELENTE (lo que hay que apuntar) |
> |---|---|
> | **Comunicación** | Ideas y resultados de forma **precisa y efectiva**, lenguaje técnico apropiado, **alineado a los objetivos** — no basta con que sea correcto, tiene que leerse claro para alguien que evalúa comunicación, no solo código. |
> | **Argumentación** | Ideas y resultados de forma **profunda y contundente**, con **evidencia relevante** relacionada al tema — la sección 8 (hallazgos) es el corazón de este criterio, no un anexo opcional. |
> | **Presentación** | Datos relevantes de forma **impecable, efectiva y relevante** a los objetivos y la audiencia — esto es diseño visual real (jerarquía, tablas limpias, sin muros de texto), no solo tener los datos. |
>
> Si hay que decidir entre agregar un hallazgo técnico más o pulir la claridad/diseño de lo que ya está, **pulir gana** — la rúbrica no premia exhaustividad técnica, premia comunicación.

| Campo | Valor |
|---|---|
| Proyecto | Crazy Cookies E-commerce |
| Repositorio | https://github.com/der-matt02/E-commerce-Crazy-Cookies |
| Integrantes | `[COMPLETAR: nombres]` |
| Fecha de exposición | `[COMPLETAR: fecha]` |

---

## 1. Objetivo del proyecto

**Qué es Crazy Cookies:** un e-commerce funcional de venta de galletas y postres — catálogo de productos, carrito, checkout sin necesidad de cuenta, cupones de descuento, búsqueda de pedido por teléfono, y un panel administrativo completo (productos, categorías, inventario, órdenes, reviews, roles de administrador). Es la aplicación real sobre la que se implementó el pipeline de esta entrega — no un demo ni un "hola mundo": tiene 526 tests automatizados (backend + frontend) y estuvo en desarrollo activo durante varias sesiones previas a esta actividad.

**Stack de la aplicación:** backend en NestJS + Prisma ORM, frontend en Next.js (App Router), base de datos MySQL. Es sobre este stack ya existente que se construyó el flujo de CI/CD — el objetivo de esta actividad no es la aplicación en sí, sino demostrar cómo se automatiza su build, prueba, análisis de seguridad y despliegue.

Implementar, de punta a punta, un flujo real de integración y despliegue continuo con enfoque DevSecOps para este e-commerce, cubriendo los tres pilares que pide la consigna:

- **Build y pruebas automatizadas.**
- **Análisis de seguridad integrado al pipeline** — SAST y DAST, más validación de integridad de artefactos.
- **Despliegue real en un cluster de Kubernetes**, gestionado con GitOps.

Un intento anterior de este mismo pipeline se descartó deliberadamente antes de esta entrega: se había armado sin selección justificada de herramientas y sin un cluster de Kubernetes realmente accesible. Esta vez cada herramienta se eligió por su propósito específico, y el pipeline se verificó corriendo de verdad — incluyendo el despliegue final en un cluster real y una corrida de extremo a extremo el mismo día de esta entrega.

### Cumplimiento de cada objetivo, con su evidencia

| Objetivo de la consigna | Cómo se cumplió | Evidencia (sección) |
|---|---|---|
| Flujo de CI/CD con build, pruebas, artefactos y despliegue en k8s | Pipeline de 10 jobs en GitHub Actions, cluster Kubernetes real (OrbStack) con Argo CD | §2, §4, §7 |
| Mínimo 2 herramientas de seguridad (SAST y DAST) | ESLint+security y Semgrep (SAST) + OWASP ZAP (DAST) | §3, §4, §6 |
| Validación de políticas o integridad de artefactos | Trivy (CVE scan + SBOM de 1198 componentes) sobre las imágenes publicadas | §5 |
| Evidencias de resultados obtenidos | Corrida real del 2026-07-07, con logs, números y verificación funcional contra el cluster desplegado | §4, §9 |

**Decisión de arquitectura clave:** se separó explícitamente el CI (GitHub Actions, corre en la nube) del CD (Argo CD, corre *dentro* del cluster). GitHub Actions nunca aplica cambios directo a Kubernetes — solo construye, prueba, escanea y actualiza el tag de imagen en un manifiesto versionado en Git. Argo CD, que vive en el cluster, detecta ese cambio y sincroniza. Es el patrón GitOps: Git como única fuente de verdad del estado del sistema.

---

## 2. Arquitectura del pipeline

El pipeline vive en un único workflow de GitHub Actions (`.github/workflows/ci.yml`) con **diez jobs**. Los primeros seis corren en paralelo apenas se hace push; el resto depende de que esos pasen:

```
ESLint backend ─┐
ESLint frontend ─┼─► Build & push (GHCR) ─► Trivy ─┐
Semgrep SAST ────┤                        ► ZAP DAST ┼─► Actualizar manifiestos ─► Argo CD sincroniza
Tests unitarios ─┤
Tests e2e ───────┘
```

La etapa de build solo corre si *todo* lo anterior — lint, SAST, tests unitarios y tests e2e — pasó. Trivy y ZAP corren en paralelo entre sí una vez que las imágenes ya están publicadas (Trivy la escanea, ZAP levanta el stack completo con `docker-compose` y ataca la app real). El último job no toca el cluster directamente: escribe el nuevo tag de imagen en `k8s/*/kustomization.yaml` y lo commitea a `main` — Argo CD, que ya está corriendo dentro del cluster y observando ese repositorio, hace el resto.

**Por qué Argo CD corre dentro del cluster:** el cluster de esta demo es local (Kubernetes de OrbStack, en la misma máquina), así que los runners de GitHub Actions —que corren en la nube— no tienen forma de conectarse a él directamente. Argo CD resuelve esto al revés: en vez de que el CI empuje el despliegue, Argo CD hace *pull* del repositorio de Git de forma periódica (con `syncPolicy.automated.selfHeal: true`). El CI nunca necesita credenciales del cluster ni acceso de red hacia él — solo necesita poder pushear a Git.

**Evidencia de código — el grafo de dependencias es real, no solo el diagrama de arriba.** Extracto real de `.github/workflows/ci.yml`, donde `build-and-push` declara explícitamente que espera a los 4 jobs previos:

```yaml
build-and-push:
  name: Build & Push images (GHCR)
  runs-on: ubuntu-latest
  needs: [semgrep, test-backend, test-backend-e2e, test-frontend]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

> 📸 **[IMAGEN 1] Captura sugerida:** el grafo visual de dependencias entre jobs, tal como lo dibuja GitHub Actions (pestaña *Actions* → abrir un run → se ve el árbol de cajas conectadas por flechas).

---

## 3. Herramientas utilizadas y su propósito

| Herramienta | Categoría | Por qué esta y no otra |
|---|---|---|
| **GitHub Actions** | CI/CD | El repositorio ya vive en GitHub público — cero infraestructura adicional, `GITHUB_TOKEN` alcanza para publicar en GHCR sin gestionar credenciales extra. |
| **Argo CD** | CD / GitOps | Corre dentro del cluster y hace pull de Git — resuelve el problema de desplegar a un cluster local sin exponerlo a internet. Patrón app-of-apps: una Application raíz gestiona 3 hijas (database, backend, frontend). |
| **Kubernetes (OrbStack)** | Orquestación | Cluster real (no simulado), corriendo local sin costo de nube. |
| **ESLint + `eslint-plugin-security`** | SAST | Reglas específicas de patrones inseguros de JS/TS (object injection, uso no literal de `fs`, etc.), integradas al mismo linter que ya corre en cada PR. |
| **Semgrep** | SAST | Reglas más amplias (OWASP Top 10, JWT, Node.js, TypeScript) — detectó, entre otras cosas, tags mutables de GitHub Actions (ver hallazgos). |
| **Trivy** | Integridad de artefactos | Escanea las imágenes Docker publicadas por vulnerabilidades conocidas (CVE) y genera un SBOM (CycloneDX) — el inventario exacto de qué hay adentro de lo que se despliega. |
| **OWASP ZAP** | DAST | Ataca la aplicación *corriendo de verdad* (no el código fuente) — la única forma de encontrar problemas que solo existen en runtime, como cabeceras de seguridad ausentes. |

**Nota de honestidad técnica:** ESLint corrió durante buena parte del desarrollo *sin* `eslint-plugin-security` instalado (se había quitado en un reset de sesión anterior sin darse cuenta de la implicancia). Se detectó y corrigió como parte de esta entrega — el pipeline actual sí tiene las 2 capas reales de SAST, verificado corriendo (ver sección 8).

### Buenas prácticas DevSecOps aplicadas en el pipeline

| Práctica | Cómo se aplica |
|---|---|
| **Defensa en profundidad en SAST** | 2 herramientas independientes (ESLint+security, Semgrep) en vez de una sola — cubren distintas familias de reglas, se complementan. |
| **Seguridad de la cadena de suministro (supply-chain)** | Las 10 GitHub Actions de terceros del workflow están fijadas a su SHA de commit exacto (no a tags mutables como `@v4`) — mitiga el mismo tipo de ataque que comprometió `tj-actions/changed-files` en 2025. |
| **Principio de menor privilegio** | Cada job declara sus propios `permissions:` explícitos (ej. Semgrep solo `security-events: write`), en vez de heredar un token con permisos amplios por defecto. |
| **Trazabilidad de artefactos** | Cada imagen se publica con un tag inmutable por SHA de commit (no solo `latest`) — cualquier versión desplegada es rastreable al commit exacto que la generó. |
| **Generación de SBOM** | Inventario completo de dependencias (CycloneDX, 1198 componentes) por cada imagen — no solo se escanea, se documenta qué hay adentro. |
| **Evidencia centralizada y accesible** | Todos los hallazgos de seguridad (SAST + integridad de artefactos) se unifican en la pestaña *Security* de GitHub vía SARIF — un solo lugar para auditar, no reportes sueltos por herramienta. |
| **Gates reales antes del despliegue** | El build de la imagen no arranca si lint, SAST o tests fallan (`needs:` explícito) — nada llega a producción sin pasar por las etapas previas. |
| **GitOps — Git como única fuente de verdad** | El CI nunca aplica cambios directo al cluster; solo comitea un manifiesto. Cualquier cambio manual al cluster que no pase por Git se revierte solo (`selfHeal: true`). |

**Autocrítica honesta (también es buena práctica: reconocer los límites):** Trivy y ZAP hoy generan evidencia pero no bloquean el pipeline ante hallazgos (ver §5, §6) — es una decisión consciente para esta entrega, documentada como la mejora más valiosa para una siguiente iteración, no una omisión oculta.

### Marco de referencia — OWASP Top 10 CI/CD Security Risks

No solo se aplicaron buenas prácticas "porque sí" — se pueden mapear a un marco de referencia reconocido en la industria (OWASP, *Top 10 CI/CD Security Risks*), lo que da un fundamento externo a las decisiones tomadas, no solo criterio propio:

| Riesgo OWASP CI/CD | Mitigación aplicada en este pipeline |
|---|---|
| **CICD-SEC-3** — Dependency Chain Abuse | Las 10 actions de terceros fijadas a SHA de commit exacto, no a tags mutables (`@v4`) |
| **CICD-SEC-6** — Insufficient Credential Hygiene | El CI no tiene `kubeconfig` ni credenciales del cluster en ningún secret — GitOps elimina la necesidad |
| **CICD-SEC-2 / CICD-SEC-5** — IAM y control de acceso insuficiente | `permissions:` explícitos y mínimos por job (ej. Semgrep solo `security-events: write`) |
| **CICD-SEC-9** — Validación de integridad de artefactos insuficiente | Trivy (CVE scan) + SBOM (CycloneDX) sobre cada imagen antes del despliegue |
| **CICD-SEC-10** — Logging y visibilidad insuficiente | Todos los hallazgos de seguridad centralizados en SARIF, un solo panel (GitHub Security) |

---

## 4. Etapa CI — build, tests y SAST

Lint (ESLint con el plugin de seguridad) y Semgrep corren sobre backend y frontend por separado. Los tests se dividen en tres jobs independientes: unitarios de backend, e2e de backend (con un contenedor real de MySQL como `service` del job) y unitarios de frontend.

**Resultado real de la corrida de esta entrega** ([run #28883374703](https://github.com/der-matt02/E-commerce-Crazy-Cookies/actions/runs/28883374703), 2026-07-07):

| Job | Resultado | Tiempo |
|---|---|---|
| ESLint — Backend | ✅ pass | 25s |
| ESLint — Frontend | ✅ pass | 32s |
| Semgrep SAST | ✅ pass | 32s |
| Tests — Backend (unit) | ✅ pass | 37s |
| Tests — Backend (e2e) | ✅ pass | 59s |
| Tests — Frontend | ✅ pass | 25s |
| Build & Push images (GHCR) | ✅ pass | 26m 27s |
| Trivy — Vulnerabilidades de imágenes | ✅ pass | 4m 46s |
| OWASP ZAP — DAST | ✅ pass | 5m 46s |
| Actualizar manifiestos k8s | ✅ pass | 6s |

**10/10 jobs verdes.** El build multi-arquitectura (amd64+arm64, por emulación QEMU) es, con diferencia, la etapa más lenta.

> 📸 **[IMAGEN 2] Captura sugerida:** vista de *Actions* en GitHub del run de arriba, mostrando los 10 jobs en verde con sus tiempos.

**Evidencia de código — SAST real, no solo lint de estilo.** Extracto real del job de Semgrep, mostrando las reglas de seguridad usadas y que el paso está configurado para *fallar* el pipeline si encuentra algo (`--error`), no solo reportar:

```yaml
semgrep:
  name: Semgrep SAST
  runs-on: ubuntu-latest
  permissions:
    security-events: write
  steps:
    - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.2.2
    - name: Semgrep scan
      run: |
        semgrep scan \
          --config p/typescript \
          --config p/nodejs \
          --config p/jwt \
          --config p/owasp-top-ten \
          --error \
          --sarif \
          --output semgrep.sarif
```

> 📸 **[IMAGEN 3] Captura sugerida:** un job individual expandido (ej. "ESLint — Backend" o "Semgrep SAST"), mostrando los pasos y su log real — distinto a la captura anterior, que muestra el run completo.

### Suite de tests — detalle

| Suite | Resultado | Detalle |
|---|---|---|
| Backend unitarios | ✅ 399/399 | 24 suites |
| Backend e2e (integración real, con MySQL) | ✅ 44/44 | 3 suites |
| Backend cobertura | — | 79.23% statements · 86.03% branches · 83.78% funciones · 80.11% líneas |
| Frontend unitarios | ✅ 127/127 | 17 archivos |
| Frontend e2e (Playwright, cross-browser) | ✅ 85/85 | chromium, firefox, webkit, Mobile Chrome, Mobile Safari (última verificación: 2026-07-05) |

Sobre la cobertura de frontend: `vitest --coverage` incluye en el denominador los ~30 `page.tsx` del App Router de Next.js, que se prueban con Playwright (e2e real en navegador) y no con Vitest+Testing Library — por diseño, no por omisión. Eso arrastra el número global reportado hacia abajo sin reflejar la cobertura real de la lógica de negocio, que en los módulos que sí corresponden testear con Vitest (clientes API, contexts, componentes) está entre 70% y 100%.

---

## 5. Integridad de artefactos — Trivy

Las imágenes se publican en el registro de contenedores de GitHub (`ghcr.io`) con dos tags: `latest` y un tag inmutable por commit (`sha-<7 caracteres>`). El tag por SHA es el que realmente usa el despliegue, para que cada versión desplegada sea trazable a un commit exacto.

**Resultado real del escaneo de la corrida de esta entrega:**

| Imagen | Hallazgos totales (CRITICAL+HIGH) | Critical | High |
|---|---|---|---|
| Backend | 55 | 3 | 42 |
| Frontend | 56 | 3 | 46 |

El SBOM del backend (formato CycloneDX) inventaría **1198 componentes**. La gran mayoría de los hallazgos provienen de la imagen base (`node:22-alpine` + paquetes del sistema), no del código propio de la aplicación.

Resultados subidos como SARIF a la pestaña Security de GitHub (visible junto a los hallazgos de Semgrep) y como artifact descargable (`trivy-reports`: SARIF de ambas imágenes + SBOM).

**Evidencia de código — la invocación real del scan** (nota: se llama a la imagen oficial de Trivy directo por Docker en vez de la marketplace action, ver hallazgo 8.4):

```yaml
- name: Trivy — imagen backend (SARIF)
  run: |
    docker run --rm \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "$PWD":/output \
      aquasec/trivy:0.57.1 image \
      --format sarif \
      --output /output/trivy-backend.sarif \
      --severity CRITICAL,HIGH \
      --exit-code 0 \
      ${{ env.BACKEND_IMAGE }}:${{ needs.build-and-push.outputs.sha_tag }}
```

> 📸 **[IMAGEN 4] Captura sugerida:** pestaña *Security* → *Code scanning* de GitHub, mostrando las alertas de Trivy junto a las de Semgrep en la misma vista — demuestra que ambas herramientas alimentan el mismo panel de seguridad.

> ⚠️ **Hallazgo de honestidad técnica para el informe:** el escaneo está configurado para *reportar* (`--exit-code 0`), no para bloquear el build. Es una decisión consciente tomada para esta entrega — bloquear por cualquier CVE de severidad alta en una imagen base habría hecho el pipeline inutilizable sin antes triagear cada hallazgo uno por uno — pero **es la limitación más importante a reconocer en la sección de conclusiones**: hoy Trivy es evidencia, no una política de seguridad *aplicada*. Lo mismo aplica a OWASP ZAP (`fail_action: false`, ver sección 6). Mencionarlo explícitamente en el informe suma más que ocultarlo — demuestra criterio técnico.

---

## 6. DAST — OWASP ZAP

Para esta etapa el pipeline levanta el stack completo (MySQL + backend + frontend) con `docker compose up --build` directo en el runner, espera a que el frontend responda 200, y corre un *baseline scan* de ZAP contra `http://localhost:3001`.

**Resultado real de la corrida de esta entrega:**

| Riesgo | Cantidad de alertas |
|---|---|
| High | 0 |
| Medium | 2 |
| Low | 6 |
| Informational | 8 |

Detalle de las alertas Medium y Low principales:

- **Content Security Policy (CSP) Header Not Set** (Medium, sistémico)
- **Missing Anti-clickjacking Header** (Medium, 4 instancias)
- Cross-Origin-Embedder-Policy / Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy Header Missing (Low)
- Permissions Policy Header Not Set (Low, sistémico)
- Server Leaks Information via "X-Powered-By" Header (Low, sistémico)
- X-Content-Type-Options Header Missing (Low, sistémico)

**Cero alertas de riesgo alto.** Todas las de riesgo medio/bajo son cabeceras de seguridad HTTP opcionales que Next.js no setea por defecto — exactamente el tipo de hallazgo que un DAST encuentra y un SAST no puede: no es un bug en el código, es una configuración de runtime del servidor.

### Alcance — qué cubre este pipeline de seguridad y qué no

Ninguna combinación de herramientas cubre todo. Ser explícito sobre el límite es parte de la rigurosidad técnica:

| Sí cubre | No cubre (fuera de alcance de esta entrega) |
|---|---|
| Vulnerabilidades en el código propio (SAST) | Pruebas de penetración manuales / red teaming |
| CVEs conocidas en dependencias e imagen base (Trivy) | Zero-days no publicadas en bases de datos de CVE |
| Comportamiento inseguro de la app en runtime (ZAP baseline) | Ataques de fuerza bruta sostenidos, DDoS |
| Integridad y trazabilidad de artefactos publicados (SBOM) | Seguridad física del hardware/nodo del cluster |
| Higiene de credenciales del propio pipeline (GitOps, sin `kubeconfig` en CI) | Auditoría de gestión de secretos en reposo (más allá de GitHub Secrets) |
| Cadena de suministro de GitHub Actions (SHA pinning) | Cadena de suministro de dependencias npm más allá de `pnpm-workspace.yaml` (no hay `npm audit` dedicado en el pipeline — mejora pendiente) |

> 📌 **Pendiente documentado:** endurecer cabeceras de seguridad (CSP, X-Frame-Options/anti-clickjacking, Permissions-Policy) vía `next.config.js` o `helmet` en el backend. No bloquea esta demo, es la mejora obvia de continuidad.

**Evidencia de código — cómo se levanta el objetivo del ataque:**

```yaml
- name: Levantar stack con docker-compose
  run: docker compose up -d --build

- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@906a3c93ffde4864839d31a93daadcbd2737b4da # v0.12.0
  with:
    target: "http://localhost:3001"
    cmd_options: "-a"
```

> 📸 **[IMAGEN 5] Captura sugerida:** el reporte HTML de ZAP (`report_html.html`, descargable como artifact `zap-dast-report`) abierto en el navegador, mostrando la tabla de alertas por severidad.

---

## 7. CD — GitOps con Argo CD

Los manifiestos de Kubernetes viven en `k8s/`, organizados con Kustomize, uno por servicio (`backend/`, `frontend/`, `database/`), más una carpeta `apps/` con los recursos `Application` de Argo CD que apuntan a cada uno. Un `root-app.yaml` bootstrapea todo con el patrón **app-of-apps**: una sola Application raíz gestiona las otras tres.

### Flujo completo de un despliegue

1. El job *Build & Push* construye y publica `backend:sha-<commit>` y `frontend:sha-<commit>` en GHCR.
2. El job *Actualizar manifiestos* corre `kustomize edit set image` y commitea el cambio a `main` con el bot de GitHub Actions.
3. Argo CD, que sondea el repositorio, detecta el nuevo commit y compara el estado deseado (Git) contra el estado real (cluster).
4. Con `syncPolicy.automated.selfHeal: true`, sincroniza solo: aplica el nuevo Deployment, corre el *hook* `PreSync` (migración de Prisma) antes de que el nuevo pod reciba tráfico, y hace *rolling update*.

**El CI nunca toca el cluster.** No hay `kubeconfig` ni credenciales de Kubernetes en los secrets de GitHub Actions — el único puente entre CI y CD es un commit de Git.

**Evidencia de código — el manifiesto real de la Application de Argo CD** (`k8s/apps/backend-app.yaml`), mostrando el patrón GitOps completo: de dónde lee (`repoURL`+`path`), a dónde despliega (`destination`), y la política de auto-sync:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: crazy-cookies-backend
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/der-matt02/E-commerce-Crazy-Cookies
    targetRevision: main
    path: k8s/backend
  destination:
    server: https://kubernetes.default.svc
    namespace: crazy-cookies
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Y el punto exacto donde el CI y el CD se tocan — `k8s/backend/kustomization.yaml`, el único archivo que el pipeline modifica en el cluster (vía commit, nunca en vivo):

```yaml
images:
- name: ghcr.io/der-matt02/e-commerce-crazy-cookies-backend
  newName: ghcr.io/der-matt02/e-commerce-crazy-cookies-backend
  newTag: sha-1d56805   # ← esta línea es la que actualiza el job "Actualizar manifiestos"
```

### Estado real del cluster al cierre de esta entrega

```
kubectl get application -n argocd
```

| Application | Sync | Health |
|---|---|---|
| crazy-cookies-root | ✅ Synced | ✅ Healthy |
| crazy-cookies-database | ✅ Synced | ✅ Healthy |
| crazy-cookies-frontend | ✅ Synced | ✅ Healthy |
| crazy-cookies-backend | ✅ **Synced** | ✅ Healthy |

Las 4 Applications sincronizadas y saludables — sin excepciones. (El hook de migración del backend estuvo fallando en sesiones anteriores; se diagnosticó y arregló la causa raíz el mismo día de esta entrega, ver sección 8.)

> 📸 **[IMAGEN 6] Captura sugerida:** pantalla de Argo CD UI (`kubectl port-forward svc/argocd-server -n argocd 8080:443` → `https://localhost:8080`) mostrando el árbol de recursos de `crazy-cookies-root` con sus 3 apps hijas, todas en verde.

---

## 8. Hallazgos reales del proceso

Nada de esto se armó a la primera. Documentar los problemas reales — y cómo se diagnosticaron — es tan parte de la evidencia como el pipeline en verde.

### 8.1 SAST tenía una capa apagada sin que nadie lo notara

Durante un reset de sesión anterior se quitó `eslint-plugin-security` de la configuración (junto con otras herramientas que se estaban re-evaluando), pero el paso del pipeline se siguió llamando `"ESLint (security)"` — el nombre mentía. Se detectó auditando la configuración real (no el nombre del job), se reinstaló el plugin, y se corrigieron los 6 hallazgos reales que salieron (todos falsos positivos típicos de la regla `detect-object-injection`/`detect-non-literal-fs-filename` — accesos dinámicos con clave ya validada por tipo o por un guard explícito), suprimidos uno por uno con comentario justificando por qué cada caso es seguro, no con una regla desactivada globalmente.

### 8.2 El hook de migración de Argo CD — diagnóstico completo de una causa raíz real

**Síntoma:** `crazy-cookies-backend` llevaba varios días en `OutOfSync`/`Sync failed` en Argo CD. El Job `backend-migrate` (hook `PreSync` que corre `prisma migrate deploy` antes de cada despliegue) agotaba sus 3 reintentos y fallaba.

**Diagnóstico** (sin tocar la base de datos de producción — solo inspección de filesystem sobre la imagen ya publicada):

```
$ docker run --rm --entrypoint sh <imagen> -c 'id && ls -la .../@prisma/engines/'
uid=1000(node) gid=1000(node)
drwxr-xr-x  1 root  root  ... @prisma/engines/
$ touch .../@prisma/engines/testwrite
Permission denied
```

El `Dockerfile` generaba el cliente Prisma como `root` durante el build (con la intención correcta de evitarle ese trabajo al usuario no-root en runtime), pero **nunca transfería la propiedad del directorio** al usuario `node` (uid 1000) con el que corre el contenedor. `prisma migrate deploy` necesita escribir en ese directorio (cache de checksum del engine, lockfiles) al ejecutarse — y no podía.

**Fix:** una línea en el Dockerfile, agregada justo después de generar el cliente Prisma y antes de cambiar al usuario no-root:

```diff
  RUN cd backend && npx prisma generate
+ RUN chown -R node:node /app/node_modules
  ...
  USER node
```

> 📸 **[IMAGEN 7] Captura sugerida — la más importante del informe:** dos capturas lado a lado (o una del "antes" guardada antes de aplicar el fix) del panel de `crazy-cookies-backend` en Argo CD UI: **antes** mostrando `OutOfSync` + `Sync failed` en rojo, **después** mostrando `Synced` + `Healthy` en verde. Es la evidencia visual más contundente de todo el informe — un problema real, diagnosticado, corregido y verificado.

**Verificación, en dos pasos:**
1. Local, sin tocar el cluster: se reconstruyó la imagen y se confirmó por inspección de filesystem que el directorio ahora es escribible por el uid 1000.
2. En el cluster real, por el camino correcto: commit del fix → push → pipeline completo (10/10 verde) → Argo CD sincronizó solo (self-heal automático, sin intervención manual) → el hook corrió limpio:
   ```
   Prisma schema loaded from prisma/schema.prisma
   2 migrations found in prisma/migrations
   No pending migrations to apply.
   ```
   `backend-migrate` completó con **0 reintentos**, y las 4 Applications de Argo CD quedaron `Synced`/`Healthy`.

### 8.3 Bugs reales de la aplicación, atrapados por el pipeline

- **Mensaje de bienvenida sin emoji:** el endpoint raíz (`GET /`) había perdido el `🍪` del mensaje, pero el test e2e seguía esperándolo. Invisible hasta que el job de e2e de backend corrió por primera vez en CI.
- **Test desactualizado contra la forma real de la respuesta:** `GET /products` devuelve `{products, pagination}` desde hace varias sesiones (se agregó paginación), pero un test e2e seguía asumiendo un array plano.

### 8.4 Infraestructura y despliegue

- **Manifiestos de k8s con imágenes "de mentira":** un intento anterior tenía Deployments apuntando a `node:18-alpine`/`nginx:alpine` con servidores stub — Argo CD sincronizaba "exitosamente" un stack que nunca sirvió la app real. Reemplazadas por las imágenes reales de GHCR.
- **`runAsNonRoot` sin UID explícito:** Kubernetes no puede verificar que `USER node` (nombre) sea realmente no-root sin `runAsUser: 1000` explícito.
- **Volumen de uploads faltante:** el backend hace `mkdirSync()` al arrancar; sin un volumen `emptyDir` montado, el usuario no-root no puede escribir sobre el filesystem de solo lectura de la imagen.
- **Desajuste amd64/arm64:** los runners de GitHub Actions son amd64, el cluster local (OrbStack, Apple Silicon) es arm64. Se agregó build multi-plataforma con QEMU.
- **`aquasecurity/trivy-action` con una dependencia interna rota:** se reemplazó por invocación directa de `docker run aquasec/trivy`.

### 8.5 Bug de producción encontrado, todavía sin corregir (documentado con honestidad)

Durante esta entrega se detectó que los pods de backend acumulaban decenas de reinicios (89+ en 45 horas). Causa raíz diagnosticada: el rate limiter global del backend (`express-rate-limit`, máx. 100 req/15min) se aplica también a `/api/health` — y el propio tráfico de los `livenessProbe`/`readinessProbe` de Kubernetes (cada 10-20s) supera esa cuota por sí solo, generando `429`, que kubelet interpreta como fallo de salud y reinicia el contenedor, reiniciando también el conteo del rate limit. Es un ciclo autoinducido: la app nunca estuvo realmente caída.

**Queda documentado como mejora pendiente**, no se corrigió en esta entrega por foco de tiempo — el fix (excluir `/api/health` del rate limiter) es simple y de bajo riesgo.

---

## 9. Evidencia de resultados

### Corrida completa del pipeline

| | |
|---|---|
| Run | [#28883374703](https://github.com/der-matt02/E-commerce-Crazy-Cookies/actions/runs/28883374703) |
| Resultado | ✅ success — 10/10 jobs |
| Duración total | ~37 min (el build multi-arquitectura tomó 26m27s por sí solo) |

### Verificación funcional del despliegue (no solo el estado de Argo CD)

```
$ curl http://localhost:30080/api/health
{"status":"ok", ...}

$ curl -o /dev/null -w "%{http_code}\n" http://localhost:30090
200
```

Backend, base de datos y frontend, los tres corriendo dentro del cluster desplegado por Argo CD, respondiendo a tráfico real.

### Métricas de entrega (estilo DORA)

Más allá de "el pipeline está en verde", el historial real de corridas en `main` permite medir el proceso con las métricas que la industria usa para evaluar CI/CD (DORA — *DevOps Research and Assessment*):

| Métrica DORA | Dato real observado |
|---|---|
| **Tasa de fallas de cambio** (bring-up, 2026-06-29 y 2026-07-05) | 12 de 16 corridas fallaron — concentradas en 2 sesiones de construcción activa del pipeline, cada una diagnosticada y documentada (§8) |
| **Tiempo medio de recuperación (MTTR)** | Entre 5 y 36 minutos por falla durante el bring-up — cada fix se identificó, corrigió y volvió a pushear en ese margen |
| **Tasa de fallas de cambio en régimen estable** (desde 2026-07-05 20:25 en adelante) | **0 de 4 — 100% de corridas exitosas**, incluida la de esta entrega |
| **Frecuencia de despliegue** | Cada push a `main` dispara un despliegue automático — sin intervención manual, sin ventanas de despliegue programadas |

La lectura honesta de este dato: una tasa de fallas alta durante el bring-up **no es una debilidad a esconder** — es evidencia de iteración rápida (fallar, diagnosticar, arreglar, re-pushear en minutos, no en días) seguida de estabilización real. Es exactamente el comportamiento que las métricas DORA premian: MTTR bajo, no ausencia total de fallas.

> 📸 **[IMAGEN 8] Captura sugerida:** catálogo de productos abierto en `http://localhost:30090`, y el panel de GHCR (`github.com/der-matt02?tab=packages`) mostrando las imágenes publicadas.

---

## 10. Conclusiones y aprendizajes

**El GitOps recién se entiende cuando se rompe y se arregla de verdad.** El hook de migración fallando durante días no era un problema de Argo CD ni de Kubernetes — era una línea faltante en un Dockerfile. Diagnosticarlo exigió separar "¿está corriendo la app?" (sí, `Healthy`) de "¿coincide el cluster con lo que dice Git?" (no, `OutOfSync`) — son ejes independientes que el dashboard de Argo CD muestra por separado a propósito.

**Un DAST encuentra una clase de problema completamente distinta a un SAST.** Los cuatro análisis de seguridad (ESLint, Semgrep, Trivy, ZAP) no son redundantes entre sí — cada uno mira una capa diferente: código fuente, configuración del propio pipeline, contenido de las imágenes publicadas, y comportamiento real en runtime. Las alertas de ZAP (cabeceras HTTP) nunca las habría encontrado un linter de código.

**Tener una herramienta de seguridad instalada no es lo mismo que tenerla activa.** El propio pipeline tuvo, sin que nadie lo notara, un job de SAST corriendo con la mitad de sus reglas apagadas durante varias sesiones — el nombre del job decía "security" pero la configuración no. La lección concreta: auditar la configuración real periódicamente, no confiar en el nombre de un step.

**Reportar una vulnerabilidad no es lo mismo que bloquearla.** Trivy y ZAP corren y generan evidencia real, pero ninguno de los dos está configurado para fallar el build — es una decisión consciente para esta entrega (evitar que CVEs de la imagen base bloqueen todo sin triage previo), pero es la brecha más honesta a reconocer: hoy el pipeline *reporta* seguridad, no la *aplica* como política. Es la mejora más valiosa para una siguiente iteración.

**La mayoría de los problemas de esta entrega no fueron de "seguridad" en el sentido estricto de la consigna — fueron de infraestructura real.** El desajuste de arquitectura de CPU, permisos de usuario no-root en Kubernetes, una dependencia rota de una action de terceros, un directorio con el owner equivocado: ninguno de estos aparece en un tutorial. Es exactamente el tipo de fricción que separa "el pipeline corre en la demo" de "el pipeline corre en un cluster real, ajeno al entorno donde se escribió el código".

**Medir con un marco externo cambia la conversación.** Mapear las decisiones tomadas contra OWASP Top 10 CI/CD Security Risks (§3) y contra métricas DORA (§9) obligó a justificar cada práctica más allá de "parece razonable" — por ejemplo, la tasa de fallas del 75% durante el bring-up dejó de leerse como un problema en cuanto se contrastó con el MTTR real (minutos, no días) y con el 100% de éxito en régimen estable. Un dato aislado se presta a cualquier lectura; el mismo dato contra un marco de referencia reconocido se argumenta solo.

**Ser explícito sobre el alcance es tan importante como implementar la herramienta.** Declarar por escrito qué *no* cubre este pipeline (§6) — pentesting manual, zero-days, DDoS, auditoría de secretos en reposo — no debilita el trabajo, lo hace más creíble: nadie que entienda de seguridad confía en un reporte que implica cobertura total.

---

## 11. Referencias oficiales

| Herramienta / marco | Documentación oficial |
|---|---|
| GitHub Actions | https://docs.github.com/en/actions |
| Argo CD | https://argo-cd.readthedocs.io/en/stable/ |
| Kubernetes | https://kubernetes.io/docs/home/ |
| Kustomize | https://kustomize.io/ |
| OrbStack (Kubernetes local) | https://docs.orbstack.dev/kubernetes/ |
| ESLint | https://eslint.org/docs/latest/ |
| eslint-plugin-security | https://www.npmjs.com/package/eslint-plugin-security |
| Semgrep | https://semgrep.dev/docs/ |
| Trivy | https://trivy.dev/latest/ |
| OWASP ZAP | https://www.zaproxy.org/docs/ |
| OWASP Top 10 CI/CD Security Risks | https://owasp.org/www-project-top-10-ci-cd-security-risks/ |
| OWASP Top 10 (aplicaciones web) | https://owasp.org/Top10/ |
| CWE (Common Weakness Enumeration) | https://cwe.mitre.org/ |
| CycloneDX (formato SBOM) | https://cyclonedx.org/ |
| DORA — DevOps Research and Assessment | https://dora.dev/ |
| GitHub Container Registry (GHCR) | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
| Prisma ORM | https://www.prisma.io/docs |
| NestJS | https://docs.nestjs.com/ |
| Next.js | https://nextjs.org/docs |

---

*Informe elaborado para la actividad evaluativa ISWZ3205-5437_5438 — Procesos de Software, UDLA. Repositorio: https://github.com/der-matt02/E-commerce-Crazy-Cookies*

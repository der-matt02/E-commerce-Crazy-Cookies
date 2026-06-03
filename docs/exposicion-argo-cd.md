# Exposición: Despliegue con Argo CD y GitOps
## Proyecto Crazy Cookies E-commerce

---

## 1. Introducción

**Crazy Cookies** es un e-commerce de galletas y postres construido con:
- **Backend:** NestJS + TypeScript + Prisma + MySQL
- **Frontend:** Next.js + TypeScript + Tailwind CSS

El proyecto está en producción local usando **GitOps con Argo CD** sobre un cluster de Kubernetes, lo que significa que Git es la única fuente de verdad para el estado de la infraestructura.

---

## 2. Herramientas utilizadas

| Herramienta | Versión | Para qué sirve |
|---|---|---|
| **Docker** | 29.4.3 | Motor de contenedores |
| **Minikube** | v1.38.1 | Cluster Kubernetes local |
| **kubectl** | v1.34.1 | CLI para administrar Kubernetes |
| **Kustomize** | v5.7.1 | Organizar y procesar manifiestos YML |
| **Argo CD** | v2.14.x | Herramienta de CD / GitOps |
| **Git / GitHub** | — | Fuente de verdad del sistema |

---

## 3. Conceptos clave

### ¿Qué es Docker?
Docker empaqueta una aplicación en un **contenedor** — una caja que tiene todo lo necesario para correr (código, dependencias, configuración) sin importar en qué máquina esté.

Tenemos dos imágenes:
- `node:18-alpine` → para el backend NestJS
- `nginx:alpine` → para el frontend

Ambos Dockerfiles usan **multi-stage build**: una etapa compila el código y otra lo sirve — la imagen final es pequeña y sin código innecesario.

---

### ¿Qué es Kubernetes (k8s)?
**k8s** es la abreviación de Kubernetes (K + 8 letras + s).

Kubernetes es el **orquestador de contenedores** — el sistema que decide dónde corren los contenedores, cuántos corren, cómo se comunican y qué pasa si uno falla.

Kubernetes vive **afuera de los pods** y los gestiona:
```
Kubernetes (el gestor)
    └── crea, monitorea y reinicia
         └── Pods (los contenedores)
```

---

### ¿Qué es un Pod?
Un pod es la **unidad mínima de Kubernetes** — la envoltura que Kubernetes le pone a un contenedor Docker para poder gestionarlo dentro del cluster.

```
POD
└── Contenedor Docker
      └── el código que corre (NestJS, MySQL, Nginx)
```

Si un pod muere, Kubernetes levanta uno nuevo automáticamente.

**En el proyecto tenemos 6 pods:**
```
pod: mysql-0             → adentro corre MySQL
pod: backend-xxx  (×3)  → adentro corre NestJS
pod: frontend-xxx (×2)  → adentro corre Nginx
```

---

### ¿Qué es un Namespace?
Un namespace es una **instancia o división lógica dentro del cluster** para separar y organizar recursos. Los recursos de un namespace no interfieren con los de otro.

**Analogía:** Un edificio de oficinas donde cada piso es independiente.

```
CLUSTER KUBERNETES
├── kube-system     → instancia core/motor interno de Kubernetes
│                     (CoreDNS, kube-proxy — sin esto no hay cluster)
├── argocd          → instancia de Argo CD
└── crazy-cookies   → instancia de la aplicación
```

**¿Por qué hay 6 namespaces en total?**
Porque Kubernetes crea 4 automáticamente al instalar el cluster (`kube-system`, `default`, `kube-public`, `kube-node-lease`). Nosotros creamos 2: `argocd` y `crazy-cookies`.

---

### ¿Qué es GitOps?
GitOps es una metodología donde **Git es la única fuente de verdad** del estado de la infraestructura.

| Enfoque tradicional | GitOps |
|---|---|
| Developer → kubectl apply → Cluster | Developer → git push → GitHub → Argo CD → Cluster |
| Manual, sin registro | Automatizado, trazable, reversible |

**Regla de oro:** Si quieres cambiar algo en el cluster, primero lo cambias en Git.

---

### ¿Qué es Argo CD?
Argo CD es la herramienta de **Continuous Delivery (CD)** que implementa GitOps para Kubernetes.

**¿Qué hace?**
1. Vigila un repositorio Git cada ~3 minutos
2. Compara lo que hay en Git vs lo que hay en el cluster
3. Sincroniza automáticamente si detecta diferencias
4. Revierte cambios manuales en el cluster (selfHeal)

**¿Qué NO hace Argo CD?**
- No construye imágenes Docker
- No ejecuta tests
- No compila código

Argo CD es **exclusivamente CD** — toma lo que está en Git y lo despliega.

---

### CI vs CD

```
CI (Continuous Integration)        CD (Continuous Delivery)
────────────────────────────       ──────────────────────────
Compilar código                    Desplegar al cluster
Ejecutar tests                     Sincronizar manifiestos
Construir imagen Docker            Gestionar rollbacks
                ↓                               ↓
        GitHub Actions             →        Argo CD
```

---

### ¿Qué es Kustomize?
Kustomize es una herramienta incluida en kubectl que organiza y procesa los manifiestos YML. Cada carpeta tiene un `kustomization.yaml` que lista qué archivos incluir. Cuando Argo CD despliega un componente, le pasa la carpeta a Kustomize y este los procesa como una unidad.

---

## 4. Arquitectura completa

```
╔══════════════════════════════════════════════════════════════════╗
║                      TU MÁQUINA (Windows)                       ║
║                                                                  ║
║   Navegador                                                      ║
║   ├── https://localhost:8080      (Argo CD UI)                  ║
║   └── http://192.168.49.2:30090   (Frontend Crazy Cookies)      ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │                    DOCKER DESKTOP                          │  ║
║  │                                                            │  ║
║  │  ┌──────────────────────────────────────────────────────┐  │  ║
║  │  │         CONTENEDOR: minikube (192.168.49.2)          │  │  ║
║  │  │                                                      │  │  ║
║  │  │  ┌────────────────────────────────────────────────┐  │  │  ║
║  │  │  │           CLUSTER KUBERNETES (1 solo)          │  │  │  ║
║  │  │  │                                                │  │  │  ║
║  │  │  │  ┌──────────────────────────────────────────┐  │  │  │  ║
║  │  │  │  │  NS: kube-system  (core de Kubernetes)   │  │  │  │  ║
║  │  │  │  │  CoreDNS, kube-proxy, kube-apiserver     │  │  │  │  ║
║  │  │  │  └──────────────────────────────────────────┘  │  │  │  ║
║  │  │  │                                                │  │  │  ║
║  │  │  │  ┌──────────────────────────────────────────┐  │  │  │  ║
║  │  │  │  │  NS: argocd                              │  │  │  │  ║
║  │  │  │  │  pod: argocd-server    (UI web)          │  │  │  │  ║
║  │  │  │  │  pod: argocd-repo-server (lee GitHub)    │  │  │  │  ║
║  │  │  │  │  pod: argocd-application-controller      │  │  │  │  ║
║  │  │  │  │  pod: argocd-redis     (caché)           │  │  │  │  ║
║  │  │  │  │  app: crazy-cookies-root  (App of Apps)  │  │  │  │  ║
║  │  │  │  │  app: crazy-cookies-backend              │  │  │  │  ║
║  │  │  │  │  app: crazy-cookies-frontend             │  │  │  │  ║
║  │  │  │  │  app: crazy-cookies-database             │  │  │  │  ║
║  │  │  │  └──────────────────────────────────────────┘  │  │  │  ║
║  │  │  │              ↓ despliega aquí                  │  │  │  ║
║  │  │  │  ┌──────────────────────────────────────────┐  │  │  │  ║
║  │  │  │  │  NS: crazy-cookies                       │  │  │  │  ║
║  │  │  │  │                                          │  │  │  │  ║
║  │  │  │  │  pod: mysql-0                            │  │  │  │  ║
║  │  │  │  │    svc: mysql (ClusterIP:3306)           │  │  │  │  ║
║  │  │  │  │                                          │  │  │  │  ║
║  │  │  │  │  pod: backend-xxx-8k7rn ┐                │  │  │  │  ║
║  │  │  │  │  pod: backend-xxx-gwgrg ├ 3 réplicas     │  │  │  │  ║
║  │  │  │  │  pod: backend-xxx-sxqss ┘                │  │  │  │  ║
║  │  │  │  │    svc: backend (ClusterIP:3000)         │  │  │  │  ║
║  │  │  │  │                                          │  │  │  │  ║
║  │  │  │  │  pod: frontend-xxx-4vmzz ┐               │  │  │  │  ║
║  │  │  │  │  pod: frontend-xxx-56hh6 ┘ 2 réplicas   │  │  │  │  ║
║  │  │  │  │    svc: frontend (NodePort:30090) ───────────────────────▶ Navegador
║  │  │  │  └──────────────────────────────────────────┘  │  │  │  ║
║  │  │  └────────────────────────────────────────────────┘  │  │  ║
║  │  └──────────────────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
                          ↑ polling cada 3 min
               ┌─────────────────────────────┐
               │  GITHUB (fuente de verdad)  │
               │  rama: main                 │
               │  carpeta: k8s/              │
               └─────────────────────────────┘
```

---

## 5. Estructura de manifiestos YML

Son **18 archivos YML** organizados por componente:

```
k8s/
├── root-app.yaml              ← bootstrap de Argo CD (se aplica una sola vez)
├── namespace.yaml
├── apps/
│   ├── database-app.yaml      ← Argo CD app DB     (sync-wave: 0)
│   ├── backend-app.yaml       ← Argo CD app Backend (sync-wave: 1)
│   └── frontend-app.yaml      ← Argo CD app Frontend(sync-wave: 2)
├── database/
│   ├── statefulset.yaml       ← MySQL con almacenamiento persistente
│   ├── service.yaml           ← acceso interno a MySQL
│   ├── secret.yaml            ← contraseñas y JWT cifrados
│   ├── pvc.yaml               ← disco de 5GB persistente
│   └── kustomization.yaml
├── backend/
│   ├── deployment.yaml        ← cuántos pods de NestJS y cómo actualizarlos
│   ├── service.yaml           ← acceso interno ClusterIP
│   ├── configmap.yaml         ← variables de entorno no sensibles
│   └── kustomization.yaml
└── frontend/
    ├── deployment.yaml        ← cuántos pods de Nginx
    ├── service.yaml           ← acceso externo NodePort:30090
    └── kustomization.yaml
```

---

## 6. Patrón App of Apps

En lugar de una sola app gigante, usamos el patrón **App of Apps** para modularidad:

```
root-app.yaml  (único comando manual)
     │
     └── apunta a k8s/apps/ en GitHub
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
   database   backend  frontend
    (App)      (App)    (App)
        │       │       │
        ▼       ▼       ▼
     MySQL   NestJS   Nginx
```

### Sync Waves — orden de despliegue garantizado

```
Wave 0 → database   (MySQL arranca primero)
Wave 1 → backend    (NestJS espera a que MySQL esté listo)
Wave 2 → frontend   (Nginx espera a que el backend esté listo)
```

---

## 7. Buenas prácticas aplicadas

### Kubernetes
| Práctica | Detalle |
|---|---|
| **Alta disponibilidad** | `replicas: 2` en backend y frontend |
| **Zero-downtime deploys** | `RollingUpdate` — levanta pod nuevo antes de bajar el viejo |
| **Resource limits** | CPU y memoria definidos en todos los pods |
| **Secretos seguros** | Credenciales en `Secret`, config normal en `ConfigMap` |
| **Almacenamiento persistente** | PVC de 5GB para MySQL — datos sobreviven reinicios |
| **Acceso controlado** | Backend ClusterIP (interno), Frontend NodePort (externo) |

### RollingUpdate explicado
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0   # nunca baja pods antes de tener los nuevos listos
    maxSurge: 1         # levanta 1 pod extra durante el deploy
```
Resultado: durante un deploy siempre hay pods disponibles — cero downtime.

### Argo CD / GitOps
| Práctica | Detalle |
|---|---|
| **Auto-sync** | Sincroniza automáticamente sin intervención humana |
| **Self-heal** | Si alguien modifica el cluster a mano, Argo CD lo revierte |
| **Prune** | Recursos eliminados en Git se eliminan del cluster |
| **Modularidad** | App of Apps — cada componente es independiente |
| **Trazabilidad** | Cada estado del cluster tiene un commit de Git asociado |

### Docker
| Práctica | Detalle |
|---|---|
| **Multi-stage build** | Imagen de compilación separada de imagen de producción |
| **Imágenes Alpine** | Mínimas y seguras — menor superficie de ataque |
| **Solo deps de producción** | Sin devDependencies en la imagen final |
| **Layer caching** | `COPY package.json` antes que `COPY .` |
| **.dockerignore** | Excluye `node_modules`, tests, `.env`, `.git` |

---

## 8. Flujo completo de un deploy

```
1. Developer modifica k8s/backend/deployment.yaml
   replicas: 2 → replicas: 3

2. git add + git commit + git push origin main

3. GitHub recibe el commit

4. Argo CD detecta el cambio (~3 minutos)
   → Git dice: 3 réplicas
   → Cluster tiene: 2 réplicas
   → Estado: OutOfSync

5. Argo CD aplica el cambio
   → Crea el tercer pod de backend
   → RollingUpdate: zero downtime

6. Estado final: Synced + Healthy
   → registrado en historial con commit, autor y timestamp
```

---

## 9. Evidencia del GitOps funcionando

### Antes del push
```
backend-5bfc4b69cc-8k7rn   1/1   Running   16h
backend-5bfc4b69cc-gwgrg   1/1   Running   16h
```

### Después del push — sin tocar el cluster
```
backend-5bfc4b69cc-8k7rn   1/1   Running   16h
backend-5bfc4b69cc-gwgrg   1/1   Running   16h
backend-5bfc4b69cc-sxqss   1/1   Running   49s  ← creado por Argo CD
```

### Historial de deploys (4 en total)
| # | Commit | Qué cambió |
|---|---|---|
| 1 | `ace5bf0` | Primer despliegue funcional |
| 2 | `fee634b` | Dockerignore, NodePort, RollingUpdate |
| 3 | `232bfa3` | Fix NodePort 30090 |
| 4 | `276ac97` | Demo GitOps: escalar a 3 réplicas |

---

## 10. Resumen de recursos desplegados

| Recurso | Tipo K8s | Cantidad | Descripción |
|---|---|---|---|
| mysql-0 | StatefulSet | 1 pod | Base de datos MySQL |
| backend | Deployment | 3 pods | API NestJS |
| frontend | Deployment | 2 pods | Servidor Nginx |
| mysql-data | PVC | 5GB | Almacenamiento persistente |
| crazy-cookies-secrets | Secret | — | Credenciales DB y JWT |
| backend-config | ConfigMap | — | Variables de entorno |
| frontend svc | NodePort:30090 | — | Acceso externo |
| backend svc | ClusterIP:3000 | — | Acceso interno |
| mysql svc | Headless | — | Acceso interno DB |

**Total: 6 pods corriendo, 18 manifiestos YML, 4 deploys realizados.**

---

## 11. Glosario

| Término | Definición |
|---|---|
| **GitOps** | Git como única fuente de verdad para infraestructura |
| **k8s** | Abreviación de Kubernetes (K + 8 letras + s) |
| **Cluster** | El servidor Kubernetes completo |
| **Namespace** | Instancia o división lógica dentro del cluster |
| **Pod** | Unidad mínima de K8s — envoltura del contenedor Docker |
| **Contenedor** | El proceso que corre adentro del pod (NestJS, MySQL, Nginx) |
| **Deployment** | Define cuántos pods correr y cómo actualizarlos |
| **StatefulSet** | Como Deployment pero para bases de datos (con estado) |
| **Service** | Punto de acceso estable a un grupo de pods |
| **ClusterIP** | Service solo accesible dentro del cluster |
| **NodePort** | Service accesible desde fuera del cluster |
| **ConfigMap** | Variables de entorno no sensibles |
| **Secret** | Variables de entorno sensibles (contraseñas, tokens) |
| **PVC** | Disco de almacenamiento persistente |
| **Kustomize** | Herramienta para organizar manifiestos K8s |
| **App of Apps** | Patrón donde una app de Argo CD gestiona otras apps |
| **Sync Wave** | Orden de despliegue entre componentes |
| **Self-heal** | Argo CD revierte cambios manuales en el cluster |
| **RollingUpdate** | Actualización sin downtime |
| **CI** | Continuous Integration — construir y testear |
| **CD** | Continuous Delivery — desplegar automáticamente |

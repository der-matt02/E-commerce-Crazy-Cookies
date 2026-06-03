# Argo CD — Implementación GitOps en Crazy Cookies E-commerce

## Tabla de contenidos
1. [¿Qué es GitOps?](#1-qué-es-gitops)
2. [¿Qué es Argo CD?](#2-qué-es-argo-cd)
3. [Herramientas utilizadas](#3-herramientas-utilizadas)
4. [Arquitectura implementada](#4-arquitectura-implementada)
5. [Estructura de manifiestos](#5-estructura-de-manifiestos)
6. [Patrón App of Apps](#6-patrón-app-of-apps)
7. [Buenas prácticas aplicadas](#7-buenas-prácticas-aplicadas)
8. [Flujo completo de un deploy](#8-flujo-completo-de-un-deploy)
9. [Evidencia del GitOps funcionando](#9-evidencia-del-gitops-funcionando)
10. [Comandos clave](#10-comandos-clave)

---

## 1. ¿Qué es GitOps?

GitOps es una metodología donde **Git es la única fuente de verdad** del estado de la infraestructura.

### Principios fundamentales

| Principio | Descripción |
|---|---|
| **Git como fuente de verdad** | Todo lo que debe existir en el cluster está declarado en el repositorio |
| **Infraestructura declarativa** | Se describe *qué* se quiere, no *cómo* hacerlo |
| **Sincronización automática** | Un agente detecta diferencias entre Git y el cluster y las corrige solo |
| **Auditoría completa** | Cada cambio en el cluster tiene un commit asociado — quién, cuándo y por qué |

### Diferencia con el enfoque tradicional

```
TRADICIONAL (imperativo):
  Developer → kubectl apply → Cluster
  ↑ Manual, no hay registro, fácil de perder el estado

GITOPS (declarativo):
  Developer → git push → GitHub → Argo CD detecta → Cluster
  ↑ Automatizado, trazable, reversible
```

---

## 2. ¿Qué es Argo CD?

Argo CD es una herramienta de **Continuous Delivery (CD)** para Kubernetes que implementa GitOps.

### ¿Qué hace exactamente?

1. **Vigila** un repositorio Git cada ~3 minutos
2. **Compara** lo que hay en Git vs lo que hay en el cluster
3. **Sincroniza** automáticamente si detecta diferencias
4. **Revierte** cambios manuales en el cluster (selfHeal)

### ¿Qué NO hace Argo CD?

- No construye imágenes Docker (eso es CI — Jenkins, GitHub Actions, etc.)
- No ejecuta tests
- No compila código

Argo CD es **exclusivamente CD** — toma lo que está en Git y lo despliega.

### CI vs CD

```
CI (Continuous Integration)     CD (Continuous Delivery)
─────────────────────────────   ─────────────────────────
Compilar código                 Desplegar al cluster
Ejecutar tests                  Sincronizar manifiestos
Construir imagen Docker         Gestionar rollbacks
Publicar imagen al registry     Monitorear estado
         ↓                               ↓
   GitHub Actions              →    Argo CD
```

---

## 3. Herramientas utilizadas

| Herramienta | Versión | Rol |
|---|---|---|
| **Docker** | 29.4.3 | Motor de contenedores |
| **Minikube** | v1.38.1 | Cluster Kubernetes local |
| **kubectl** | v1.34.1 | CLI para administrar Kubernetes |
| **Kustomize** | v5.7.1 | Gestión de manifiestos K8s |
| **Argo CD** | v2.14.x | Herramienta de CD / GitOps |
| **Git** | 2.54.0 | Control de versiones |
| **GitHub** | — | Repositorio remoto (fuente de verdad) |

### ¿Por qué Minikube?

Minikube crea un cluster Kubernetes completo dentro de un contenedor Docker en la máquina local. No requiere servidores en la nube ni cuentas de pago — todo corre en `localhost`.

```
Tu máquina
└── Docker Desktop
    └── Contenedor: minikube (192.168.49.2)
        └── Kubernetes cluster
            ├── namespace: argocd      ← Argo CD
            └── namespace: crazy-cookies ← La aplicación
```

---

## 4. Arquitectura implementada

### Diagrama general

```
┌─────────────────────────────────────────────────────┐
│                   MÁQUINA LOCAL                     │
│                                                     │
│  ┌──────────┐    git push    ┌──────────────────┐  │
│  │Developer │ ──────────────▶│  GitHub (main)   │  │
│  └──────────┘                └────────┬─────────┘  │
│                                       │ polling     │
│                              cada ~3 min            │
│                                       ▼             │
│  ┌────────────────────────────────────────────────┐ │
│  │           MINIKUBE (Kubernetes)                │ │
│  │                                                │ │
│  │  ┌─────────────────┐   ┌──────────────────┐  │ │
│  │  │  ns: argocd     │   │ ns: crazy-cookies │  │ │
│  │  │                 │   │                  │  │ │
│  │  │  ┌───────────┐  │   │  MySQL  (1 pod)  │  │ │
│  │  │  │  Argo CD  │──┼───▶  Backend (2 pods)│  │ │
│  │  │  └───────────┘  │   │  Frontend(2 pods)│  │ │
│  │  └─────────────────┘   └──────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Namespaces

| Namespace | Propósito | Creado por |
|---|---|---|
| `argocd` | Almacena Argo CD y las definiciones de aplicaciones | Nosotros |
| `crazy-cookies` | Corre la aplicación (pods, servicios, configs) | Nosotros |
| `kube-system` | Sistema interno de Kubernetes | Kubernetes |
| `default` | Espacio genérico vacío | Kubernetes |

### Recursos desplegados

| Recurso | Tipo | Cantidad | Descripción |
|---|---|---|---|
| mysql-0 | StatefulSet | 1 pod | Base de datos MySQL con volumen persistente |
| backend | Deployment | 2 pods | API NestJS |
| frontend | Deployment | 2 pods | Servidor Nginx |
| backend (svc) | ClusterIP | — | Acceso interno al backend |
| frontend (svc) | NodePort:30090 | — | Acceso externo al frontend |
| mysql (svc) | Headless | — | Acceso interno a MySQL |
| mysql-data | PVC 5Gi | — | Almacenamiento persistente |
| crazy-cookies-secrets | Secret | — | Credenciales DB y JWT |
| backend-config | ConfigMap | — | Variables de entorno no sensibles |

---

## 5. Estructura de manifiestos

Todos los manifiestos viven en la carpeta `k8s/` del repositorio:

```
k8s/
├── root-app.yaml              ← Bootstrap: se aplica una sola vez manualmente
├── namespace.yaml             ← Define el namespace crazy-cookies
│
├── apps/                      ← Argo CD Applications (App of Apps)
│   ├── database-app.yaml      ← sync-wave: 0 (primero)
│   ├── backend-app.yaml       ← sync-wave: 1 (segundo)
│   └── frontend-app.yaml      ← sync-wave: 2 (tercero)
│
├── database/                  ← Manifiestos de MySQL
│   ├── statefulset.yaml
│   ├── service.yaml
│   ├── pvc.yaml
│   ├── secret.yaml
│   └── kustomization.yaml
│
├── backend/                   ← Manifiestos del backend NestJS
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── kustomization.yaml
│
└── frontend/                  ← Manifiestos del frontend Nginx
    ├── deployment.yaml
    ├── service.yaml
    └── kustomization.yaml
```

---

## 6. Patrón App of Apps

Este es el patrón de Argo CD que usamos para mantener **modularidad**.

### ¿Cómo funciona?

```
kubectl apply -f k8s/root-app.yaml    ← único comando manual

         crazy-cookies-root
         (App de Argo CD)
               │
               │ gestiona
               ▼
        k8s/apps/ en GitHub
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
   database  backend  frontend
    (App)    (App)    (App)
       │       │       │
       ▼       ▼       ▼
   MySQL    NestJS   Nginx
   pods     pods     pods
```

### Sync Waves — orden de despliegue

Las sync waves garantizan que los componentes se despliegan en el orden correcto:

```yaml
# database-app.yaml
annotations:
  argocd.argoproj.io/sync-wave: "0"   # Primero: MySQL debe estar listo

# backend-app.yaml
annotations:
  argocd.argoproj.io/sync-wave: "1"   # Segundo: Backend necesita la DB

# frontend-app.yaml
annotations:
  argocd.argoproj.io/sync-wave: "2"   # Tercero: Frontend necesita el Backend
```

---

## 7. Buenas prácticas aplicadas

### Kubernetes

| Práctica | Implementación |
|---|---|
| **Alta disponibilidad** | `replicas: 2` en backend y frontend |
| **Zero-downtime deploys** | `RollingUpdate` con `maxUnavailable: 0` y `maxSurge: 1` |
| **Resource limits** | CPU y memoria definidos en todos los pods |
| **Separación de secretos** | Credenciales en `Secret`, config en `ConfigMap` |
| **Health checks** | `readinessProbe` y `livenessProbe` en los deployments |
| **Almacenamiento persistente** | PVC de 5Gi para MySQL |
| **Acceso controlado** | Backend en ClusterIP (interno), Frontend en NodePort (externo) |

### Argo CD / GitOps

| Práctica | Implementación |
|---|---|
| **Auto-sync** | Argo CD sincroniza automáticamente sin intervención humana |
| **Self-heal** | Si alguien modifica el cluster a mano, Argo CD lo revierte |
| **Prune** | Recursos eliminados en Git se eliminan del cluster |
| **Modularidad** | App of Apps — cada componente es una app independiente |
| **Trazabilidad** | Cada estado del cluster tiene un commit de Git asociado |
| **Rama única** | Todo el CD opera sobre `main` — rama de producción |

### Docker

| Práctica | Implementación |
|---|---|
| **Multi-stage build** | Imagen de build separada de imagen de producción |
| **Imágenes Alpine** | `node:18-alpine` y `nginx:alpine` — mínimas y seguras |
| **Solo deps de producción** | `--prod` en install — sin devDependencies |
| **Layer caching** | `COPY package.json` antes que `COPY .` |
| **.dockerignore** | Excluye `node_modules`, tests, `.env`, `.git` |

---

## 8. Flujo completo de un deploy

```
1. Developer modifica un manifiesto en k8s/
   ejemplo: cambia replicas: 2 → replicas: 3

2. git add + git commit + git push origin main

3. GitHub recibe el commit (276ac97)

4. Argo CD hace polling a GitHub cada ~3 minutos
   → Detecta: "el commit 276ac97 tiene cambios en k8s/backend"

5. Argo CD compara estado deseado (Git) vs estado actual (cluster)
   → Git dice: 3 réplicas
   → Cluster tiene: 2 réplicas
   → Estado: OutOfSync

6. Argo CD aplica los cambios al cluster via kubectl
   → Crea el tercer pod de backend

7. Kubernetes ejecuta el RollingUpdate
   → Levanta pod nuevo ANTES de bajar el viejo (maxUnavailable: 0)
   → Zero downtime

8. Argo CD confirma sincronización
   → Estado: Synced + Healthy
   → Registra en historial: commit, autor, timestamp
```

### Evidencia registrada

```
SYNC STATUS:  ✅ Synced to main (276ac97)
              Auto sync is enabled.
              Author: dermatt02
              Comment: test: escalar backend de 2 a 3 replicas para demo GitOps

LAST SYNC:    ✅ Sync OK to 276ac97
              Succeeded — Jun 02, 2026 16:57:11
```

---

## 9. Evidencia del GitOps funcionando

### Antes del push
```
NAME                      READY   STATUS    AGE
backend-5bfc4b69cc-8k7rn  1/1     Running   16h
backend-5bfc4b69cc-gwgrg  1/1     Running   16h
```

### Después del push (sin tocar el cluster)
```
NAME                      READY   STATUS    AGE
backend-5bfc4b69cc-8k7rn  1/1     Running   16h
backend-5bfc4b69cc-gwgrg  1/1     Running   16h
backend-5bfc4b69cc-sxqss  1/1     Running   49s   ← creado por Argo CD
```

### Historial de deploys (4 en total)

| # | Commit | Hora | Cambio |
|---|---|---|---|
| 1 | `ace5bf0` | 05:10 | Primer despliegue funcional |
| 2 | `fee634b` | 13:54 | Agregar dockerignore, NodePort, RollingUpdate |
| 3 | `232bfa3` | 14:47 | Fix NodePort 30090 |
| 4 | `276ac97` | 21:57 | **Demo GitOps: escalar a 3 réplicas** |

---

## 10. Comandos clave

### Arrancar el entorno

```bash
# Iniciar el cluster
minikube start --driver=docker

# Verificar que el nodo está listo
kubectl get nodes

# Ver todos los pods de la aplicación
kubectl get pods -n crazy-cookies

# Ver las apps de Argo CD
kubectl get applications -n argocd
```

### Acceder a las UIs

```bash
# Argo CD UI (https://localhost:8080)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Obtener contraseña de Argo CD
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d

# URL del frontend
minikube service frontend -n crazy-cookies --url
```

### Bootstrap (solo la primera vez)

```bash
# Instalar Argo CD en el cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Aplicar el root app (único comando manual para arrancar todo)
kubectl apply -f k8s/root-app.yaml
```

### Ver estado y logs

```bash
# Estado detallado de una app
kubectl describe application crazy-cookies-backend -n argocd

# Logs de un pod
kubectl logs -n crazy-cookies deployment/backend

# Historial de sincronizaciones
kubectl get application crazy-cookies-backend -n argocd \
  -o jsonpath='{range .status.history[*]}{.revision}{" "}{.deployedAt}{"\n"}{end}'
```

---

## Glosario rápido para la defensa

| Término | Definición simple |
|---|---|
| **GitOps** | Git como única fuente de verdad para infraestructura |
| **Cluster** | El servidor Kubernetes — la infraestructura completa |
| **Namespace** | Carpeta lógica dentro del cluster para aislar recursos |
| **Pod** | La unidad mínima de Kubernetes — uno o más contenedores |
| **Deployment** | Define cuántos pods correr y cómo actualizarlos |
| **StatefulSet** | Como Deployment pero para apps con estado (bases de datos) |
| **Service** | Punto de acceso estable a un grupo de pods |
| **ConfigMap** | Variables de entorno no sensibles |
| **Secret** | Variables de entorno sensibles (contraseñas, tokens) |
| **PVC** | Volumen de almacenamiento persistente |
| **Kustomize** | Herramienta para gestionar variantes de manifiestos K8s |
| **App of Apps** | Patrón donde una app de Argo CD gestiona otras apps |
| **Sync Wave** | Orden de despliegue entre componentes |
| **Self-heal** | Argo CD revierte cambios manuales en el cluster |
| **Rolling Update** | Actualización sin downtime — nuevo pod antes de bajar el viejo |

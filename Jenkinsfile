// ═══════════════════════════════════════════════════════════════════
// Pipeline CI — E-commerce Crazy Cookies
// Materia: Procesos de Software — UDLA
// ───────────────────────────────────────────────────────────────────
// ESTRATEGIA 2 ▸ Función reutilizable para ejecutar comandos pnpm
// Recibe el workspace filter y el script a ejecutar.
// Centraliza logging y manejo de errores en un solo lugar.
// ═══════════════════════════════════════════════════════════════════
def runPnpm(String workspace_filter, String script) {
    echo "▶ [${workspace_filter}] pnpm run ${script}"
    sh "pnpm --filter ${workspace_filter} run ${script}"
}

// ═══════════════════════════════════════════════════════════════════
// ESTRATEGIA 2 ▸ Función reutilizable para Health Check de archivos
// ═══════════════════════════════════════════════════════════════════
def checkFile(String filepath) {
    def exists = sh(script: "test -f ${filepath} && echo 'OK' || echo 'MISSING'", returnStdout: true).trim()
    echo "${exists == 'OK' ? '✓' : '✗'} ${filepath} — ${exists}"
    return exists == 'OK'
}

pipeline {
    agent any

    environment {
        REPO_URL = 'https://github.com/der-matt02/E-commerce-Crazy-Cookies.git'
        // ESTRATEGIA 3 ▸ Variable que define en qué ramas se hace Build y E2E
        MAIN_BRANCHES = 'main develop'
    }

    // ─────────────────────────────────────────────────────────────
    // ESTRATEGIA 3 ▸ IC por rama — dispara el pipeline
    // automáticamente en CUALQUIER rama al hacer push
    // (requiere configurar Multibranch Pipeline en Jenkins,
    //  o activar "Poll SCM" en la configuración del job)
    // ─────────────────────────────────────────────────────────────
    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 1 — Checkout
        // ══════════════════════════════════════════════════════════
        stage('Checkout') {
            steps {
                git credentialsId: 'github-creds',
                    url: env.REPO_URL,
                    branch: env.BRANCH_NAME ?: 'main'

                script {
                    // Captura la rama activa para usarla en los when de abajo
                    env.CURRENT_BRANCH = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                    echo "═══ Rama activa: ${env.CURRENT_BRANCH} ═══"
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 2 — Setup del entorno
        // ══════════════════════════════════════════════════════════
        stage('Setup') {
            steps {
                sh '''
                    which pnpm || npm install -g pnpm@8
                    echo "Node: $(node --version)"
                    echo "pnpm: $(pnpm --version)"
                    pnpm --filter backend install --frozen-lockfile=false
                    pnpm --filter backend exec prisma generate
                    echo "Prisma client generado correctamente"
                '''
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 3 — Instalación de dependencias
        // ESTRATEGIA 4 ▸ Paralelismo — backend y frontend simultáneo
        // ══════════════════════════════════════════════════════════
        stage('Install Dependencies') {
            parallel {
                stage('Backend — Install') {
                    steps {
                        sh 'rm -rf node_modules/.pnpm/node_modules 2>/dev/null || true'
                        sh 'pnpm --filter backend install --no-frozen-lockfile'
                    }
                }
                stage('Frontend — Install') {
                    steps {
                        sh 'pnpm --filter frontend install --no-frozen-lockfile'
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 4 — Calidad de código (ESLint)
        // ESTRATEGIA 4 ▸ Paralelismo — lint backend y frontend
        // ══════════════════════════════════════════════════════════
        stage('Code Quality — ESLint') {
            parallel {
                stage('Backend — ESLint') {
                    steps {
                        // ESLint marca UNSTABLE (no FAILURE) para no bloquear el pipeline
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('backend', 'lint') }
                        }
                    }
                }
                stage('Frontend — ESLint') {
                    steps {
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('frontend', 'lint') }
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 5 — Tests unitarios
        // ESTRATEGIA 4 ▸ Paralelismo — Jest y Vitest al mismo tiempo
        // ══════════════════════════════════════════════════════════
        stage('Unit Tests') {
            parallel {
                stage('Backend — Jest') {
                    steps {
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('backend', 'test') }
                        }
                    }
                }
                stage('Frontend — Vitest') {
                    steps {
                        // catchError marca como UNSTABLE si no hay tests
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('frontend', 'test') }
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 6 — Tests E2E
        // ESTRATEGIA 3 ▸ IC por rama — SOLO se ejecuta en main/develop
        //   En feature/* se omite esta etapa (agiliza el ciclo de dev)
        // ══════════════════════════════════════════════════════════
        stage('E2E Tests') {
            when {
                expression {
                    def branch = env.CURRENT_BRANCH ?: env.BRANCH_NAME ?: 'main'
                    return branch == 'main' || branch == 'develop'
                }
            }
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    script { runPnpm('backend', 'test:e2e') }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 7 — Build
        // ESTRATEGIA 3 ▸ IC por rama — SOLO en main/develop
        //   En feature/* no se buildea (feedback más rápido)
        // ESTRATEGIA 4 ▸ Paralelismo — nest build y next build juntos
        // ══════════════════════════════════════════════════════════
        stage('Build') {
            when {
                expression {
                    def branch = env.CURRENT_BRANCH ?: env.BRANCH_NAME ?: 'main'
                    return branch == 'main' || branch == 'develop'
                }
            }
            parallel {
                stage('Backend — nest build') {
                    steps {
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('backend', 'build') }
                        }
                    }
                }
                stage('Frontend — next build') {
                    steps {
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            script { runPnpm('frontend', 'build') }
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 8 — Health Check
        // ESTRATEGIA 2 ▸ Usa la función reutilizable checkFile()
        // ══════════════════════════════════════════════════════════
        stage('Health Check') {
            steps {
                script {
                    echo '=== Verificando archivos críticos del proyecto ==='
                    checkFile('docker-compose.yml')
                    checkFile('.env.example')
                    checkFile('.gitignore')
                    checkFile('pnpm-workspace.yaml')

                    def tsCount = sh(
                        script: "find . -name '*.ts' -not -path '*/node_modules/*' -not -path '*/.next/*' | wc -l",
                        returnStdout: true
                    ).trim()
                    echo "Archivos TypeScript detectados: ${tsCount}"

                    def todos = sh(
                        script: "grep -r 'TODO' --include='*.ts' --exclude-dir=node_modules -l 2>/dev/null | wc -l || echo 0",
                        returnStdout: true
                    ).trim()
                    echo "Archivos con TODOs pendientes: ${todos}"

                    echo '=== Health Check completado ==='
                }
            }
        }

    }

    // ─────────────────────────────────────────────────────────────
    // Post — Reporte final con resumen de la ejecución
    // ─────────────────────────────────────────────────────────────
    post {
        success {
            echo """
╔══════════════════════════════════════╗
║   ✅  PIPELINE SUCCESS               ║
║   Rama: ${env.CURRENT_BRANCH ?: 'main'}
╚══════════════════════════════════════╝"""
        }
        unstable {
            echo """
╔══════════════════════════════════════╗
║   ⚠️  PIPELINE UNSTABLE              ║
║   Rama: ${env.CURRENT_BRANCH ?: 'main'}
║   Revisar tests fallidos             ║
╚══════════════════════════════════════╝"""
        }
        failure {
            echo """
╔══════════════════════════════════════╗
║   ❌  PIPELINE FAILED                ║
║   Rama: ${env.CURRENT_BRANCH ?: 'main'}
║   Revisar el stage que falló         ║
╚══════════════════════════════════════╝"""
        }
    }
}

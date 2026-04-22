// ═══════════════════════════════════════════════════════════════════
// Pipeline CI — E-commerce Crazy Cookies
// Materia: Procesos de Software — UDLA
// ───────────────────────────────────────────────────────────────────
// ESTRATEGIA 2 ▸ Modularidad — la lógica de cada stage vive en
// archivos externos dentro de ci/. El Jenkinsfile solo orquesta.
// ═══════════════════════════════════════════════════════════════════

pipeline {
    agent any

    environment {
        REPO_URL = 'https://github.com/der-matt02/E-commerce-Crazy-Cookies.git'
    }

    // ─────────────────────────────────────────────────────────────
    // ESTRATEGIA 3 ▸ CI por rama — revisa el repo cada 5 minutos
    // y dispara el pipeline automáticamente al detectar un commit
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
        // ESTRATEGIA 2 ▸ Lógica en ci/setup.sh
        // ══════════════════════════════════════════════════════════
        stage('Setup') {
            steps {
                sh 'chmod +x ci/*.sh && ./ci/setup.sh'
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 3 — Instalación de dependencias
        // ESTRATEGIA 2 ▸ Lógica en ci/install-backend.sh y ci/install-frontend.sh
        // ESTRATEGIA 4 ▸ Paralelismo — backend y frontend simultáneo
        // ══════════════════════════════════════════════════════════
        stage('Install Dependencies') {
            parallel {
                stage('Backend — Install') {
                    steps { sh './ci/install-backend.sh' }
                }
                stage('Frontend — Install') {
                    steps { sh './ci/install-frontend.sh' }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 4 — Calidad de código (ESLint)
        // ESTRATEGIA 2 ▸ Lógica en ci/lint-backend.sh y ci/lint-frontend.sh
        // ESTRATEGIA 4 ▸ Paralelismo — lint backend y frontend
        // ══════════════════════════════════════════════════════════
        stage('Code Quality — ESLint') {
            parallel {
                stage('Backend — ESLint') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/lint-backend.sh'
                        }
                    }
                }
                stage('Frontend — ESLint') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/lint-frontend.sh'
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 5 — Tests unitarios
        // ESTRATEGIA 2 ▸ Lógica en ci/test-backend.sh y ci/test-frontend.sh
        // ESTRATEGIA 4 ▸ Paralelismo — Jest y Vitest al mismo tiempo
        // ══════════════════════════════════════════════════════════
        stage('Unit Tests') {
            parallel {
                stage('Backend — Jest') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/test-backend.sh'
                        }
                    }
                }
                stage('Frontend — Vitest') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/test-frontend.sh'
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 6 — Tests E2E
        // ESTRATEGIA 2 ▸ Lógica en ci/test-e2e.sh
        // ESTRATEGIA 3 ▸ CI por rama — SOLO se ejecuta en main/develop
        // ══════════════════════════════════════════════════════════
        stage('E2E Tests') {
            when {
                expression {
                    def branch = env.CURRENT_BRANCH ?: env.BRANCH_NAME ?: 'main'
                    return branch == 'main' || branch == 'develop'
                }
            }
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh './ci/test-e2e.sh'
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 7 — Build
        // ESTRATEGIA 2 ▸ Lógica en ci/build-backend.sh y ci/build-frontend.sh
        // ESTRATEGIA 3 ▸ CI por rama — SOLO en main/develop
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
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/build-backend.sh'
                        }
                    }
                }
                stage('Frontend — next build') {
                    steps {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh './ci/build-frontend.sh'
                        }
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // ESTRATEGIA 1 ▸ Etapa 8 — Health Check
        // ESTRATEGIA 2 ▸ Lógica en ci/health-check.sh
        // ══════════════════════════════════════════════════════════
        stage('Health Check') {
            steps {
                sh './ci/health-check.sh'
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

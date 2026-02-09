# Proyecto: E-commerce escalable (NestJS + Next.js)

## Identidad del proyecto
- Tipo: E-commerce de baja escala inicial, diseñado para escalar a media y alta.
- Enfoque: arquitectura limpia, modular, segura y mantenible.
- Lenguaje principal: TypeScript (LTS).
- Prioridad: claridad, SOLID, testing, seguridad y documentación limpia.

---

## Regla crítica de control
- Claude NO debe asumir ni crear estructuras definitivas sin confirmación explícita del usuario.
- Antes de crear el monorepo, Claude debe:
  1) Proponer una estructura
  2) Justificarla técnica y arquitectónicamente
  3) Esperar aprobación explícita ("OK, adelante")

---

## Arquitectura (lineamientos, no implementación)
- Backend y frontend deben estar desacoplados.
- La comunicación es vía API (HTTP/JSON).
- La lógica de negocio vive en servicios/casos de uso.
- Controladores solo orquestan, no contienen lógica.
- Acceso a datos aislado en repositories.
- Configuración separada del código.

---

## Backend (NestJS)
- Usar NestJS LTS con TypeScript estricto.
- Aplicar SOLID en todos los módulos.
- Arquitectura modular por dominio (no técnica).
- Usar patrones cuando apliquen:
  - Repository
  - Factory
  - Strategy
  - Dependency Injection
- Validación con class-validator y class-transformer.
- Seguridad:
  - JWT para auth
  - Hash de contraseñas con bcrypt
  - Helmet, CORS configurado
  - Rate limiting
- Base de datos: MySQL.
- ORM: Prisma o TypeORM (Claude debe proponer y justificar).
- Tests:
  - Unitarios e integración con Jest.
  - Carpeta /test separada del código productivo.

---

## Frontend (Next.js)
- Next.js LTS con TypeScript estricto.
- Arquitectura por features.
- Componentes pequeños y reutilizables.
- Prohibido usar `any`.
- Validación de datos de entrada.
- Accesibilidad básica (labels, focus, aria cuando aplique).
- UX/UI consistente:
  - spacing, tipografía, jerarquía visual coherente.
- Tests:
  - Unitarios
  - E2E (Playwright o similar).

---

## Testing y calidad
- Ningún cambio se considera terminado si los tests fallan.
- Claude debe ejecutar o simular:
  - tests backend
  - tests frontend
- Linting y formato obligatorios.
- Código legible antes que “ingenioso”.

---

## Seguridad
- No exponer secretos en código.
- Uso de variables de entorno.
- Validación estricta de inputs.
- Manejo centralizado de errores.
- Logs sin información sensible.

---

## Docker e infraestructura
- Claude puede proponer Docker y docker-compose.
- No crear infraestructura sin aprobación.
- MySQL debe correr en contenedor aislado.
- Configuración preparada para staging y producción.

---

## Documentación
- Código autodocumentado (Clean Code).
- Comentarios solo cuando agregan valor.
- Documentación técnica en /docs cuando sea necesario.
- No documentar lo obvio.

---

## Git y flujo de trabajo
- Repositorio en GitHub.
- GitFlow obligatorio:
  - main (producción)
  - develop
  - feature/*
  - release/*
  - hotfix/*
- Commits claros y descriptivos.
- No subir código roto.

---

## Link de repositorio de github
- https://github.com/der-matt02/E-commerce-Crazy-Cookies

---

## Comportamiento esperado de Claude
- No improvisar decisiones estructurales.
- Proponer y justificar antes de actuar.
- Preguntar cuando haya ambigüedad.
- Preferir soluciones simples, seguras y escalables.

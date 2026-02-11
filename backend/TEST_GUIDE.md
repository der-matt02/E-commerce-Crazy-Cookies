# Guía de Testing - Backend

## Cobertura de Tests

Este proyecto incluye tests completos para garantizar la calidad y confiabilidad del código:

- ✅ **Tests Unitarios**: Services individuales con mocks
- ✅ **Tests E2E**: Flujos completos de usuario
- 🎯 **Objetivo**: >80% coverage

## Tests Implementados

### Tests Unitarios

#### InventoryService (`inventory.service.spec.ts`)
- ✅ Reserva de stock
- ✅ Liberación de stock
- ✅ Verificación de disponibilidad
- ✅ Manejo de errores (stock insuficiente, inventario no encontrado)

#### CartService (`cart.service.spec.ts`)
- ✅ Obtener/crear carrito
- ✅ Agregar items con reserva de stock
- ✅ Actualizar cantidades
- ✅ Eliminar items con liberación de stock
- ✅ Vaciar carrito
- ✅ Validaciones (producto inactivo, stock insuficiente)

#### OrdersService (`orders.service.spec.ts`)
- ✅ Crear orden desde carrito (transaccional)
- ✅ Actualizar estado de orden
- ✅ Validación de transiciones de estado
- ✅ Historial de cambios
- ✅ Manejo de errores (carrito vacío, producto inactivo)

#### ReviewsService (`reviews.service.spec.ts`)
- ✅ Crear review (isApproved = false por defecto)
- ✅ Obtener reviews por producto (solo aprobadas públicamente)
- ✅ Aprobar/rechazar reviews
- ✅ Calcular estadísticas de rating
- ✅ Eliminar reviews
- ✅ Validaciones (producto no existe, producto inactivo)

### Tests E2E (`test/ecommerce.e2e-spec.ts`)

#### User Journey Completo:
1. ✅ Browse productos (GET /products)
2. ✅ Ver detalle de producto (GET /products/:id)
3. ✅ Agregar al carrito (POST /cart/items)
4. ✅ Ver carrito (GET /cart)
5. ✅ Verificar reserva de stock
6. ✅ Actualizar cantidad (PATCH /cart/items/:id)
7. ✅ Crear orden (POST /orders)
8. ✅ Verificar carrito vacío después de orden
9. ✅ Verificar inventario actualizado
10. ✅ Ver orden creada (GET /orders/:id)
11. ✅ Actualizar estado de orden (PATCH /orders/:id/status)

#### Review Flow:
1. ✅ Crear review
2. ✅ Verificar que no aparece sin aprobación
3. ✅ Aprobar review
4. ✅ Verificar que aparece después de aprobación
5. ✅ Obtener estadísticas de rating

## Comandos de Testing

### Ejecutar todos los tests unitarios
```bash
cd backend
pnpm test
```

### Ejecutar tests con watch mode
```bash
pnpm test:watch
```

### Ejecutar tests con cobertura
```bash
pnpm test:cov
```

### Ejecutar tests E2E
```bash
pnpm test:e2e
```

### Ejecutar test específico
```bash
# Unitario
pnpm test inventory.service.spec

# E2E
pnpm test:e2e ecommerce.e2e-spec
```

### Ejecutar en modo debug
```bash
pnpm test:debug
```

## Resultados Esperados

### Coverage Mínimo
- **Statements**: >80%
- **Branches**: >80%
- **Functions**: >80%
- **Lines**: >80%

### Ejemplo de Output

```
 PASS  src/modules/inventory/inventory.service.spec.ts
 PASS  src/modules/cart/cart.service.spec.ts
 PASS  src/modules/orders/orders.service.spec.ts
 PASS  src/modules/reviews/reviews.service.spec.ts
 PASS  test/ecommerce.e2e-spec.ts

Test Suites: 5 passed, 5 total
Tests:       67 passed, 67 total
Snapshots:   0 total
Time:        12.345 s

Coverage summary:
Statements   : 85.23% ( 234/274 )
Branches     : 82.15% ( 89/108 )
Functions    : 88.92% ( 65/73 )
Lines        : 85.67% ( 221/258 )
```

## Estructura de Tests

### Unitarios
```
src/
└── modules/
    ├── inventory/
    │   └── inventory.service.spec.ts
    ├── cart/
    │   └── cart.service.spec.ts
    ├── orders/
    │   └── orders.service.spec.ts
    └── reviews/
        └── reviews.service.spec.ts
```

### E2E
```
test/
├── app.e2e-spec.ts (default)
├── ecommerce.e2e-spec.ts (flujos completos)
└── jest-e2e.json (configuración)
```

## Buenas Prácticas

1. **Aislamiento**: Cada test es independiente
2. **Mocks**: Se mockean todas las dependencias externas
3. **Setup/Teardown**: beforeEach y afterAll limpian el estado
4. **Descriptivos**: Nombres claros que describen qué se prueba
5. **Arrange-Act-Assert**: Estructura clara de cada test

## Agregar Nuevos Tests

### Template Unitario
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Template E2E
```typescript
import * as request from 'supertest';

describe('Feature (e2e)', () => {
  it('/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200)
      .expect('Expected response');
  });
});
```

## CI/CD

Los tests se ejecutan automáticamente en cada push via GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    cd backend
    pnpm test:cov
    pnpm test:e2e
```

## Troubleshooting

### Tests fallan por timeout
```bash
# Aumentar timeout en jest.config.js
testTimeout: 30000
```

### Base de datos en tests E2E
Los tests E2E usan la misma base de datos configurada en `.env`. Considera usar una base de datos separada para testing:

```env
# .env.test
DATABASE_URL="mysql://user:password@localhost:3306/ecommerce_test"
```

### Limpiar caché de Jest
```bash
pnpm test --clearCache
```

## Recursos

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)

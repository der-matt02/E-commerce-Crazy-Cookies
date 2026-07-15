'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  adminId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  PRODUCT_CREATED: 'bg-success/15 text-success-dark',
  PRODUCT_UPDATED: 'bg-accent-light text-accent-dark',
  PRODUCT_DELETED: 'bg-error/15 text-error-dark',
  CATEGORY_CREATED: 'bg-success/15 text-success-dark',
  CATEGORY_UPDATED: 'bg-accent-light text-accent-dark',
  CATEGORY_DELETED: 'bg-error/15 text-error-dark',
  INVENTORY_ADJUSTED: 'bg-purple-100 text-purple-800',
  STOCK_LOW_ALERT: 'bg-orange-100 text-orange-800',
  ORDER_CREATED: 'bg-success/15 text-success-dark',
  ORDER_STATUS_CHANGED: 'bg-accent-light text-accent-dark',
  ORDER_CANCELLED: 'bg-error/15 text-error-dark',
  REVIEW_CREATED: 'bg-cream text-ink',
  REVIEW_APPROVED: 'bg-success/15 text-success-dark',
  REVIEW_REJECTED: 'bg-error/15 text-error-dark',
  REVIEW_DELETED: 'bg-error/15 text-error-dark',
  ADMIN_LOGIN: 'bg-indigo-100 text-indigo-800',
  ADMIN_LOGOUT: 'bg-cream text-ink',
};

const ACTION_LABELS: Record<string, string> = {
  PRODUCT_CREATED: 'Producto creado',
  PRODUCT_UPDATED: 'Producto editado',
  PRODUCT_DELETED: 'Producto eliminado',
  CATEGORY_CREATED: 'Categoría creada',
  CATEGORY_UPDATED: 'Categoría editada',
  CATEGORY_DELETED: 'Categoría eliminada',
  INVENTORY_ADJUSTED: 'Inventario ajustado',
  STOCK_LOW_ALERT: 'Alerta stock bajo',
  ORDER_CREATED: 'Orden creada',
  ORDER_STATUS_CHANGED: 'Estado de orden cambiado',
  ORDER_CANCELLED: 'Orden cancelada',
  REVIEW_CREATED: 'Review creada',
  REVIEW_APPROVED: 'Review aprobada',
  REVIEW_REJECTED: 'Review rechazada',
  REVIEW_DELETED: 'Review eliminada',
  ADMIN_LOGIN: 'Inicio de sesión',
  ADMIN_LOGOUT: 'Cierre de sesión',
};

const ENTITY_LABELS: Record<string, string> = {
  Product: 'Producto',
  Category: 'Categoría',
  Inventory: 'Inventario',
  Order: 'Orden',
  Review: 'Review',
  Admin: 'Admin',
};

const LIMIT = 20;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction, filterEntity]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
      };
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entity = filterEntity;

      const { data } = await apiClient.get<{ logs: AuditLog[]; total: number }>('/audit', {
        params,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Auditoría</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={filterAction}
          onChange={(e) => handleFilterChange(setFilterAction)(e.target.value)}
          className="rounded-card border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterEntity}
          onChange={(e) => handleFilterChange(setFilterEntity)(e.target.value)}
          className="rounded-card border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>

        {(filterAction || filterEntity) && (
          <button
            onClick={() => {
              setFilterAction('');
              setFilterEntity('');
              setPage(1);
            }}
            className="text-sm text-ink-light hover:text-ink"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto self-center text-sm text-ink-light">
          {total} registro{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-card bg-white shadow-card">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-ink-light">
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-ink-light">No hay registros de auditoría</div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-cream">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-light">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-light">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-light">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-light">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-light">IP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-light">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {logs.map((log) => (
                <>
                  <tr key={log.id} className="hover:bg-cream">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-light">
                      {new Date(log.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? 'bg-cream text-ink'
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-light">
                      {log.entityId ? log.entityId.slice(0, 8) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-light">{log.ipAddress ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {(log.oldValue || log.newValue) && (
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-xs text-accent hover:text-accent-dark"
                        >
                          {expandedLog === log.id ? 'Ocultar' : 'Ver cambios'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedLog === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-cream">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.oldValue && (
                            <div>
                              <p className="mb-1 font-semibold text-ink-light">Antes:</p>
                              <pre className="overflow-auto rounded bg-error/10 p-2 text-error-dark">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <p className="mb-1 font-semibold text-ink-light">Después:</p>
                              <pre className="overflow-auto rounded bg-success/10 p-2 text-success-dark">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ink-light">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded-card border border-border px-3 py-1 text-sm hover:bg-cream disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="rounded-card border border-border px-3 py-1 text-sm hover:bg-cream disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

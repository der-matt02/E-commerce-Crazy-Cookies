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
  PRODUCT_CREATED: 'bg-green-100 text-green-800',
  PRODUCT_UPDATED: 'bg-blue-100 text-blue-800',
  PRODUCT_DELETED: 'bg-red-100 text-red-800',
  CATEGORY_CREATED: 'bg-green-100 text-green-800',
  CATEGORY_UPDATED: 'bg-blue-100 text-blue-800',
  CATEGORY_DELETED: 'bg-red-100 text-red-800',
  INVENTORY_ADJUSTED: 'bg-purple-100 text-purple-800',
  STOCK_LOW_ALERT: 'bg-orange-100 text-orange-800',
  ORDER_CREATED: 'bg-green-100 text-green-800',
  ORDER_STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  ORDER_CANCELLED: 'bg-red-100 text-red-800',
  REVIEW_CREATED: 'bg-gray-100 text-gray-700',
  REVIEW_APPROVED: 'bg-green-100 text-green-800',
  REVIEW_REJECTED: 'bg-red-100 text-red-800',
  REVIEW_DELETED: 'bg-red-100 text-red-800',
  ADMIN_LOGIN: 'bg-indigo-100 text-indigo-800',
  ADMIN_LOGOUT: 'bg-gray-100 text-gray-700',
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto self-center text-sm text-gray-500">
          {total} registro{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-lg bg-white shadow">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No hay registros de auditoría</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">IP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.map((log) => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {log.entityId ? log.entityId.slice(0, 8) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.ipAddress ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {(log.oldValue || log.newValue) && (
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {expandedLog === log.id ? 'Ocultar' : 'Ver cambios'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedLog === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.oldValue && (
                            <div>
                              <p className="mb-1 font-semibold text-gray-600">Antes:</p>
                              <pre className="overflow-auto rounded bg-red-50 p-2 text-red-800">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <p className="mb-1 font-semibold text-gray-600">Después:</p>
                              <pre className="overflow-auto rounded bg-green-50 p-2 text-green-800">
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
          <p className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

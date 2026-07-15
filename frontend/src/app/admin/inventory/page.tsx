'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '@/lib/error';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import type { Inventory, InventoryMovement, StockAlerts } from '@/types/inventory.types';
import { AdjustmentDirection, AdjustmentType } from '@/types/inventory.types';

export default function AdminInventoryPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [alerts, setAlerts] = useState<StockAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    type: 'IN' as AdjustmentType,
    direction: AdjustmentDirection.INCREASE,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoriesData, alertsData] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getAlerts(),
      ]);
      setInventories(inventoriesData);
      setAlerts(alertsData);
    } catch (err) {
      setError('Error al cargar inventarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setAdjustForm({
      quantity: 0,
      type: AdjustmentType.IN,
      direction: AdjustmentDirection.INCREASE,
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleViewMovements = async (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setShowMovementsModal(true);
    setLoadingMovements(true);

    try {
      const movementsData = await inventoryApi.getMovements(inventory.productId);
      setMovements(movementsData);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInventory || adjustForm.quantity <= 0) {
      alert('Por favor ingresa una cantidad válida');
      return;
    }

    try {
      await inventoryApi.adjustStock(selectedInventory.productId, adjustForm);
      setShowAdjustModal(false);
      await loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al ajustar inventario'));
      console.error(err);
    }
  };

  const getStockStatus = (inventory: Inventory) => {
    if (inventory.stockAvailable <= inventory.stockMinimum) {
      return { color: 'text-error', bg: 'bg-error/15', label: 'Stock Bajo' };
    }
    if (inventory.stockAvailable <= inventory.stockMinimum * 2) {
      return { color: 'text-accent-dark', bg: 'bg-accent-light', label: 'Stock Medio' };
    }
    return { color: 'text-success', bg: 'bg-success/15', label: 'Stock OK' };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink-light">Cargando inventarios...</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-card bg-error/10 p-4 text-error">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Inventario</h1>

      {/* Alertas */}
      {alerts && (alerts.lowStock.length > 0 || alerts.highReserved.length > 0) && (
        <div className="mb-6 space-y-4">
          {alerts.lowStock.length > 0 && (
            <div className="rounded-card bg-error/10 p-4">
              <h3 className="mb-2 font-semibold text-error-dark">
                ⚠️ Productos con Stock Bajo ({alerts.lowStock.length})
              </h3>
              <div className="space-y-1">
                {alerts.lowStock.map((alert) => (
                  <div key={alert.productId} className="text-sm text-error-dark">
                    • {alert.productName}: {alert.stockAvailable} unidades (mínimo:{' '}
                    {alert.stockMinimum})
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.highReserved.length > 0 && (
            <div className="rounded-card bg-accent-light p-4">
              <h3 className="mb-2 font-semibold text-accent-dark">
                📦 Productos con Alto Stock Reservado ({alerts.highReserved.length})
              </h3>
              <div className="space-y-1">
                {alerts.highReserved.map((alert) => (
                  <div key={alert.productId} className="text-sm text-accent-dark">
                    • {alert.productName}: {alert.stockReserved} reservadas (
                    {alert.reservedPercentage}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla de Inventarios */}
      <div className="rounded-card bg-white shadow-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-cream">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Producto</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Disponible</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Reservado</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Mínimo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {inventories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-ink-light">
                  No hay inventarios registrados
                </td>
              </tr>
            ) : (
              inventories.map((inventory) => {
                const status = getStockStatus(inventory);
                return (
                  <tr key={inventory.id} className="hover:bg-cream">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">
                        {inventory.product?.name || 'Sin producto'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-light">
                      {inventory.product?.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-ink">{inventory.stockAvailable}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-light">{inventory.stockReserved}</td>
                    <td className="px-6 py-4 text-sm text-ink-light">{inventory.stockMinimum}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${status.bg} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleViewMovements(inventory)}
                        className="mr-3 text-accent hover:text-accent-dark"
                      >
                        Historial
                      </button>
                      <button
                        onClick={() => handleAdjust(inventory)}
                        className="text-success hover:text-success-dark"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Ajuste */}
      {showAdjustModal && selectedInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Ajustar Stock: {selectedInventory.product?.name}
            </h2>

            <div className="mb-4 rounded-card bg-cream p-3">
              <div className="text-sm text-ink-light">Stock Actual</div>
              <div className="text-2xl font-bold text-ink">
                {selectedInventory.stockAvailable} unidades
              </div>
            </div>

            <form onSubmit={handleSubmitAdjust}>
              <div className="space-y-4">
                {/* Tipo de Ajuste */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    Tipo de Ajuste *
                  </label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) =>
                      setAdjustForm((prev) => ({
                        ...prev,
                        type: e.target.value as AdjustmentType,
                      }))
                    }
                    required
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  >
                    <option value="IN">Entrada (agregar stock)</option>
                    <option value="OUT">Salida (reducir stock)</option>
                    <option value="ADJUSTMENT">Ajuste manual</option>
                  </select>
                </div>

                {/* Dirección (solo para Ajuste manual) */}
                {adjustForm.type === AdjustmentType.ADJUSTMENT && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Dirección *</label>
                    <select
                      value={adjustForm.direction}
                      onChange={(e) =>
                        setAdjustForm((prev) => ({
                          ...prev,
                          direction: e.target.value as AdjustmentDirection,
                        }))
                      }
                      required
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    >
                      <option value={AdjustmentDirection.INCREASE}>
                        Incrementar (había más stock físico que el registrado)
                      </option>
                      <option value={AdjustmentDirection.DECREASE}>
                        Reducir (había menos stock físico que el registrado)
                      </option>
                    </select>
                  </div>
                )}

                {/* Cantidad */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Cantidad *</label>
                  <input
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) =>
                      setAdjustForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    required
                    min="1"
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Razón */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Razón</label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-card border border-border px-4 py-2 text-ink hover:bg-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-card bg-accent px-4 py-2 text-white hover:bg-accent-dark"
                >
                  Ajustar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimientos */}
      {showMovementsModal && selectedInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Historial de Movimientos: {selectedInventory.product?.name}
            </h2>

            {loadingMovements ? (
              <div className="py-12 text-center text-ink-light">Cargando movimientos...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-ink-light">No hay movimientos registrados</div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-cream">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-ink">Fecha</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-ink">Tipo</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-ink">Cantidad</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-ink">Razón</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-cream">
                        <td className="px-4 py-3 text-sm text-ink-light">
                          {new Date(movement.createdAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              movement.type === 'IN'
                                ? 'bg-success/15 text-success-dark'
                                : movement.type === 'OUT'
                                  ? 'bg-error/15 text-error-dark'
                                  : 'bg-accent-light text-accent-dark'
                            }`}
                          >
                            {movement.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-ink">
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-light">
                          {movement.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowMovementsModal(false)}
                className="rounded-card border border-border px-4 py-2 text-ink hover:bg-cream"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

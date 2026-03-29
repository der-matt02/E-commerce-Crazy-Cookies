'use client';

import { useEffect, useState } from 'react';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import type { Inventory, InventoryMovement, StockAlerts } from '@/types/inventory.types';
import { AdjustmentType } from '@/types/inventory.types';

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
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al ajustar inventario');
      console.error(err);
    }
  };

  const getStockStatus = (inventory: Inventory) => {
    if (inventory.stockAvailable <= inventory.stockMinimum) {
      return { color: 'text-red-600', bg: 'bg-red-100', label: 'Stock Bajo' };
    }
    if (inventory.stockAvailable <= inventory.stockMinimum * 2) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Stock Medio' };
    }
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'Stock OK' };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Cargando inventarios...</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Inventario</h1>

      {/* Alertas */}
      {alerts && (alerts.lowStock.length > 0 || alerts.highReserved.length > 0) && (
        <div className="mb-6 space-y-4">
          {alerts.lowStock.length > 0 && (
            <div className="rounded-lg bg-red-50 p-4">
              <h3 className="mb-2 font-semibold text-red-800">
                ⚠️ Productos con Stock Bajo ({alerts.lowStock.length})
              </h3>
              <div className="space-y-1">
                {alerts.lowStock.map((alert) => (
                  <div key={alert.productId} className="text-sm text-red-700">
                    • {alert.productName}: {alert.stockAvailable} unidades (mínimo:{' '}
                    {alert.stockMinimum})
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.highReserved.length > 0 && (
            <div className="rounded-lg bg-yellow-50 p-4">
              <h3 className="mb-2 font-semibold text-yellow-800">
                📦 Productos con Alto Stock Reservado ({alerts.highReserved.length})
              </h3>
              <div className="space-y-1">
                {alerts.highReserved.map((alert) => (
                  <div key={alert.productId} className="text-sm text-yellow-700">
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
      <div className="rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Disponible</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reservado</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Mínimo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {inventories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No hay inventarios registrados
                </td>
              </tr>
            ) : (
              inventories.map((inventory) => {
                const status = getStockStatus(inventory);
                return (
                  <tr key={inventory.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {inventory.product?.name || 'Sin producto'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inventory.product?.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-gray-900">
                        {inventory.stockAvailable}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inventory.stockReserved}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inventory.stockMinimum}</td>
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
                        className="mr-3 text-blue-600 hover:text-blue-800"
                      >
                        Historial
                      </button>
                      <button
                        onClick={() => handleAdjust(inventory)}
                        className="text-green-600 hover:text-green-800"
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Ajustar Stock: {selectedInventory.product?.name}
            </h2>

            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <div className="text-sm text-gray-600">Stock Actual</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedInventory.stockAvailable} unidades
              </div>
            </div>

            <form onSubmit={handleSubmitAdjust}>
              <div className="space-y-4">
                {/* Tipo de Ajuste */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="IN">Entrada (agregar stock)</option>
                    <option value="OUT">Salida (reducir stock)</option>
                    <option value="ADJUSTMENT">Ajuste manual</option>
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad *</label>
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Razón */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Razón</label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Historial de Movimientos: {selectedInventory.product?.name}
            </h2>

            {loadingMovements ? (
              <div className="py-12 text-center text-gray-500">Cargando movimientos...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No hay movimientos registrados</div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Tipo
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Razón
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(movement.createdAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              movement.type === 'IN'
                                ? 'bg-green-100 text-green-800'
                                : movement.type === 'OUT'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {movement.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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

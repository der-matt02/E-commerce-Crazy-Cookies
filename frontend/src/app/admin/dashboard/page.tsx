export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Órdenes</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Productos</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Reviews Pendientes</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>
      <p className="mt-8 text-sm text-gray-500">
        🚧 En construcción - Fase 2: Panel Admin
      </p>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="space-y-1 px-3">
          <a
            href="/admin/dashboard"
            className="block rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            Dashboard
          </a>
          <a
            href="/admin/products"
            className="block rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            Productos
          </a>
          <a
            href="/admin/orders"
            className="block rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            Órdenes
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

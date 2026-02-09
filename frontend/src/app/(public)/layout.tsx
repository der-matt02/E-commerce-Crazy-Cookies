export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white shadow-sm">
        <div className="container-custom py-4">
          <nav className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-primary-600">
              🍪 Crazy Cookies
            </a>
            <div className="flex items-center space-x-6">
              <a href="/products" className="hover:text-primary-600">
                Productos
              </a>
              <a href="/cart" className="hover:text-primary-600">
                Carrito
              </a>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-100 py-8">
        <div className="container-custom text-center text-sm text-gray-600">
          <p>© 2026 Crazy Cookies. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

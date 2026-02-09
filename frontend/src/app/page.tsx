export default function HomePage() {
  return (
    <main className="container-custom min-h-screen py-12">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary-600">
          🍪 Crazy Cookies
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Las mejores galletas y postres artesanales, hechos con amor
        </p>
        <div className="space-x-4">
          <a
            href="/products"
            className="inline-block rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white hover:bg-primary-700"
          >
            Ver Catálogo
          </a>
          <a
            href="/admin/login"
            className="inline-block rounded-lg border border-gray-300 px-8 py-3 font-semibold hover:bg-gray-100"
          >
            Admin
          </a>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          <p>
            <strong>Frontend:</strong> Next.js 14 + TypeScript + Tailwind CSS
          </p>
          <p>
            <strong>Backend:</strong> NestJS + Prisma + MySQL
          </p>
        </div>
      </div>
    </main>
  );
}

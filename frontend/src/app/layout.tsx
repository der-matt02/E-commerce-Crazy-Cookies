import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Crazy Cookies - Galletas y Postres Artesanales',
  description: 'Las mejores galletas y postres artesanales, hechos con amor',
  keywords: ['galletas', 'postres', 'brownies', 'pasteles', 'artesanal', 'bogotá'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}

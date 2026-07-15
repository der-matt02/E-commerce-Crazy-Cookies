import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/globals.scss';
import { CartProvider } from '@/features/cart/context/CartContext';
import { WishlistProvider } from '@/features/wishlist/context/WishlistContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Crazy Cookies — Galletas y Postres Artesanales',
  description: 'Las mejores galletas y postres artesanales, hechos con amor',
  keywords: ['galletas', 'postres', 'brownies', 'pasteles', 'artesanal', 'quito'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-cream antialiased">
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

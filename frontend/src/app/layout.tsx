import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/features/cart/context/CartContext';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Crazy Cookies — Galletas y Postres Artesanales',
  description: 'Las mejores galletas y postres artesanales, hechos con amor',
  keywords: ['galletas', 'postres', 'brownies', 'pasteles', 'artesanal', 'quito'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-cream antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

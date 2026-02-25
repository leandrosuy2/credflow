import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'CredFlow — Limpa Nome',
  description: 'Sistema de vendas por comissão',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={plusJakarta.variable}>
      <body className="antialiased min-h-screen font-sans">
        <AuthProvider>
        {children}
        <Toaster position="top-right" containerClassName="!top-4 !right-4" toastOptions={{ duration: 4000 }} />
      </AuthProvider>
      </body>
    </html>
  );
}

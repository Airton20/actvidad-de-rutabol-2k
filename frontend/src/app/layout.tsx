import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = { title: 'Rutabol SCZ', description: 'Sistema Inteligente de Transporte Urbano' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body><SessionProvider><Nav />{children}</SessionProvider></body>
    </html>
  );
}

import type { Metadata } from 'next';

import '@omnia/ui/globals.css';

import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: 'Omnia Platform — Admin',
  description: 'Painel administrativo da Omnia Platform',
};

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}

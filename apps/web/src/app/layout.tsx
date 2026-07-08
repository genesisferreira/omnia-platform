import type { Metadata } from 'next';

import '@omnia/ui/globals.css';

export const metadata: Metadata = {
  title: 'Omnia Platform',
  description: 'Plataforma SaaS modular do ecossistema Omnia Frigo Holding',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

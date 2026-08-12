import type { Metadata } from 'next';

import '@omnia/ui/globals.css';

export const metadata: Metadata = {
  title: 'Omnia Platform — Admin',
  description: 'Painel administrativo da Omnia Platform',
};

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next'
import '@fontsource/syne/600.css'
import '@fontsource/syne/700.css'
import '@fontsource/syne/800.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/500.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './globals.css'
import { CANONICAL_URL, SITE_URL } from '@/lib/constants'

const title = 'Omnia Frigo | O futuro da refrigeração começa aqui'
const description =
  'A Omnia Frigo Holding desenvolve um ecossistema de engenharia, educação técnica e inteligência artificial para o HVAC-R. Entre na Comunidade Oficial e acompanhe o pré-lançamento.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: 'Omnia Frigo',
  authors: [{ name: 'Omnia Frigo Holding' }],
  creator: 'Omnia Frigo Holding',
  publisher: 'Omnia Frigo Holding',
  keywords: [
    'Omnia Frigo',
    'pré-lançamento',
    'comunidade',
    'HVAC-R',
    'engenharia',
    'inteligência artificial',
    'plataforma Omnia',
  ],
  alternates: {
    canonical: CANONICAL_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: CANONICAL_URL,
    siteName: 'Omnia Frigo',
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0e2d4d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}

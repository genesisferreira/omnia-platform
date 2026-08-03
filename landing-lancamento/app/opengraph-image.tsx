import { ImageResponse } from 'next/og'

export const alt = 'Omnia Frigo Holding — Pré-lançamento'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 72,
          background:
            'linear-gradient(145deg, #0a2239 0%, #0e2d4d 55%, #0b3d36 100%)',
          color: '#f7fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#1a8f74',
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Pré-lançamento
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            maxWidth: 900,
          }}
        >
          Omnia Frigo Holding
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: 'rgba(247,250,252,0.75)',
            maxWidth: 720,
          }}
        >
          Comunidade oficial · Tecnologia · Engenharia · IA
        </div>
      </div>
    ),
    { ...size },
  )
}

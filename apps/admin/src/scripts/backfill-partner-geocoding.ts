/**
 * Backfill de geocodificação de parceiros — SOMENTE DEV/STAGING.
 *
 * Uso (no container admin-migrate ou admin, com env staging):
 *   tsx src/scripts/backfill-partner-geocoding.ts --dry-run
 *   tsx src/scripts/backfill-partner-geocoding.ts --apply
 *
 * Regras:
 * - não altera status/aprovação/plan/featured
 * - não sobrescreve coordenadas válidas (exceto 0,0 / failed / null)
 * - rate limit Nominatim (~1.2s entre requests)
 * - nunca executar em produção
 */

import { getPayload } from 'payload'

import config from '../../payload.config'
import { isUsableCoordinatePair } from '@omnia/shared'
import { applyPartnerLocationResolution } from '../lib/partners/resolve-partner-location'

function assertDevEnvironment(): void {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
  const dbUrl = process.env.DATABASE_URL || ''
  const dbName = process.env.POSTGRES_DB || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (nodeEnv === 'production') {
    throw new Error('Recusado: NODE_ENV=production')
  }
  if (dbName.includes('prod') || dbUrl.includes('omnia_prod') || dbUrl.includes('/omnia_production')) {
    throw new Error('Recusado: banco parece de produção')
  }
  if (appUrl.includes('omniafrigo.com.br') && !appUrl.includes('dev.')) {
    throw new Error('Recusado: URL não é DEV')
  }
  if (dbName && dbName !== 'omnia_staging' && !dbName.includes('staging') && !dbName.includes('dev')) {
    console.warn(`[warn] POSTGRES_DB=${dbName} — confirme que é DEV antes de --apply`)
  }
}

function needsBackfill(doc: {
  latitude?: number | null
  longitude?: number | null
  geocodingStatus?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}): boolean {
  const lat = doc.latitude
  const lng = doc.longitude
  if (!isUsableCoordinatePair(lat, lng)) {
    return Boolean(doc.zipCode || (doc.city && doc.state))
  }
  if (doc.geocodingStatus === 'failed' || doc.geocodingStatus === 'pending') {
    return Boolean(doc.zipCode || (doc.city && doc.state))
  }
  return false
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  const dryRun = !apply || process.argv.includes('--dry-run')

  assertDevEnvironment()

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'partners',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const candidates = result.docs.filter((d) => needsBackfill(d as never))
  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        totalPartners: result.docs.length,
        candidates: candidates.length,
        ids: candidates.map((d) => d.id),
      },
      null,
      2,
    ),
  )

  if (dryRun) {
    process.exit(0)
  }

  let ok = 0
  let fail = 0
  for (const doc of candidates) {
    const resolved = await applyPartnerLocationResolution(
      {
        zipCode: doc.zipCode as string | null,
        address: doc.address as string | null,
        addressNumber: doc.addressNumber as string | null,
        neighborhood: doc.neighborhood as string | null,
        city: doc.city as string | null,
        state: doc.state as string | null,
        country: (doc.country as string | null) || 'Brasil',
        geocodingStatus: doc.geocodingStatus as 'pending' | 'failed' | 'success' | 'manual' | null,
      },
      null,
      { force: true },
    )

    await payload.update({
      collection: 'partners',
      id: doc.id,
      data: {
        zipCode: resolved.zipCode,
        address: resolved.address,
        neighborhood: resolved.neighborhood,
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        geocodingStatus: resolved.geocodingStatus,
        geocodingProvider: resolved.geocodingProvider,
        geocodedAt: resolved.geocodedAt,
      },
      overrideAccess: true,
      context: { skipPartnerGeocode: true },
    })

    if (resolved.geocodingStatus === 'success') {
      ok += 1
      console.log(`ok id=${doc.id}`)
    } else {
      fail += 1
      console.log(`fail id=${doc.id} status=${resolved.geocodingStatus}`)
    }

    await new Promise((r) => setTimeout(r, 1200))
  }

  console.log(JSON.stringify({ ok, fail }, null, 2))
  process.exit(fail > 0 && ok === 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

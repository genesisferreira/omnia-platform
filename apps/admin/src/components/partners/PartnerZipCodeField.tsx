'use client'

import { useCallback, useState } from 'react'
import { Button, FieldLabel, useField, useForm } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

/**
 * Campo CEP no Admin com botão "Buscar CEP".
 * Preenche endereço/bairro/cidade/UF; geocodificação completa ocorre no beforeChange ao salvar.
 */
export const PartnerZipCodeField: TextFieldClientComponent = (props) => {
  const { path, field, readOnly } = props
  const { value, setValue } = useField<string>({ path })
  const { dispatchFields } = useForm()
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const lookup = useCallback(async () => {
    const digits = String(value || '').replace(/\D/g, '')
    if (digits.length !== 8) {
      setStatus('error')
      setMessage('Informe um CEP com 8 dígitos.')
      return
    }
    setStatus('loading')
    setMessage('Consultando CEP…')
    try {
      const res = await fetch(`/api/omnia/postal-code?cep=${encodeURIComponent(digits)}`, {
        credentials: 'include',
      })
      const data = (await res.json()) as {
        ok?: boolean
        address?: {
          zipCode?: string
          address?: string | null
          neighborhood?: string | null
          city?: string
          state?: string
          country?: string
        }
        error?: { message?: string }
      }
      if (!res.ok || !data.ok || !data.address) {
        setStatus('error')
        setMessage(data.error?.message || 'CEP não encontrado.')
        return
      }
      const a = data.address
      setValue(a.zipCode || digits)
      const patches: Array<{ path: string; value: string }> = []
      if (a.address) patches.push({ path: 'address', value: a.address })
      if (a.neighborhood) patches.push({ path: 'neighborhood', value: a.neighborhood })
      if (a.city) patches.push({ path: 'city', value: a.city })
      if (a.state) patches.push({ path: 'state', value: a.state })
      if (a.country) patches.push({ path: 'country', value: a.country })
      patches.push({ path: 'geocodingStatus', value: 'pending' })
      for (const p of patches) {
        dispatchFields({ type: 'UPDATE', path: p.path, value: p.value })
      }
      setStatus('ok')
      setMessage('CEP encontrado. Salve o documento para geocodificar latitude/longitude.')
    } catch {
      setStatus('error')
      setMessage('Erro temporário ao consultar o CEP.')
    }
  }, [value, setValue, dispatchFields])

  return (
    <div className="field-type text">
      <FieldLabel label={field?.label || 'CEP'} path={path} required={field?.required} />
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <input
          className="field-type__wrap"
          style={{
            flex: 1,
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s, 4px)',
            background: 'var(--theme-input-bg)',
            color: 'var(--theme-elevation-800)',
          }}
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          readOnly={Boolean(readOnly)}
          inputMode="numeric"
          placeholder="30110-012"
          id={`field-${path}`}
          name={path}
        />
        <Button
          buttonStyle="secondary"
          size="medium"
          disabled={Boolean(readOnly) || status === 'loading'}
          onClick={() => void lookup()}
          type="button"
        >
          {status === 'loading' ? 'Buscando…' : 'Buscar CEP'}
        </Button>
      </div>
      {message ? (
        <div
          className="field-description"
          style={{
            marginTop: '0.35rem',
            color: status === 'error' ? 'var(--theme-error-500)' : undefined,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  )
}

export default PartnerZipCodeField

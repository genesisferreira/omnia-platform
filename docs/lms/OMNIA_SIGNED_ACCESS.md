# Omnia Signed Access

Abstrações (sem integração storage/CDN neste épico):

- Signed URL / Token
- Temporary Access + Expiration
- Renew
- Revocation

## Modo controlado

`SignedAccessService.issue` retorna:

```json
{
  "mode": "controlled-mock",
  "url": "controlled://media/{assetId}?t=…&sig=…",
  "expiresAt": "…",
  "revoked": false
}
```

Interfaces: `CryptoSignaturePort`, `ReplayProtectionPort`, `SignedAccessStorePort`.

**Não** gerar Signed URLs reais para produção neste épico.

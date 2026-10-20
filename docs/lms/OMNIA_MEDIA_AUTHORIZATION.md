# Omnia Media Authorization

> **Sprint 3.0 — Épico B**  
> Package `@omnia/media-authorization` + BFF interno + Protected Viewer.  
> **Modo controlado:** decisões reais no servidor; sem DRM, CDN ou Signed URL de produção.

## Objetivo

Decidir no servidor: quem pode visualizar / baixar / imprimir / compartilhar, por quanto tempo, em qual contexto e com qual política.

## Arquitetura

```text
Material Experience
  → MediaAuthorizationPort (Web)
    → POST /api/lms/internal/media/authorize (proxy S2S)
      → @omnia/media-authorization
        → MediaPolicyResolver
        → MediaDecision (imutável)
        → Audit + Metrics + Cache
  → ProtectedViewerPort
  → Viewer (entrega inalterada) | MaterialAccessBlocked
```

## Componentes

| Peça                        | Função                                  |
| --------------------------- | --------------------------------------- |
| `MediaAuthorizationService` | Orquestra authorize                     |
| `MediaPolicyResolver`       | canView/Download/Print/Share            |
| `SignedAccessService`       | Token mock `controlled://`              |
| `MediaDecision`             | Resultado imutável                      |
| Cache                       | TTL configurável (memory → Redis-ready) |

## Endpoints (Admin, S2S only)

| Method | Path                                      |
| ------ | ----------------------------------------- |
| POST   | `/api/omnia/lms/internal/media/authorize` |
| POST   | `/api/omnia/lms/internal/media/sign`      |
| POST   | `/api/omnia/lms/internal/media/revoke`    |

## Restrições

- Sem streaming protegido / CDN / DRM / watermark visual
- Sem Signed URL real para S3/Azure/MinIO
- Entrega de conteúdo permanece a atual após grant

## Referências

- [OMNIA_MEDIA_POLICIES.md](OMNIA_MEDIA_POLICIES.md)
- [OMNIA_SIGNED_ACCESS.md](OMNIA_SIGNED_ACCESS.md)
- [OMNIA_PROTECTED_VIEWER.md](OMNIA_PROTECTED_VIEWER.md)
- [OMNIA_MEDIA_SECURITY.md](OMNIA_MEDIA_SECURITY.md)
- Decision Log **D019**

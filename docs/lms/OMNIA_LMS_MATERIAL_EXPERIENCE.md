# Omnia LMS — Material Experience

> **Sprint 2.7 — Épico C**  
> Camada oficial de consumo de materiais na Experience.  
> Integra `@omnia/learning-engine`. Sem Moodle UI / sem streaming CDN.

## Arquitetura

```text
Aluno → Lesson Experience
          ↓
     Material Experience (Provider + Viewer + Renderers)
          ↓
     Learning Engine (material.* / continue / progress)
          ↓
     Connector (RO) → Moodle
```

## Componentes

| Peça | Responsabilidade |
| --- | --- |
| `MaterialProvider` | Resolve tipo, renderer, permissões, metadata, preview, fallback + security ports |
| `MaterialViewer` | Shell de render + metadata + estados + lifecycle engine |
| `MaterialExperience` | Host: lista de materiais da aula + nav |
| `MaterialNav` | Prev/next material · voltar aula/módulo/curso |
| Renderers | Text, Html, Image, Pdf, Video, ExternalLink, File, H5p, Unknown |

## Eventos

`material.opened` · `material.viewed` · `material.completed` · `material.closed` · `continue.updated` · `progress.updated` (via SyncLearningState)

## Security ready (não implementado)

Portas stub: `MediaAuthorizationPort`, `SignedUrlPort`, `WatermarkPort`, `ProtectedViewerPort` → `NOT_IMPLEMENTED`.

## Testes

```bash
pnpm --filter @omnia/web test:lms-material
pnpm --filter @omnia/learning-engine test
```

## Docs relacionadas

- [OMNIA_LMS_MATERIAL_VIEWER.md](OMNIA_LMS_MATERIAL_VIEWER.md)
- [OMNIA_LMS_RENDERERS.md](OMNIA_LMS_RENDERERS.md)
- [OMNIA_LMS_CONTENT_ARCHITECTURE.md](OMNIA_LMS_CONTENT_ARCHITECTURE.md)

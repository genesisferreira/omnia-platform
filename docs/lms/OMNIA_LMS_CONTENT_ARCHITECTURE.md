# Omnia LMS — Content Architecture

> Arquitetura de conteúdo Experience → Learning Engine → Connector (Épico C).

```text
Connector DTOs (LmsActivity / section.summary)
        ↓
buildMaterialsFromLesson()  → MaterialDescriptor[]
        ↓
MaterialProvider.resolve()  → ResolvedMaterial
        ↓
MaterialViewer + Lazy Renderer
        ↓
Learning Engine events
```

## Princípios

1. **Nunca** Moodle direto na UI.
2. URLs Moodle / `wstoken` nunca renderizadas (`sanitize` + allowlist externa).
3. Download desabilitado por padrão (`canDownload: false`).
4. Mídia protegida = portas futuras (`MediaAuthorization`, `SignedUrl`, `Watermark`, `ProtectedViewer`).
5. Lesson Experience compõe Material Experience; não duplica renderers.

## Preparado para

Streaming protegido · Media Authorization · Neurofrigo · Analytics · Certificados · Marketplace  
(**não implementados** neste épico)

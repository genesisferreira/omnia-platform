# Omnia LMS — Material Viewer

> Componente oficial `MaterialViewer` (Épico C).

## Contrato

```ts
<MaterialViewer descriptor={MaterialDescriptor} trackLifecycle />
```

## Responsabilidades

1. Resolver estado via `MaterialProvider.resolve`
2. Exibir `MaterialMetadata` (nome, tipo, descrição, tamanho, tempo, último acesso, status)
3. Carregar renderer lazy (`getLazyRenderer`)
4. Emitir lifecycle Learning Engine (`open` → `view` → `close` / `complete`)
5. Exibir banners de estado (offline, forbidden, empty, …)

## Estados

`loading` · `skeleton` · `error` · `offline` · `forbidden` · `blocked` · `unavailable` · `empty` · `ready`

## Extensão futura

`descriptor.source.assetId` + security ports alimentarão Protected Viewer / Signed URLs sem mudar o contrato do Viewer.

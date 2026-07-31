# Omnia LMS — Material Renderers

> Renderizadores desacoplados (Épico C). Registry com `next/dynamic`.

| Renderer | Tipo | MVP |
| --- | --- | :---: |
| `TextRenderer` | `text` | ● |
| `HtmlRenderer` | `html` (HTML já sanitizado na borda) | ● |
| `ImageRenderer` | `image` | ● (URL autorizada / preview) |
| `PdfRenderer` | `pdf` | ○ placeholder |
| `VideoRenderer` | `video` | ○ placeholder |
| `ExternalLinkRenderer` | `external_link` | ● (bloqueia Moodle) |
| `FileRenderer` | `file` | ○ placeholder |
| `H5pRenderer` | `h5p` | ○ placeholder |
| `UnknownRenderer` | `unknown` | ● fallback |

Novos tipos: adicionar em `MaterialType` + loader em `registry.ts` + componente isolado.

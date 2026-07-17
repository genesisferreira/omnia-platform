import type { JsonLdRecord } from '@/lib/seo';

type JsonLdProps = {
  data: JsonLdRecord | JsonLdRecord[];
};

/**
 * Serializa JSON-LD seguro para HTML (escapa `<` para evitar quebra de script).
 */
export function JsonLd({ data }: JsonLdProps) {
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // Conteúdo gerado apenas no servidor a partir de contratos tipados.
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}

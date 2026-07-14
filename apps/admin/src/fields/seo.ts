import type { Field, TextFieldSingleValidation } from 'payload';

const SCHEMA_TYPE_OPTIONS = [
  { label: 'WebPage', value: 'WebPage' },
  { label: 'Article', value: 'Article' },
  { label: 'BlogPosting', value: 'BlogPosting' },
  { label: 'Organization', value: 'Organization' },
  { label: 'LocalBusiness', value: 'LocalBusiness' },
  { label: 'Course', value: 'Course' },
  { label: 'Event', value: 'Event' },
  { label: 'FAQPage', value: 'FAQPage' },
  { label: 'Product', value: 'Product' },
] as const;

const validateCanonicalUrl: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Informe uma URL absoluta com http:// ou https://.';
    }

    return true;
  } catch {
    return 'Informe uma URL válida.';
  }
};

export const createSeoFields = (): Field[] => [
  {
    name: 'metaTitle',
    type: 'text',
    label: 'Meta title',
    maxLength: 60,
    admin: {
      description: 'Recomendado até 60 caracteres. Fallback: título do documento.',
    },
  },
  {
    name: 'metaDescription',
    type: 'textarea',
    label: 'Meta description',
    maxLength: 160,
    admin: {
      description: 'Recomendado até 160 caracteres.',
    },
  },
  {
    name: 'canonicalUrl',
    type: 'text',
    label: 'URL canônica',
    validate: validateCanonicalUrl,
    admin: {
      description: 'URL canônica absoluta desta página.',
    },
  },
  {
    name: 'openGraphImage',
    type: 'upload',
    relationTo: 'media',
    label: 'Imagem Open Graph',
    admin: {
      description: 'Imagem Open Graph recomendada: 1200×630 px.',
    },
  },
  {
    name: 'openGraphTitle',
    type: 'text',
    label: 'Open Graph title',
    admin: {
      description: 'Título exibido em compartilhamentos sociais.',
    },
  },
  {
    name: 'openGraphDescription',
    type: 'textarea',
    label: 'Open Graph description',
    admin: {
      description: 'Descrição exibida em compartilhamentos sociais.',
    },
  },
  {
    name: 'noIndex',
    type: 'checkbox',
    label: 'No index',
    defaultValue: false,
    admin: {
      description: 'Impede indexação por mecanismos de busca.',
    },
  },
  {
    name: 'noFollow',
    type: 'checkbox',
    label: 'No follow',
    defaultValue: false,
    admin: {
      description: 'Impede que mecanismos de busca sigam links da página.',
    },
  },
  {
    name: 'keywords',
    type: 'array',
    label: 'Palavras-chave',
    fields: [
      {
        name: 'keyword',
        type: 'text',
        required: true,
        label: 'Palavra-chave',
      },
    ],
    admin: {
      description: 'Lista estruturada de palavras-chave para SEO.',
    },
  },
  {
    name: 'schemaType',
    type: 'select',
    label: 'Tipo de schema',
    options: [...SCHEMA_TYPE_OPTIONS],
    admin: {
      description: 'Tipo schema.org principal desta entidade.',
    },
  },
  {
    name: 'jsonLd',
    type: 'json',
    label: 'JSON-LD',
    admin: {
      description: 'Override opcional de JSON-LD para esta entidade.',
    },
  },
];

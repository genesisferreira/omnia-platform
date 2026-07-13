import type { Access, CollectionConfig, TextFieldSingleValidation } from 'payload';

import { createEditorialFields, createOwnershipFields } from '../fields';
import { isValidOfficialUrl } from '../lib/branding/validators';
import {
  DEFAULT_SITE_LOCALE,
  DEFAULT_SITE_TIMEZONE,
  SITE_ENVIRONMENTS,
  SITE_LOCALES,
  SITE_STATUSES,
  SITE_TYPES,
} from '../types/site';

const authenticated: Access = ({ req: { user } }) => Boolean(user);

const SITE_STATUS_LABELS: Record<(typeof SITE_STATUSES)[number], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  inactive: 'Inativo',
  maintenance: 'Manutenção',
  archived: 'Arquivado',
};

const SITE_ENVIRONMENT_LABELS: Record<(typeof SITE_ENVIRONMENTS)[number], string> = {
  local: 'Local',
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
};

const SITE_TYPE_LABELS: Record<(typeof SITE_TYPES)[number], string> = {
  holding_portal: 'Portal Holding',
  company_profile: 'Perfil de empresa',
  institutional: 'Institucional',
  education: 'Educação',
  campaign: 'Campanha',
  application: 'Aplicação',
  marketplace: 'Marketplace',
};

const SITE_LOCALE_LABELS: Record<(typeof SITE_LOCALES)[number], string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const validateSlug: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (!SLUG_PATTERN.test(value)) {
    return 'Use apenas letras minúsculas, números e hífen. Não inicie nem termine com hífen.';
  }

  return true;
};

const validateExternalUrl: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (!isValidOfficialUrl(value)) {
    return 'Informe uma URL válida com http:// ou https://.';
  }

  try {
    const protocol = new URL(value).protocol.toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') {
      return 'A URL externa deve usar apenas http:// ou https://.';
    }
  } catch {
    return 'Informe uma URL válida com http:// ou https://.';
  }

  return true;
};

export const Sites: CollectionConfig = {
  slug: 'sites',
  labels: {
    singular: 'Site',
    plural: 'Sites',
  },
  admin: {
    useAsTitle: 'name',
    description: 'Gerencia as presenças digitais do ecossistema Omnia.',
    defaultColumns: [
      'name',
      'slug',
      'siteStatus',
      'environment',
      'company',
      'updatedAt',
    ],
    group: 'Multiempresa',
  },
  timestamps: true,
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 25,
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      label: 'Nome público',
    },
    {
      name: 'internalName',
      type: 'text',
      required: true,
      index: true,
      label: 'Nome interno',
      admin: {
        description: 'Usado apenas para organização administrativa.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug',
      validate: validateSlug,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'institutional',
      options: SITE_TYPES.map((value) => ({
        label: SITE_TYPE_LABELS[value],
        value,
      })),
      label: 'Tipo',
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'URL externa',
      validate: validateExternalUrl,
      admin: {
        condition: (_data, siblingData) => siblingData?.isExternal === true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações internas',
      admin: {
        description: 'Informações administrativas que não serão exibidas publicamente.',
      },
    },
    ...createOwnershipFields(),
    ...createEditorialFields(),
    {
      name: 'siteStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: SITE_STATUSES.map((value) => ({
        label: SITE_STATUS_LABELS[value],
        value,
      })),
      label: 'Status',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'environment',
      type: 'select',
      required: true,
      defaultValue: 'development',
      index: true,
      options: SITE_ENVIRONMENTS.map((value) => ({
        label: SITE_ENVIRONMENT_LABELS[value],
        value,
      })),
      label: 'Ambiente',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_SITE_LOCALE,
      options: SITE_LOCALES.map((value) => ({
        label: SITE_LOCALE_LABELS[value],
        value,
      })),
      label: 'Locale',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'timezone',
      type: 'text',
      required: true,
      defaultValue: DEFAULT_SITE_TIMEZONE,
      label: 'Timezone',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isExternal',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Site externo',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isPrimaryForCompany',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Site principal da empresa',
      admin: {
        position: 'sidebar',
      },
    },
  ],
};

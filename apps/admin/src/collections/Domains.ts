import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
  CollectionSlug,
  TextFieldSingleValidation,
} from 'payload';
import { APIError } from 'payload';

import { isValidHostname, normalizeHostname } from '../lib/branding/domain';
import { SITE_ENVIRONMENTS } from '../types/site';

const authenticated: Access = ({ req: { user } }) => Boolean(user);

const SITE_ENVIRONMENT_LABELS: Record<(typeof SITE_ENVIRONMENTS)[number], string> = {
  local: 'Local',
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
};

const validateHostname: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || value.includes(' ')) {
    return 'Informe um hostname válido (sem protocolo, caminho, porta ou espaços).';
  }

  // Aceita entrada “suja”; beforeValidate persiste o valor já normalizado.
  const normalized = normalizeHostname(value);

  if (!normalized || !isValidHostname(normalized)) {
    return 'Informe um hostname válido (sem protocolo, caminho, porta ou espaços).';
  }

  return true;
};

const validateNormalizedHostname: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || !isValidHostname(value) || normalizeHostname(value) !== value) {
    return 'Hostname normalizado inválido.';
  }

  return true;
};

const normalizeDomainHostnames: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) {
    return data;
  }

  const rawHostname = data.hostname;

  if (typeof rawHostname !== 'string' || rawHostname.trim() === '') {
    return data;
  }

  const normalized = normalizeHostname(rawHostname);

  if (!normalized || !isValidHostname(normalized)) {
    throw new APIError(
      'Hostname inválido. Informe um domínio ou subdomínio válido, sem protocolo ou caminho.',
      400,
    );
  }

  data.hostname = normalized;
  data.normalizedHostname = normalized;

  return data;
};

export const Domains: CollectionConfig = {
  slug: 'domains',
  labels: {
    singular: 'Domain',
    plural: 'Domains',
  },
  admin: {
    useAsTitle: 'hostname',
    description: 'Gerencia os domínios resolvidos pela Omnia Platform.',
    defaultColumns: ['hostname', 'site', 'environment', 'isPrimary', 'isActive', 'updatedAt'],
    group: 'Multiempresa',
  },
  timestamps: true,
  hooks: {
    beforeValidate: [normalizeDomainHostnames],
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'hostname',
      type: 'text',
      required: true,
      maxLength: 255,
      label: 'Hostname',
      validate: validateHostname,
      admin: {
        description:
          'Hostname do domínio. Protocolo, www, porta ou caminho são normalizados automaticamente antes de salvar.',
      },
    },
    {
      name: 'normalizedHostname',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Hostname normalizado',
      validate: validateNormalizedHostname,
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Hostname normalizado para resolução.',
      },
    },
    {
      name: 'site',
      type: 'relationship',
      // Collection `sites` registrada; tipagem gerada ainda pendente.
      relationTo: 'sites' as CollectionSlug,
      required: true,
      label: 'Site',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações',
      admin: {
        description: 'Notas administrativas internas.',
      },
    },
    {
      name: 'environment',
      type: 'select',
      required: true,
      defaultValue: 'production',
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
      name: 'isPrimary',
      type: 'checkbox',
      defaultValue: true,
      label: 'Domínio primário',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Ativo',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'redirectToPrimary',
      type: 'checkbox',
      defaultValue: false,
      label: 'Redirecionar para o primário',
      admin: {
        position: 'sidebar',
        description: 'Apenas para domínios secundários.',
      },
    },
    {
      name: 'forceHttps',
      type: 'checkbox',
      defaultValue: true,
      label: 'Forçar HTTPS',
      admin: {
        position: 'sidebar',
      },
    },
  ],
};

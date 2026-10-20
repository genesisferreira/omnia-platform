import type { DateFieldValidation, Field } from 'payload';

type PublishingSiblingData = {
  publishAt?: Date | string | null;
};

const PUBLISHING_TIMEZONE_OPTIONS = [
  { label: 'America/Sao_Paulo (Brasília)', value: 'America/Sao_Paulo' },
  { label: 'America/Manaus', value: 'America/Manaus' },
  { label: 'America/Belem', value: 'America/Belem' },
  { label: 'America/Fortaleza', value: 'America/Fortaleza' },
  { label: 'America/Recife', value: 'America/Recife' },
  { label: 'America/Cuiaba', value: 'America/Cuiaba' },
  { label: 'America/Porto_Velho', value: 'America/Porto_Velho' },
  { label: 'America/Rio_Branco', value: 'America/Rio_Branco' },
  { label: 'UTC', value: 'UTC' },
] as const;

const parseFieldDate = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  return null;
};

const createNotBeforePublishAtValidator =
  (fieldLabel: string): DateFieldValidation =>
  (value, { siblingData }) => {
    if (!value) {
      return true;
    }

    const publishAtTime = parseFieldDate((siblingData as PublishingSiblingData).publishAt);
    const fieldTime = parseFieldDate(value);

    if (publishAtTime === null || fieldTime === null) {
      return true;
    }

    if (fieldTime < publishAtTime) {
      return `${fieldLabel} não pode ser anterior a publishAt.`;
    }

    return true;
  };

const dateFieldAdmin = {
  date: {
    pickerAppearance: 'dayAndTime' as const,
  },
  position: 'sidebar' as const,
};

export const createPublishingFields = (): Field[] => [
  {
    name: 'publishAt',
    type: 'date',
    label: 'Agendar publicação em',
    timezone: true,
    admin: {
      ...dateFieldAdmin,
      description: 'Data/hora planejada para publicação.',
    },
  },
  {
    name: 'unpublishAt',
    type: 'date',
    label: 'Agendar despublicação em',
    timezone: true,
    validate: createNotBeforePublishAtValidator('unpublishAt'),
    admin: {
      ...dateFieldAdmin,
      description: 'Data/hora planejada para despublicação.',
    },
  },
  {
    name: 'expiresAt',
    type: 'date',
    label: 'Expira em',
    timezone: true,
    validate: createNotBeforePublishAtValidator('expiresAt'),
    admin: {
      ...dateFieldAdmin,
      description: 'Data/hora de expiração do conteúdo.',
    },
  },
  {
    name: 'timezone',
    type: 'select',
    label: 'Fuso horário',
    required: true,
    defaultValue: 'America/Sao_Paulo',
    options: [...PUBLISHING_TIMEZONE_OPTIONS],
    admin: {
      description: 'Timezone explícito para publicação e agendamento.',
      position: 'sidebar',
    },
  },
  {
    name: 'publishedAt',
    type: 'date',
    label: 'Publicado em',
    timezone: true,
    admin: {
      ...dateFieldAdmin,
      description: 'Timestamp efetivo da publicação.',
      readOnly: true,
    },
  },
  {
    name: 'archivedAt',
    type: 'date',
    label: 'Arquivado em',
    timezone: true,
    admin: {
      ...dateFieldAdmin,
      description: 'Timestamp de arquivamento.',
      readOnly: true,
    },
  },
  {
    name: 'publicationNotes',
    type: 'textarea',
    label: 'Notas de publicação',
    admin: {
      description: 'Observações internas sobre publicação e agendamento.',
      position: 'sidebar',
    },
  },
];

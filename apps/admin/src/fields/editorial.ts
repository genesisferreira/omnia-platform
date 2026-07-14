import type { Field } from 'payload';

const EDITORIAL_STATUS_OPTIONS = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Em revisão', value: 'in_review' },
  { label: 'Aguardando aprovação', value: 'awaiting_approval' },
  { label: 'Aprovado', value: 'approved' },
  { label: 'Agendado', value: 'scheduled' },
  { label: 'Publicado', value: 'published' },
  { label: 'Atualizado', value: 'updated' },
  { label: 'Arquivado', value: 'archived' },
  { label: 'Descontinuado', value: 'discontinued' },
  { label: 'Excluído', value: 'deleted' },
] as const;

export const createEditorialFields = (): Field[] => [
  {
    name: 'editorialStatus',
    type: 'select',
    label: 'Status editorial',
    required: true,
    defaultValue: 'draft',
    options: [...EDITORIAL_STATUS_OPTIONS],
    admin: {
      description:
        'Estado do workflow editorial. Separado de _status (draft/published) do Payload.',
      position: 'sidebar',
    },
  },
  {
    name: 'editorialNotes',
    type: 'textarea',
    label: 'Notas editoriais',
    admin: {
      description: 'Observações internas do fluxo editorial.',
      position: 'sidebar',
    },
  },
  {
    name: 'reviewedBy',
    type: 'relationship',
    relationTo: 'users',
    label: 'Revisado por',
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'reviewedAt',
    type: 'date',
    label: 'Revisado em',
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
      position: 'sidebar',
    },
  },
  {
    name: 'approvedBy',
    type: 'relationship',
    relationTo: 'users',
    label: 'Aprovado por',
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'approvedAt',
    type: 'date',
    label: 'Aprovado em',
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
      position: 'sidebar',
    },
  },
  {
    name: 'previewConfirmedBy',
    type: 'relationship',
    relationTo: 'users',
    label: 'Preview confirmado por',
    admin: {
      position: 'sidebar',
    },
  },
  {
    name: 'previewConfirmedAt',
    type: 'date',
    label: 'Preview confirmado em',
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
      position: 'sidebar',
    },
  },
];

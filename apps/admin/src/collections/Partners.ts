import type { CollectionConfig, FieldAccess } from 'payload';

import { adminsOnly, isPlatformAdmin, staffOnly } from '../access/rbac';
import { partnerAfterChange, partnerBeforeChange } from './partners/hooks';

const adminFieldUpdate: FieldAccess = ({ req: { user } }) => isPlatformAdmin(user);

/**
 * Collection Partner — núcleo do Partner Network (estrutura admin / Fase 2).
 * Sem geolocalização operacional, página pública, CRM, reviews ou IA nesta fase.
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: {
    singular: 'Parceiro',
    plural: 'Parceiros',
  },
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: [
      'companyName',
      'tradeName',
      'partnerType',
      'status',
      'city',
      'state',
      'featured',
      'active',
      'updatedAt',
    ],
    group: 'Partner Network',
    description: 'Cadastro e moderação de parceiros da rede Omnia.',
  },
  timestamps: true,
  access: {
    // Admin: CRUD completo; Moderador (editor): visualizar; Parceiro: sem acesso.
    read: staffOnly,
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  hooks: {
    beforeChange: [partnerBeforeChange],
    afterChange: [partnerAfterChange],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identificação',
          fields: [
            {
              name: 'companyName',
              type: 'text',
              required: true,
              label: 'Nome da empresa',
            },
            {
              name: 'tradeName',
              type: 'text',
              label: 'Nome fantasia',
            },
            {
              name: 'partnerType',
              type: 'select',
              required: true,
              defaultValue: 'company',
              label: 'Tipo de parceiro',
              options: [
                { label: 'Empresa', value: 'company' },
                { label: 'Profissional', value: 'professional' },
              ],
            },
            {
              name: 'document',
              type: 'text',
              label: 'CNPJ/CPF',
              admin: {
                description: 'Documento fiscal (CNPJ ou CPF).',
              },
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'partner-categories',
              hasMany: true,
              label: 'Categorias',
              admin: {
                description: 'Um parceiro pode pertencer a várias categorias.',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Descrição',
            },
          ],
        },
        {
          label: 'Contato',
          fields: [
            {
              name: 'email',
              type: 'email',
              label: 'E-mail',
            },
            {
              name: 'phone',
              type: 'text',
              label: 'Telefone',
            },
            {
              name: 'whatsapp',
              type: 'text',
              label: 'WhatsApp',
            },
            {
              name: 'website',
              type: 'text',
              label: 'Website',
            },
            {
              name: 'social',
              type: 'group',
              label: 'Redes sociais',
              fields: [
                {
                  name: 'instagram',
                  type: 'text',
                  label: 'Instagram',
                },
                {
                  name: 'linkedin',
                  type: 'text',
                  label: 'LinkedIn',
                },
                {
                  name: 'facebook',
                  type: 'text',
                  label: 'Facebook',
                },
                {
                  name: 'youtube',
                  type: 'text',
                  label: 'YouTube',
                },
              ],
            },
          ],
        },
        {
          label: 'Mídia',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Logo',
            },
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeria',
              labels: { singular: 'Imagem', plural: 'Imagens' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Imagem',
                },
                {
                  name: 'caption',
                  type: 'text',
                  label: 'Legenda',
                },
              ],
            },
          ],
        },
        {
          label: 'Localização',
          fields: [
            {
              name: 'address',
              type: 'text',
              label: 'Endereço',
            },
            {
              name: 'zipCode',
              type: 'text',
              label: 'CEP',
            },
            {
              name: 'city',
              type: 'text',
              label: 'Cidade',
            },
            {
              name: 'state',
              type: 'text',
              label: 'Estado',
              admin: {
                description: 'UF (ex.: SP, RJ).',
              },
            },
            {
              name: 'country',
              type: 'text',
              label: 'País',
              defaultValue: 'Brasil',
            },
            {
              name: 'latitude',
              type: 'number',
              label: 'Latitude',
              admin: {
                description:
                  'Campo preparado para geolocalização futura — sem geocode automático nesta fase.',
                step: 0.000001,
              },
            },
            {
              name: 'longitude',
              type: 'number',
              label: 'Longitude',
              admin: {
                description:
                  'Campo preparado para geolocalização futura — sem geocode automático nesta fase.',
                step: 0.000001,
              },
            },
            {
              name: 'serviceRadius',
              type: 'number',
              label: 'Raio de atendimento (km)',
              admin: {
                description: 'Raio em quilômetros para matching futuro por proximidade.',
                step: 1,
              },
            },
          ],
        },
        {
          label: 'Moderação',
          fields: [
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'pending',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Suspended', value: 'suspended' },
              ],
              access: {
                // Somente admin altera status (Approved / Rejected / Suspended).
                update: adminFieldUpdate,
              },
              admin: {
                description:
                  'Novos parceiros iniciam como Pending. Approved / Rejected / Suspended: somente Administrador.',
              },
            },
            {
              name: 'featured',
              type: 'checkbox',
              label: 'Destaque',
              defaultValue: false,
              access: {
                update: adminFieldUpdate,
              },
            },
            {
              name: 'active',
              type: 'checkbox',
              label: 'Ativo',
              defaultValue: true,
            },
            {
              name: 'approvedAt',
              type: 'date',
              label: 'Data de aprovação',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                readOnly: true,
              },
              access: {
                update: adminFieldUpdate,
              },
            },
            {
              name: 'approvedBy',
              type: 'relationship',
              relationTo: 'users',
              label: 'Usuário responsável pela aprovação',
              admin: {
                readOnly: true,
              },
              access: {
                update: adminFieldUpdate,
              },
            },
          ],
        },
      ],
    },
  ],
};

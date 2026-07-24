import type { CollectionConfig, FieldAccess } from 'payload';

import { adminsOnly, isPlatformAdmin, staffOnly } from '../access/rbac';
import {
  partnerAfterChange,
  partnerBeforeChange,
  partnerBeforeValidate,
} from './partners/hooks';

/** Campos de governança: somente admin altera (moderador = leitura via access da collection). */
const adminFieldUpdate: FieldAccess = ({ req: { user } }) => isPlatformAdmin(user);

/**
 * Collection Partner — núcleo do Partner Network (Checkpoint 01 / modelagem consolidada).
 * Sem geolocalização operacional, página pública, CRM, reviews ou IA nesta fase.
 *
 * Campos internos (approvalNotes, approvedAt, approvedBy, etc.) NÃO devem ser
 * expostos por padrão em API pública futura sem decisão explícita de produto.
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
      'slug',
      'partnerType',
      'status',
      'plan',
      'city',
      'state',
      'featured',
      'verified',
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
    beforeValidate: [partnerBeforeValidate],
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
              admin: {
                description: 'Preferencial para geração do slug da URL pública.',
              },
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              label: 'Slug',
              admin: {
                description:
                  'URL pública futura (/parceiros/{slug}). Gerado a partir do nome fantasia; editável e único.',
              },
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
            {
              name: 'ownerUser',
              type: 'relationship',
              relationTo: 'users',
              label: 'Usuário responsável pelo cadastro',
              admin: {
                description:
                  'Owner do perfil (não confundir com o aprovador). Preenchido automaticamente na criação se omitido.',
              },
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
              name: 'coverageRadius',
              type: 'number',
              label: 'Raio de cobertura (km)',
              min: 0,
              admin: {
                description:
                  'Raio em quilômetros para matching futuro por proximidade. Opcional; não pode ser negativo.',
                step: 1,
              },
            },
            {
              name: 'serviceCities',
              type: 'array',
              label: 'Cidades atendidas',
              labels: { singular: 'Cidade', plural: 'Cidades' },
              admin: {
                description:
                  'Lista estruturada de cidades/UF de atendimento (além da sede). Preparado para filtros futuros.',
              },
              fields: [
                {
                  name: 'city',
                  type: 'text',
                  required: true,
                  label: 'Cidade',
                },
                {
                  name: 'state',
                  type: 'text',
                  label: 'UF',
                  admin: {
                    description: 'Sigla do estado (ex.: SP).',
                    width: '30%',
                  },
                },
              ],
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
                {
                  label: 'Draft',
                  value: 'draft',
                },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Suspended', value: 'suspended' },
              ],
              access: {
                update: adminFieldUpdate,
              },
              admin: {
                description:
                  'Novos parceiros iniciam como Pending. Draft = rascunho interno (arquitetura). Transições: somente Administrador. Arquivado (futuro) não modelado nesta fase.',
              },
            },
            {
              name: 'plan',
              type: 'select',
              required: true,
              defaultValue: 'free',
              label: 'Plano',
              options: [
                { label: 'Free', value: 'free' },
                { label: 'Professional', value: 'professional' },
                { label: 'Premium', value: 'premium' },
                { label: 'Enterprise', value: 'enterprise' },
              ],
              access: {
                update: adminFieldUpdate,
              },
              admin: {
                description:
                  'Programa comercial (sem cobrança/limites nesta fase). Somente admin altera.',
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
              admin: {
                description: 'Peso futuro na ordenação / destaque. Somente admin.',
              },
            },
            {
              name: 'verified',
              type: 'checkbox',
              label: 'Verificado',
              defaultValue: false,
              access: {
                update: adminFieldUpdate,
              },
              admin: {
                description:
                  'Documentação/homologação conferida. Independente do status de aprovação. Somente admin.',
              },
            },
            {
              name: 'active',
              type: 'checkbox',
              label: 'Ativo',
              defaultValue: true,
            },
            {
              name: 'approvalNotes',
              type: 'textarea',
              label: 'Notas de aprovação (interno)',
              access: {
                update: adminFieldUpdate,
              },
              admin: {
                description:
                  'Campo interno para aprovação/rejeição/suspensão. NÃO expor em API ou página pública sem decisão explícita.',
              },
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
                description: 'Preenchido automaticamente na transição para Approved.',
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
                description: 'Não confundir com ownerUser (responsável pelo cadastro).',
              },
              access: {
                update: adminFieldUpdate,
              },
            },
            {
              name: 'publishedAt',
              type: 'date',
              label: 'Publicado em',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description:
                  'Primeira publicação pública. Preenchido na primeira aprovação; não sobrescrito em reaprovações.',
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

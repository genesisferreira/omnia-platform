import type { CollectionConfig } from 'payload';

import {
  AGENT_KEYS,
  KNOWLEDGE_AREAS,
  KNOWLEDGE_STATUSES,
  PROCESSING_STATUSES,
  PUBLICATION_STATUSES,
  SECURITY_CLASSIFICATIONS,
  SOURCE_TYPES,
  TECHNICAL_RISK_LEVELS,
} from '@omnia/neurofrigo-knowledge';

import {
  knowledgeCreateAccess,
  knowledgeDeleteAccess,
  knowledgeDocumentUpdateAccess,
  knowledgePublishFieldAccess,
  knowledgeReadAccess,
} from '../../access/knowledge';
import {
  knowledgeDocumentAfterChange,
  knowledgeDocumentAfterDelete,
  knowledgeDocumentBeforeChange,
} from '../../services/knowledge/workflow-hooks';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Documento principal do Knowledge Hub (Neurofrigo AI).
 * Workflow editorial + ACL; sem embeddings nesta fundação.
 */
export const KnowledgeDocuments: CollectionConfig = {
  slug: 'knowledge-documents',
  labels: {
    singular: 'Documento de Conhecimento',
    plural: 'Base de Conhecimento',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'slug',
      'status',
      'publicationStatus',
      'securityClassification',
      'knowledgeArea',
      'updatedAt',
    ],
    group: 'Neurofrigo AI',
    description:
      'Cadastro, classificação, revisão e publicação de documentos. Embeddings/RAG ficam para macroentregas futuras.',
  },
  timestamps: true,
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 25,
  },
  access: {
    read: knowledgeReadAccess,
    create: knowledgeCreateAccess,
    update: knowledgeDocumentUpdateAccess,
    delete: knowledgeDeleteAccess,
  },
  hooks: {
    beforeChange: [knowledgeDocumentBeforeChange],
    afterChange: [knowledgeDocumentAfterChange],
    afterDelete: [knowledgeDocumentAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug',
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Resumo',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Conteúdo',
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      defaultValue: 'rich_text',
      index: true,
      label: 'Tipo de origem',
      options: optionsFrom(SOURCE_TYPES),
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      label: 'Arquivo',
      admin: {
        description: 'Upload PDF/DOCX/imagem. Extração automática não está habilitada nesta entrega.',
      },
    },
    {
      name: 'externalSourceUrl',
      type: 'text',
      label: 'URL externa',
    },
    {
      name: 'language',
      type: 'text',
      label: 'Idioma',
      defaultValue: 'pt-BR',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa dona',
      index: true,
    },
    {
      name: 'knowledgeArea',
      type: 'select',
      index: true,
      label: 'Área de conhecimento',
      options: optionsFrom(KNOWLEDGE_AREAS),
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'knowledge-categories',
      label: 'Categoria',
      index: true,
    },
    {
      name: 'subcategories',
      type: 'relationship',
      relationTo: 'knowledge-categories',
      hasMany: true,
      label: 'Subcategorias',
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
          label: 'Tag',
        },
      ],
    },
    {
      name: 'authorName',
      type: 'text',
      label: 'Autor (nome)',
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Revisado por',
      access: {
        update: knowledgePublishFieldAccess,
      },
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Aprovado por',
      access: {
        update: knowledgePublishFieldAccess,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: 'Status editorial',
      options: optionsFrom(KNOWLEDGE_STATUSES),
    },
    {
      name: 'processingStatus',
      type: 'select',
      required: true,
      defaultValue: 'idle',
      index: true,
      label: 'Status de processamento',
      options: optionsFrom(PROCESSING_STATUSES),
    },
    {
      name: 'publicationStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpublished',
      index: true,
      label: 'Status de publicação',
      options: optionsFrom(PUBLICATION_STATUSES),
      access: {
        update: knowledgePublishFieldAccess,
      },
    },
    {
      name: 'securityClassification',
      type: 'select',
      required: true,
      defaultValue: 'INTERNAL_RESTRICTED',
      index: true,
      label: 'Classificação de segurança',
      options: optionsFrom(SECURITY_CLASSIFICATIONS),
    },
    {
      name: 'allowedRoles',
      type: 'array',
      label: 'Papéis permitidos',
      fields: [
        {
          name: 'role',
          type: 'text',
          required: true,
          label: 'Papel',
        },
      ],
    },
    {
      name: 'allowedAgents',
      type: 'select',
      hasMany: true,
      label: 'Agentes permitidos',
      options: optionsFrom(AGENT_KEYS),
    },
    {
      name: 'allowedCompanies',
      type: 'relationship',
      relationTo: 'companies',
      hasMany: true,
      label: 'Empresas permitidas',
    },
    {
      name: 'allowedCourses',
      type: 'array',
      label: 'Cursos permitidos (IDs Moodle)',
      fields: [
        {
          name: 'courseId',
          type: 'number',
          required: true,
          label: 'Course ID',
        },
      ],
    },
    {
      name: 'allowAiUse',
      type: 'checkbox',
      label: 'Permitir uso pela IA',
      defaultValue: false,
    },
    {
      name: 'allowWebPublication',
      type: 'checkbox',
      label: 'Permitir publicação web',
      defaultValue: false,
    },
    {
      name: 'allowDownload',
      type: 'checkbox',
      label: 'Permitir download',
      defaultValue: false,
    },
    {
      name: 'requiresEnrollment',
      type: 'checkbox',
      label: 'Exige matrícula',
      defaultValue: false,
    },
    {
      name: 'technicalRiskLevel',
      type: 'select',
      required: true,
      defaultValue: 'high',
      label: 'Risco técnico',
      options: optionsFrom(TECHNICAL_RISK_LEVELS),
    },
    {
      name: 'humanReviewRequired',
      type: 'checkbox',
      label: 'Revisão humana obrigatória',
      defaultValue: true,
    },
    {
      name: 'versionNumber',
      type: 'text',
      label: 'Número da versão',
      defaultValue: '1.0.0',
    },
    {
      name: 'revisionNotes',
      type: 'textarea',
      label: 'Notas de revisão',
    },
    {
      name: 'supersedesDocument',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      label: 'Substitui documento',
      filterOptions: ({ id }) => {
        if (id === undefined || id === null) return true;
        return { id: { not_equals: id } };
      },
    },
    {
      name: 'checksum',
      type: 'text',
      label: 'Checksum',
      admin: {
        description: 'Integridade do conteúdo/arquivo (preenchimento manual ou futuro pipeline).',
      },
    },
    {
      name: 'sourceDate',
      type: 'date',
      label: 'Data da fonte',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'validFrom',
      type: 'date',
      label: 'Válido de',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'Válido até',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Publicado em',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
    {
      name: 'archivedAt',
      type: 'date',
      label: 'Arquivado em',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
    {
      name: 'lastIndexedAt',
      type: 'date',
      label: 'Última indexação',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Placeholder — indexação real desabilitada nesta entrega.',
        readOnly: true,
      },
    },
    {
      name: 'indexingError',
      type: 'textarea',
      label: 'Erro de indexação',
      admin: { readOnly: true },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Criado por',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Atualizado por',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
};

import type { GlobalConfig } from 'payload';

import {
  DEFAULT_COMMAND_ALLOWED_ROLES,
  SECURITY_CLASSIFICATIONS,
} from '@omnia/neurofrigo-knowledge';

import { knowledgeReadAccess, knowledgeSettingsAccess } from '../access/knowledge';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Configuração global do Knowledge Hub.
 * Defaults seguros; sem provider LLM / embeddings ativos.
 */
export const NeurofrigoKnowledgeSettings: GlobalConfig = {
  slug: 'neurofrigo-knowledge-settings',
  label: 'Configurações',
  admin: {
    group: 'Neurofrigo AI',
    description:
      'Políticas do Knowledge Hub. DeepSeek/vector store são placeholders — sem integração nesta fundação.',
  },
  access: {
    read: knowledgeReadAccess,
    update: knowledgeSettingsAccess,
  },
  fields: [
    {
      name: 'knowledgeHubEnabled',
      type: 'checkbox',
      label: 'Knowledge Hub habilitado',
      defaultValue: true,
    },
    {
      name: 'ingestionMode',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      label: 'Modo de ingestão',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Assistido', value: 'assisted' },
        { label: 'Automático (futuro)', value: 'automatic' },
      ],
    },
    {
      name: 'requireHumanApproval',
      type: 'checkbox',
      label: 'Exigir aprovação humana',
      defaultValue: true,
    },
    {
      name: 'defaultSecurityClassification',
      type: 'select',
      defaultValue: 'INTERNAL_RESTRICTED',
      label: 'Classificação padrão',
      options: optionsFrom(SECURITY_CLASSIFICATIONS),
    },
    {
      name: 'defaultLanguage',
      type: 'text',
      label: 'Idioma padrão',
      defaultValue: 'pt-BR',
    },
    {
      name: 'defaultValidityDays',
      type: 'number',
      label: 'Validade padrão (dias)',
      defaultValue: 365,
      min: 1,
    },
    {
      name: 'allowWebResearch',
      type: 'checkbox',
      label: 'Permitir pesquisa web',
      defaultValue: false,
    },
    {
      name: 'allowAutomaticPromotionFromWeb',
      type: 'checkbox',
      label: 'Promoção automática a partir da web',
      defaultValue: false,
    },
    {
      name: 'commandAllowedRoles',
      type: 'select',
      hasMany: true,
      label: 'Papéis do Neurofrigo Command',
      defaultValue: [...DEFAULT_COMMAND_ALLOWED_ROLES],
      options: [
        { label: 'super_admin', value: 'super_admin' },
        { label: 'admin', value: 'admin' },
        { label: 'neurofrigo_admin', value: 'neurofrigo_admin' },
      ],
      admin: {
        description: 'Default: somente super_admin.',
      },
    },
    {
      name: 'maxUploadSize',
      type: 'number',
      label: 'Tamanho máximo de upload (bytes)',
      defaultValue: 26214400,
      min: 1024,
    },
    {
      name: 'allowedFileTypes',
      type: 'array',
      label: 'MIME types permitidos',
      fields: [
        {
          name: 'mime',
          type: 'text',
          required: true,
          label: 'MIME',
        },
      ],
      defaultValue: [
        { mime: 'application/pdf' },
        {
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        { mime: 'text/plain' },
        { mime: 'text/markdown' },
        { mime: 'image/png' },
        { mime: 'image/jpeg' },
      ],
    },
    {
      name: 'futureEmbeddingProvider',
      type: 'text',
      label: 'Provider de embeddings (futuro)',
      defaultValue: 'deepseek',
      admin: {
        description: 'Placeholder textual — nenhum SDK/chamada real nesta entrega.',
      },
    },
    {
      name: 'futureVectorStore',
      type: 'text',
      label: 'Vector store (futuro)',
      defaultValue: 'placeholder',
      admin: {
        description: 'Placeholder — sem banco vetorial nesta entrega.',
      },
    },
    {
      name: 'processingMode',
      type: 'select',
      required: true,
      defaultValue: 'controlled',
      label: 'Modo de processamento',
      options: [
        { label: 'Controlado', value: 'controlled' },
        { label: 'Mock', value: 'mock' },
        { label: 'Desabilitado', value: 'disabled' },
      ],
    },
  ],
};

import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/** Políticas configuráveis (tenant/empresa/curso) com fallback global. */
export const AdaptivePolicies: CollectionConfig = {
  slug: 'adaptive-policies',
  labels: { singular: 'Adaptive Policy', plural: 'Adaptive Policies' },
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['key', 'version', 'scope', 'status'],
    group: 'Adaptive Learning',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'version', type: 'text', required: true, defaultValue: '1.0.0' },
    {
      name: 'scope',
      type: 'select',
      required: true,
      defaultValue: 'global',
      options: [
        { label: 'Global', value: 'global' },
        { label: 'Tenant', value: 'tenant' },
        { label: 'Company', value: 'company' },
        { label: 'Course', value: 'course' },
      ],
    },
    { name: 'tenantKey', type: 'text' },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
    },
    { name: 'minimumCompetencyScore', type: 'number', defaultValue: 0.45 },
    { name: 'reviewThreshold', type: 'number', defaultValue: 0.4 },
    { name: 'assessmentThreshold', type: 'number', defaultValue: 0.7 },
    { name: 'staleKnowledgeDays', type: 'number', defaultValue: 14 },
    { name: 'maxRecommendations', type: 'number', defaultValue: 5 },
    { name: 'minimumEvidenceCount', type: 'number', defaultValue: 2 },
    { name: 'reviewRiskThreshold', type: 'number', defaultValue: 0.6 },
    { name: 'skillGapThreshold', type: 'number', defaultValue: 0.45 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Disabled', value: 'disabled' },
      ],
    },
  ],
};

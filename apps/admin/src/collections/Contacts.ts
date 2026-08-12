import type { CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  labels: {
    singular: 'Contato',
    plural: 'Contatos',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'company', 'origin', 'updatedAt'],
    group: 'CRM',
  },
  timestamps: true,
  access: {
    read: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'jobTitle',
      type: 'text',
      label: 'Cargo',
    },
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
      name: 'company',
      type: 'relationship',
      relationTo: 'crm-companies',
      label: 'Empresa',
    },
    {
      name: 'origin',
      type: 'text',
      label: 'Origem',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações',
    },
  ],
};

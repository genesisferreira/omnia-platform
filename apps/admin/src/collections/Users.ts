import type { CollectionConfig } from 'payload';

/**
 * Coleção mínima de usuários admin — necessária para o Payload CMS.
 * Autenticação completa será implementada na Sprint 2.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
};

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';

import { Authors } from './src/collections/Authors';
import { Categories } from './src/collections/Categories';
import { Companies } from './src/collections/Companies';
import { Domains } from './src/collections/Domains';
import { Media } from './src/collections/Media';
import { Pages } from './src/collections/Pages';
import { Posts } from './src/collections/Posts';
import { Sites } from './src/collections/Sites';
import { Tags } from './src/collections/Tags';
import { Tenants } from './src/collections/Tenants';
import { Users } from './src/collections/Users';
import { publicCompaniesEndpoint } from './src/endpoints/public-companies';
import { publicPageEndpoint } from './src/endpoints/public-page';
import {
  publicPostCategoriesEndpoint,
  publicPostEndpoint,
  publicPostsEndpoint,
  publicPostTagsEndpoint,
} from './src/endpoints/public-posts';
import { resolveSiteEndpoint } from './src/endpoints/resolve-site';
import { GlobalSettings } from './src/globals/GlobalSettings';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
    },
    meta: {
      titleSuffix: '— Omnia Admin',
    },
  },
  collections: [
    Users,
    Tenants,
    Companies,
    Sites,
    Domains,
    Media,
    Pages,
    Authors,
    Categories,
    Tags,
    Posts,
  ],
  globals: [GlobalSettings],
  endpoints: [
    resolveSiteEndpoint,
    publicCompaniesEndpoint,
    publicPageEndpoint,
    publicPostsEndpoint,
    publicPostEndpoint,
    publicPostCategoriesEndpoint,
    publicPostTagsEndpoint,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'development-secret-change-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  cors: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
});

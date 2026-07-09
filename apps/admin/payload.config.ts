import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';

import { Companies } from './src/collections/Companies';
import { Media } from './src/collections/Media';
import { Tenants } from './src/collections/Tenants';
import { Users } from './src/collections/Users';
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
  collections: [Users, Tenants, Companies, Media],
  globals: [GlobalSettings],
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

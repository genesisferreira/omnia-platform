import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';

import { wrapJwtStrategyRejectBlocked } from './src/auth/account-status';
import { loadRootEnvFile, resolveSmtpConfig, smtpConfigForLog } from './src/email/smtp-config';
import { Activities } from './src/collections/Activities';
import { Authors } from './src/collections/Authors';
import { Categories } from './src/collections/Categories';
import { Companies } from './src/collections/Companies';
import { Contacts } from './src/collections/Contacts';
import { CrmCompanies } from './src/collections/CrmCompanies';
import { Domains } from './src/collections/Domains';
import { Leads } from './src/collections/Leads';
import { Media } from './src/collections/Media';
import { Organizations } from './src/collections/Organizations';
import { Pages } from './src/collections/Pages';
import { Posts } from './src/collections/Posts';
import { Sites } from './src/collections/Sites';
import { Tags } from './src/collections/Tags';
import { Tenants } from './src/collections/Tenants';
import { Users } from './src/collections/Users';
import { publicCompaniesEndpoint, publicCompanyEndpoint } from './src/endpoints/public-companies';
import { publicOrganizationsEndpoint } from './src/endpoints/public-organizations';
import { leadCaptureEndpoint } from './src/endpoints/lead-capture';
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

loadRootEnvFile();
const smtp = resolveSmtpConfig();

export default buildConfig({
  serverURL: smtp.serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
    },
    meta: {
      titleSuffix: '— Omnia Admin',
    },
  },
  email: nodemailerAdapter({
    defaultFromAddress: smtp.from.address,
    defaultFromName: smtp.from.name,
    transportOptions: {
      host: smtp.transport.host,
      port: smtp.transport.port,
      secure: smtp.transport.secure,
      ...(smtp.transport.auth
        ? {
            auth: {
              user: smtp.transport.auth.user,
              pass: smtp.transport.auth.pass,
            },
          }
        : {}),
    },
  }),
  collections: [
    Users,
    Tenants,
    Organizations,
    Companies,
    CrmCompanies,
    Contacts,
    Leads,
    Activities,
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
    publicCompanyEndpoint,
    publicOrganizationsEndpoint,
    leadCaptureEndpoint,
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
  cors: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001',
  ].filter(Boolean),
  onInit: (payload) => {
    wrapJwtStrategyRejectBlocked(payload);
    payload.logger.info({
      msg: 'SMTP configurado',
      smtp: smtpConfigForLog(smtp),
    });
  },
});

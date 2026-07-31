import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';

import { wrapJwtStrategyRejectBlocked } from './src/auth/account-status';
import { buildNodemailerEmailAdapter } from './src/email/build-email-adapter';
import {
  isSmtpConfigDeferred,
  loadRootEnvFile,
  smtpConfigForLog,
} from './src/email/smtp-config';
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
import { PartnerCategories } from './src/collections/PartnerCategories';
import { Partners } from './src/collections/Partners';
import { PartnerSpecialties } from './src/collections/PartnerSpecialties';
import { Posts } from './src/collections/Posts';
import { Sites } from './src/collections/Sites';
import { Tags } from './src/collections/Tags';
import { Tenants } from './src/collections/Tenants';
import { Users } from './src/collections/Users';
import { LmsIdentityLinks } from './src/collections/LmsIdentityLinks';
import { LmsAuditEvents } from './src/collections/LmsAuditEvents';
import { publicCompaniesEndpoint, publicCompanyEndpoint } from './src/endpoints/public-companies';
import { publicOrganizationsEndpoint } from './src/endpoints/public-organizations';
import { leadCaptureEndpoint } from './src/endpoints/lead-capture';
import { partnerRegisterEndpoint } from './src/endpoints/partner-register';
import { publicPageEndpoint } from './src/endpoints/public-page';
import {
  publicPartnerCategoriesEndpoint,
  publicPartnerEndpoint,
  publicPartnersEndpoint,
  publicPartnerSpecialtiesEndpoint,
} from './src/endpoints/public-partners';
import { publicPostalCodeEndpoint } from './src/endpoints/public-postal-code';
import {
  publicPostCategoriesEndpoint,
  publicPostEndpoint,
  publicPostsEndpoint,
  publicPostTagsEndpoint,
} from './src/endpoints/public-posts';
import { resolveSiteEndpoint } from './src/endpoints/resolve-site';
import { lmsEndpoints } from './src/endpoints/lms';
import { GlobalSettings } from './src/globals/GlobalSettings';
import { PartnerNetworkDashboard } from './src/globals/PartnerNetworkDashboard';
import { LmsSettings } from './src/globals/LmsSettings';
import { getAllowedCorsOrigins } from './src/lib/allowed-origins';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

loadRootEnvFile();

/**
 * generate:importmap / docker build: sem SMTP_HOST → adia adapter.
 * Runtime (compose com SMTP_*): resolve e exige config válida.
 */
const smtpDeferred = isSmtpConfigDeferred();
const runtimeEmail = smtpDeferred ? null : buildNodemailerEmailAdapter();

export default buildConfig({
  serverURL: (process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, '') || undefined,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
    },
    meta: {
      titleSuffix: '— Omnia Admin',
    },
  },
  ...(runtimeEmail ? { email: runtimeEmail.adapter } : {}),
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
    PartnerCategories,
    PartnerSpecialties,
    Partners,
    LmsIdentityLinks,
    LmsAuditEvents,
  ],
  globals: [GlobalSettings, PartnerNetworkDashboard, LmsSettings],
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
    publicPartnersEndpoint,
    publicPartnerEndpoint,
    publicPartnerCategoriesEndpoint,
    publicPartnerSpecialtiesEndpoint,
    publicPostalCodeEndpoint,
    partnerRegisterEndpoint,
    ...lmsEndpoints,
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
  cors: getAllowedCorsOrigins(),
  onInit: (payload) => {
    wrapJwtStrategyRejectBlocked(payload);
    // onInit só corre em runtime — reforça falha clara se SMTP estiver ausente.
    const smtp = runtimeEmail?.smtp ?? buildNodemailerEmailAdapter().smtp;
    payload.logger.info({
      msg: 'SMTP configurado',
      smtp: smtpConfigForLog(smtp),
    });
  },
});

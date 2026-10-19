/**
 * Marketplace B2B Fase A — seed idempotente de homologação DEV.
 * Namespace: HOMOLOG_MARKETPLACE_20261016
 *
 * NÃO rodar em produção. Requer OMNIA_ALLOW_MARKETPLACE_HOMOLOG=1.
 * Senhas somente via env (não logar plaintext).
 */
export {};

const NS = 'HOMOLOG_MARKETPLACE_20261016';

type PlatformRole = 'partner' | 'client' | 'admin';

type UserSpec = {
  key: string;
  email: string;
  role: PlatformRole;
  firstName: string;
  lastName: string;
  passwordEnv: string;
};

const USERS: UserSpec[] = [
  {
    key: 'partner_a_owner',
    email: 'homolog.mk.partner.a.owner@example.invalid',
    role: 'partner',
    firstName: 'Homolog',
    lastName: 'ParceiroA Owner',
    passwordEnv: 'HOMOLOG_MK_PARTNER_A_OWNER_PASSWORD',
  },
  {
    key: 'partner_a_editor',
    email: 'homolog.mk.partner.a.editor@example.invalid',
    role: 'partner',
    firstName: 'Homolog',
    lastName: 'ParceiroA Editor',
    passwordEnv: 'HOMOLOG_MK_PARTNER_A_EDITOR_PASSWORD',
  },
  {
    key: 'partner_b_owner',
    email: 'homolog.mk.partner.b.owner@example.invalid',
    role: 'partner',
    firstName: 'Homolog',
    lastName: 'ParceiroB Owner',
    passwordEnv: 'HOMOLOG_MK_PARTNER_B_OWNER_PASSWORD',
  },
  {
    key: 'partner_c_owner',
    email: 'homolog.mk.partner.c.owner@example.invalid',
    role: 'partner',
    firstName: 'Homolog',
    lastName: 'ParceiroC Pending',
    passwordEnv: 'HOMOLOG_MK_PARTNER_C_OWNER_PASSWORD',
  },
  {
    key: 'buyer_a',
    email: 'homolog.mk.buyer.a@example.invalid',
    role: 'client',
    firstName: 'Homolog',
    lastName: 'Comprador A',
    passwordEnv: 'HOMOLOG_MK_BUYER_A_PASSWORD',
  },
  {
    key: 'buyer_b',
    email: 'homolog.mk.buyer.b@example.invalid',
    role: 'client',
    firstName: 'Homolog',
    lastName: 'Comprador B',
    passwordEnv: 'HOMOLOG_MK_BUYER_B_PASSWORD',
  },
  {
    key: 'admin',
    email: 'homolog.mk.admin@example.invalid',
    role: 'admin',
    firstName: 'Homolog',
    lastName: 'Admin Marketplace',
    passwordEnv: 'HOMOLOG_MK_ADMIN_PASSWORD',
  },
];

function assertDevOnly(): void {
  const omniaEnv = String(process.env.OMNIA_ENV || process.env.APP_ENV || '').toLowerCase();
  const target = String(process.env.OMNIA_TARGET || '').toLowerCase();
  const flag = String(process.env.OMNIA_ALLOW_MARKETPLACE_HOMOLOG || '').toLowerCase();
  if (omniaEnv === 'production' || target === 'production') {
    throw new Error('ABORT: marketplace homolog seed refused on production');
  }
  if (flag !== '1' && flag !== 'true' && flag !== 'yes') {
    throw new Error('ABORT: set OMNIA_ALLOW_MARKETPLACE_HOMOLOG=1');
  }
  let host = '';
  let dbName = '';
  try {
    const url = new URL(String(process.env.DATABASE_URL || '').replace(/^["']|["']$/g, ''));
    host = url.hostname;
    dbName = url.pathname.replace(/^\//, '');
  } catch {
    throw new Error('ABORT: DATABASE_URL inválida');
  }
  if (dbName !== 'omnia_staging' || host !== 'omnia-postgres') {
    throw new Error('ABORT: DATABASE_URL must target omnia-postgres/omnia_staging');
  }
}

function requirePassword(envName: string): string {
  const value = process.env[envName]?.trim();
  if (!value) throw new Error(`Missing password env: ${envName}`);
  return value;
}

async function main() {
  assertDevOnly();

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { validatePasswordPolicy } = await import('@omnia/constants');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const actor = {
    id: 0,
    collection: 'users' as const,
    email: 'homolog.mk.seed.actor@example.invalid',
    role: 'super_admin' as const,
  };

  const userIds: Record<string, string | number> = {};

  for (const spec of USERS) {
    const password = requirePassword(spec.passwordEnv);
    const policy = validatePasswordPolicy(password);
    if (!policy.ok) throw new Error(`${spec.passwordEnv} fails policy: ${policy.error}`);

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: spec.email } },
      limit: 1,
      overrideAccess: true,
    });

    const data = {
      email: spec.email,
      password,
      role: spec.role,
      accountStatus: 'active' as const,
      firstName: spec.firstName,
      lastName: spec.lastName,
      name: `${spec.firstName} ${spec.lastName}`,
    };

    if (found.docs[0]) {
      await payload.update({
        collection: 'users',
        id: found.docs[0].id,
        data,
        user: actor,
        overrideAccess: true,
      });
      userIds[spec.key] = found.docs[0].id;
      console.log(`USER_OK key=${spec.key} id=${found.docs[0].id} created=false`);
    } else {
      const doc = await payload.create({
        collection: 'users',
        data,
        user: actor,
        overrideAccess: true,
      });
      userIds[spec.key] = doc.id;
      console.log(`USER_OK key=${spec.key} id=${doc.id} created=true`);
    }
  }

  type PartnerSpec = {
    key: string;
    slug: string;
    companyName: string;
    tradeName: string;
    status: 'approved' | 'pending';
    active: boolean;
    published: boolean;
    ownerKey: string;
    description: string;
  };

  const partners: PartnerSpec[] = [
    {
      key: 'partner_a',
      slug: 'homolog-mk-equipamentos-a',
      companyName: `${NS} Equipamentos Frio Ltda`,
      tradeName: 'Homolog Equipamentos A',
      status: 'approved',
      active: true,
      published: true,
      ownerKey: 'partner_a_owner',
      description: `${NS} — parceiro sintético de equipamentos e componentes (DEV).`,
    },
    {
      key: 'partner_b',
      slug: 'homolog-mk-servicos-b',
      companyName: `${NS} Instalação e Manutenção Ltda`,
      tradeName: 'Homolog Serviços B',
      status: 'approved',
      active: true,
      published: true,
      ownerKey: 'partner_b_owner',
      description: `${NS} — parceiro sintético de instalação e manutenção (DEV).`,
    },
    {
      key: 'partner_c',
      slug: 'homolog-mk-pendente-c',
      companyName: `${NS} Pendente Refrigeração ME`,
      tradeName: 'Homolog Pendente C',
      status: 'pending',
      active: false,
      published: false,
      ownerKey: 'partner_c_owner',
      description: `${NS} — parceiro sintético pendente sem publicação (DEV).`,
    },
  ];

  const partnerIds: Record<string, string | number> = {};
  const now = new Date().toISOString();

  for (const spec of partners) {
    const found = await payload.find({
      collection: 'partners',
      where: { slug: { equals: spec.slug } },
      limit: 1,
      overrideAccess: true,
    });

    const data: Record<string, unknown> = {
      companyName: spec.companyName,
      tradeName: spec.tradeName,
      slug: spec.slug,
      partnerType: 'company',
      description: spec.description,
      status: spec.status,
      active: spec.active,
      plan: 'free',
      verified: false,
      featured: false,
      ownerUser: userIds[spec.ownerKey],
      approvalNotes: `${NS} seed`,
    };
    if (spec.status === 'approved') {
      data.approvedAt = now;
      data.approvedBy = userIds.admin;
    }
    if (spec.published) {
      data.publishedAt = now;
    }

    // create sempre força pending (hook partnerBeforeChange); aprovação só via update admin.
    let partnerId: string | number;
    if (found.docs[0]) {
      partnerId = found.docs[0].id;
      console.log(`PARTNER_BASE key=${spec.key} id=${partnerId} created=false`);
    } else {
      const created = await payload.create({
        collection: 'partners',
        data: {
          companyName: spec.companyName,
          tradeName: spec.tradeName,
          slug: spec.slug,
          partnerType: 'company',
          description: spec.description,
          ownerUser: userIds[spec.ownerKey],
        },
        user: actor,
        overrideAccess: true,
      });
      partnerId = created.id;
      console.log(`PARTNER_BASE key=${spec.key} id=${partnerId} created=true`);
    }

    await payload.update({
      collection: 'partners',
      id: partnerId,
      data,
      user: actor,
      overrideAccess: true,
    });
    partnerIds[spec.key] = partnerId;
    console.log(
      `PARTNER_OK key=${spec.key} id=${partnerId} status=${spec.status} active=${spec.active}`,
    );
  }

  type MembershipSpec = {
    userKey: string;
    partnerKey: string;
    role: 'owner' | 'editor';
  };

  const memberships: MembershipSpec[] = [
    { userKey: 'partner_a_owner', partnerKey: 'partner_a', role: 'owner' },
    { userKey: 'partner_a_editor', partnerKey: 'partner_a', role: 'editor' },
    { userKey: 'partner_b_owner', partnerKey: 'partner_b', role: 'owner' },
    { userKey: 'partner_c_owner', partnerKey: 'partner_c', role: 'owner' },
  ];

  for (const spec of memberships) {
    const userId = userIds[spec.userKey];
    const partnerId = partnerIds[spec.partnerKey];
    const found = await payload.find({
      collection: 'partner-memberships',
      where: {
        and: [{ user: { equals: userId } }, { partner: { equals: partnerId } }],
      },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      user: userId,
      partner: partnerId,
      role: spec.role,
      status: 'active' as const,
      invitedBy: userIds.admin,
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'partner-memberships',
        id: found.docs[0].id,
        data,
        user: actor,
        overrideAccess: true,
      });
      console.log(
        `MEMBERSHIP_OK user=${spec.userKey} partner=${spec.partnerKey} id=${found.docs[0].id} created=false`,
      );
    } else {
      const doc = await payload.create({
        collection: 'partner-memberships',
        data,
        user: actor,
        overrideAccess: true,
      });
      console.log(
        `MEMBERSHIP_OK user=${spec.userKey} partner=${spec.partnerKey} id=${doc.id} created=true`,
      );
    }
  }

  console.log('SEED_IDS_START');
  console.log(JSON.stringify({ namespace: NS, users: userIds, partners: partnerIds }));
  console.log('SEED_IDS_END');
  console.log('SEED_DONE');
  process.exit(0);
}

main().catch((err) => {
  console.error('SEED_FAIL', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

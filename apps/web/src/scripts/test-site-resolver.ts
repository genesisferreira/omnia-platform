import { fetchSiteResolutionWithOptions } from '../lib/site-resolver/client-core';

const TARGET_HOSTNAME = 'dev.omniafrigo.com.br';

type SuccessSummary = {
  ok: true;
  status: 'resolved';
  hostname: string;
  siteSlug: string;
  companySlug: string | null;
  tenantSlug: string;
};

type FailureSummary = {
  ok: false;
  status: string;
  code: string;
  recoverable?: boolean;
};

const printSummary = (summary: SuccessSummary | FailureSummary): void => {
  // Script CLI de diagnóstico — console é a saída intencional.
  // eslint-disable-next-line no-console -- test harness output
  console.log(JSON.stringify(summary, null, 2));
};

const main = async (): Promise<void> => {
  try {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ?? '';
    const secret = process.env.OMNIA_INTERNAL_API_SECRET?.trim() ?? '';

    if (!adminUrl) {
      printSummary({
        ok: false,
        status: 'not_found',
        code: 'MISSING_ADMIN_URL',
        recoverable: false,
      });
      process.exitCode = 1;
      return;
    }

    if (!secret) {
      printSummary({
        ok: false,
        status: 'not_found',
        code: 'MISSING_INTERNAL_API_SECRET',
        recoverable: false,
      });
      process.exitCode = 1;
      return;
    }

    const result = await fetchSiteResolutionWithOptions(TARGET_HOSTNAME, {
      adminUrl,
      secret,
    });

    if (result.ok) {
      printSummary({
        ok: true,
        status: 'resolved',
        hostname: result.context.hostname,
        siteSlug: result.context.site.slug,
        companySlug: result.context.company?.slug ?? null,
        tenantSlug: result.context.tenant.slug,
      });
      process.exitCode = 0;
      return;
    }

    printSummary({
      ok: false,
      status: result.status,
      code: result.error.code,
      recoverable: result.error.recoverable ?? false,
    });
    process.exitCode = 1;
  } catch {
    printSummary({
      ok: false,
      status: 'unexpected_error',
      code: 'UNEXPECTED_ERROR',
    });
    process.exitCode = 1;
  }
};

void main();

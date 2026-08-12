/* eslint-disable no-console -- homolog harness */
/**
 * R0.1 HTTP negative auth + spoof probes.
 * Default: unauthenticated calls against public staging (no secrets).
 * Optional authenticated cross-user checks require OMNIA_R01_SESSION_COOKIE.
 */
const adminBase = (
  process.env.OMNIA_R01_ADMIN_URL || 'https://admin.dev.omniafrigo.com.br'
).replace(/\/+$/, '');
const webBase = (process.env.OMNIA_R01_WEB_URL || 'https://dev.omniafrigo.com.br').replace(
  /\/+$/,
  '',
);

type Probe = { name: string; url: string; method: string; body?: unknown };

const probes: Probe[] = [
  {
    name: 'admin AI chat anonymous',
    url: `${adminBase}/api/omnia/ai/chat`,
    method: 'POST',
    body: { question: 'ping', userId: 'user-b', tenantId: 'tenant-b' },
  },
  {
    name: 'admin SIP profile anonymous spoof',
    url: `${adminBase}/api/omnia/sip/profile?courseId=1&userKey=user-b`,
    method: 'GET',
  },
  {
    name: 'admin Adaptive next anonymous spoof',
    url: `${adminBase}/api/omnia/adaptive/next?courseId=1&userKey=user-b`,
    method: 'GET',
  },
  {
    name: 'admin Tutor profile anonymous spoof',
    url: `${adminBase}/api/omnia/tutor/profile?courseId=1&userId=user-b`,
    method: 'GET',
  },
  {
    name: 'portal BFF AI chat anonymous',
    url: `${webBase}/api/ai/chat`,
    method: 'POST',
    body: { question: 'ping' },
  },
  {
    name: 'portal BFF SIP anonymous',
    url: `${webBase}/api/sip/profile?courseId=1`,
    method: 'GET',
  },
  {
    name: 'portal BFF Adaptive anonymous',
    url: `${webBase}/api/adaptive/next?courseId=1`,
    method: 'GET',
  },
];

async function run(): Promise<void> {
  let failed = 0;
  for (const probe of probes) {
    const response = await fetch(probe.url, {
      method: probe.method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
    const ok = response.status === 401;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${probe.name} HTTP ${response.status}`);
    if (!ok) failed += 1;
  }
  if (failed) {
    throw new Error(`${failed} auth negative HTTP probes failed`);
  }
  console.log('R01_HTTP_AUTH_NEGATIVE_OK');
}

await run();

export {};

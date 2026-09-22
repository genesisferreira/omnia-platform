/**
 * Smoke — @omnia/student-intelligence exports.
 */
export {};

async function main() {
  const mod = await import('@omnia/student-intelligence');
  if (!mod.recalculateSipTwin || !mod.toAssistantContext) {
    throw new Error('SIP_EXPORTS_MISSING');
  }
  console.log('SIP_SMOKE_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Smoke marker — unit tests live in @omnia/neurofrigo-engineering.
 */
export {};

async function main() {
  try {
    const mod = await import('@omnia/neurofrigo-engineering');
    if (!mod.EngineeringService || !mod.buildTechnicalContext) {
      throw new Error('ENGINEERING_EXPORTS_MISSING');
    }
    console.log('ENGINEERING_IA_SMOKE_OK');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

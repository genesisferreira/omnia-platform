/**
 * Smoke — @omnia/adaptive-learning exports.
 */
export {};

async function main() {
  const mod = await import('@omnia/adaptive-learning');
  if (!mod.AdaptiveLearningService || !mod.decideNextActions) {
    throw new Error('ADAPTIVE_EXPORTS_MISSING');
  }
  console.log('ADAPTIVE_LEARNING_SMOKE_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

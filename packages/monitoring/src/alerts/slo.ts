/**
 * SLO / SLA targets for Omnia LMS (DEV→prod readiness).
 * Usados por alertas e documentação — não alteram runtime.
 */
export const LMS_SLO = {
  availabilityTarget: 0.999,
  healthTarget: 1,
  connectorAvailabilityTarget: 0.999,
  httpP95Ms: 300,
  moodleP95Ms: 800,
  redisP95Ms: 20,
  errorRateBurn: 0.05,
  cacheHitFloor: 0.5,
  moodleLatencyAlertMs: 2000,
} as const;

export type LmsSlo = typeof LMS_SLO;

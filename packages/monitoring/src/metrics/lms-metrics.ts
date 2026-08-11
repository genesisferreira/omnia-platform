import { Counter, Gauge, Histogram, defaultRegistry } from './prometheus';

/** Métricas HTTP / infra / LMS — labels sem PII. */
export const httpRequestsTotal = defaultRegistry.register(
  new Counter('http_requests_total', 'Total HTTP requests handled by Admin BFF'),
);

export const httpRequestDurationSeconds = defaultRegistry.register(
  new Histogram('http_request_duration_seconds', 'HTTP request duration in seconds'),
);

export const httpErrorsTotal = defaultRegistry.register(
  new Counter('http_errors_total', 'Total HTTP responses with status >= 400'),
);

export const redisOperationsTotal = defaultRegistry.register(
  new Counter('redis_operations_total', 'Redis operations from LMS connector'),
);

export const redisLatencySeconds = defaultRegistry.register(
  new Histogram(
    'redis_latency_seconds',
    'Redis operation latency in seconds',
    [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1],
  ),
);

export const moodleRequestsTotal = defaultRegistry.register(
  new Counter('moodle_requests_total', 'Moodle REST calls from connector'),
);

export const moodleRequestDurationSeconds = defaultRegistry.register(
  new Histogram('moodle_request_duration_seconds', 'Moodle REST latency in seconds'),
);

export const moodleErrorsTotal = defaultRegistry.register(
  new Counter('moodle_errors_total', 'Moodle REST errors from connector'),
);

export const connectorCacheHitTotal = defaultRegistry.register(
  new Counter('connector_cache_hit_total', 'LMS connector cache hits'),
);

export const connectorCacheMissTotal = defaultRegistry.register(
  new Counter('connector_cache_miss_total', 'LMS connector cache misses'),
);

export const connectorActiveSessions = defaultRegistry.register(
  new Gauge('connector_active_sessions', 'Approximate active LMS sessions observed'),
);

export const connectorRevokedSessions = defaultRegistry.register(
  new Counter('connector_revoked_sessions', 'LMS sessions revoked'),
);

export const connectorPolicyUpdates = defaultRegistry.register(
  new Counter('connector_policy_updates', 'LMS policy updates audited'),
);

export const connectorIdentityLinks = defaultRegistry.register(
  new Gauge('connector_identity_links', 'Active Omnia↔Moodle identity links'),
);

export const connectorHealthStatus = defaultRegistry.register(
  new Gauge(
    'connector_health_status',
    'Connector health as gauge (1=healthy,0.5=degraded,0=unhealthy/disabled)',
  ),
);

/** Métricas de negócio LMS (independentes do schema Moodle). */
export const lmsStudentsOnline = defaultRegistry.register(
  new Gauge('lms_students_online', 'Students with an active LMS session family'),
);

export const lmsCoursesOpened = defaultRegistry.register(
  new Counter('lms_courses_opened', 'Course detail reads via BFF'),
);

export const lmsLessonsStarted = defaultRegistry.register(
  new Counter('lms_lessons_started', 'Course content reads (lesson/outline open)'),
);

export const lmsLessonsCompleted = defaultRegistry.register(
  new Counter('lms_lessons_completed', 'Completion polls that report completed=true'),
);

export const lmsProgressRequests = defaultRegistry.register(
  new Counter('lms_progress_requests', 'Progress API requests'),
);

export const lmsGradeRequests = defaultRegistry.register(
  new Counter('lms_grade_requests', 'Grades API requests'),
);

export const lmsCompletionRequests = defaultRegistry.register(
  new Counter('lms_completion_requests', 'Completion API requests'),
);

export const lmsLoginSuccess = defaultRegistry.register(
  new Counter('lms_login_success', 'LMS session create successes'),
);

export const lmsLoginFailure = defaultRegistry.register(
  new Counter('lms_login_failure', 'LMS session create failures'),
);

export const lmsSessionRevocations = defaultRegistry.register(
  new Counter('lms_session_revocations', 'LMS session revocations (limit/logout/admin)'),
);

export const lmsPolicyChanges = defaultRegistry.register(
  new Counter('lms_policy_changes', 'LMS policy change events'),
);

export const lmsIdentityLinksMetric = defaultRegistry.register(
  new Gauge('lms_identity_links', 'Count of active identity links'),
);

export const lmsApiErrors = defaultRegistry.register(
  new Counter('lms_api_errors', 'LMS BFF API errors by code class'),
);

/** Academic Provisioning (Sprint 3.0) — labels: action only, sem PII. */
export const provisionSuccessTotal = defaultRegistry.register(
  new Counter('provision_success_total', 'Academic provision user operations succeeded'),
);

export const provisionFailureTotal = defaultRegistry.register(
  new Counter('provision_failure_total', 'Academic provision user operations failed'),
);

export const enrollmentSuccessTotal = defaultRegistry.register(
  new Counter('enrollment_success_total', 'Enrollment lifecycle operations succeeded'),
);

export const enrollmentFailureTotal = defaultRegistry.register(
  new Counter('enrollment_failure_total', 'Enrollment lifecycle operations failed'),
);

export const provisionRetryTotal = defaultRegistry.register(
  new Counter('provision_retry_total', 'Provision queue retries / failures requeued'),
);

export const provisionQueueSize = defaultRegistry.register(
  new Gauge('provision_queue_size', 'Academic provision ready queue depth'),
);

export const provisionLatencySeconds = defaultRegistry.register(
  new Histogram('provision_latency_seconds', 'Academic provision operation latency in seconds'),
);

/** Media Authorization (Sprint 3.0B) — labels sem PII. */
export const mediaAuthorizeTotal = defaultRegistry.register(
  new Counter('media_authorize_total', 'Media authorization decisions'),
);

export const mediaAuthorizeDeniedTotal = defaultRegistry.register(
  new Counter('media_authorize_denied_total', 'Media authorization denials'),
);

export const mediaSignedTotal = defaultRegistry.register(
  new Counter('media_signed_total', 'Controlled media sign operations'),
);

export const mediaRevokedTotal = defaultRegistry.register(
  new Counter('media_revoked_total', 'Media access revocations'),
);

export const mediaCacheHitsTotal = defaultRegistry.register(
  new Counter('media_cache_hits', 'Media decision cache hits'),
);

export const mediaLatencySeconds = defaultRegistry.register(
  new Histogram('media_latency', 'Media authorization latency in seconds'),
);

export function renderPrometheusMetrics(): string {
  return defaultRegistry.render();
}

export function resetPrometheusMetricsForTests(): void {
  defaultRegistry.reset();
}

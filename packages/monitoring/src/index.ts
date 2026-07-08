/**
 * @omnia/monitoring — Observabilidade centralizada.
 *
 * Módulos:
 * - health/      — Status e healthchecks da plataforma
 * - metrics/     — Prometheus (Sprint 2+)
 * - logs/        — Agregação de logs
 * - tracing/     — OpenTelemetry
 * - alerts/      — Alertas e notificações
 * - dashboards/  — Grafana
 */
export { getPlatformStatus, type PlatformStatus, type ServiceStatus } from './health/index';

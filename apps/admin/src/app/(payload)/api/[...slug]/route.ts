import config from '@payload-config';
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from '@payloadcms/next/routes';

import { withDeviceGate } from '@/services/devices/route-gate';

/**
 * Device Access Control: ponto canônico de enforcement (ver services/devices/gate.ts).
 * Com a política desligada (default) o gate apenas repassa.
 */
export const GET = withDeviceGate(REST_GET(config), config);
export const POST = withDeviceGate(REST_POST(config), config);
export const DELETE = withDeviceGate(REST_DELETE(config), config);
export const PATCH = withDeviceGate(REST_PATCH(config), config);
/** Preflight CORS — sem isto o browser bloqueia POST cross-origin (ex.: lead-capture). */
export const OPTIONS = REST_OPTIONS(config);

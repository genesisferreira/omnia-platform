import config from '@payload-config';
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from '@payloadcms/next/routes';

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
/** Preflight CORS — sem isto o browser bloqueia POST cross-origin (ex.: lead-capture). */
export const OPTIONS = REST_OPTIONS(config);

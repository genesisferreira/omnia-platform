import type { SanitizedConfig } from 'payload';
import { getPayload } from 'payload';

import { decideDeviceGate, deviceDeniedResponse, stripCredentials } from './gate';
import { createPayloadDeviceStore } from './payload-store';

type RouteHandler = (
  request: Request,
  context: { params: Promise<{ slug: string[] }> },
) => Promise<Response>;

/**
 * Aplica o gate de dispositivo antes do handler REST do Payload.
 * Qualquer erro inesperado do gate ⇒ fail-open (a ACL/auth normal do Payload continua valendo).
 */
export function withDeviceGate(
  handler: RouteHandler,
  config: Promise<SanitizedConfig> | SanitizedConfig,
): RouteHandler {
  return async (request, context) => {
    let target = request;
    try {
      const payload = await getPayload({ config });
      const store = createPayloadDeviceStore(payload, undefined, { cachedSettings: true });
      const decision = await decideDeviceGate(request, { payload, store });
      if (decision.kind === 'deny') {
        payload.logger.warn({
          msg: 'device.gate.denied',
          userId: decision.userId,
          state: decision.state,
        });
        return deviceDeniedResponse(decision.state);
      }
      if (decision.kind === 'downgrade') {
        payload.logger.info({
          msg: 'device.gate.downgraded',
          userId: decision.userId,
          state: decision.state,
        });
        target = stripCredentials(request, payload.config.cookiePrefix || 'payload');
      }
    } catch (err) {
      console.warn('[device.gate] fail-open:', err instanceof Error ? err.message : 'unknown');
    }
    return handler(target, context);
  };
}

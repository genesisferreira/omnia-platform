import type {
  AuthStrategyFunction,
  CollectionBeforeLoginHook,
  CollectionMeHook,
  CollectionRefreshHook,
  Payload,
} from 'payload';
import { AuthenticationError, Forbidden } from 'payload';

type AccountStatusUser = {
  accountStatus?: string | null;
  email?: string | null;
};

function isBlocked(user: AccountStatusUser | null | undefined): boolean {
  return user?.accountStatus === 'blocked';
}

/**
 * Rejeita login nativo Payload quando accountStatus=blocked.
 * Roda após senha válida; sessão criada é revogada no catch do loginOperation.
 */
export const rejectBlockedBeforeLogin: CollectionBeforeLoginHook = ({ user, req }) => {
  if (isBlocked(user as AccountStatusUser)) {
    req.payload.logger.warn({
      msg: 'auth: blocked account login rejected',
      code: 'ACCOUNT_BLOCKED',
    });
    throw new AuthenticationError(req.t);
  }
  return user;
};

/** /api/users/me — sessão de blocked deixa de ser aceita. */
export const rejectBlockedMe: CollectionMeHook = ({ user }) => {
  if (isBlocked(user as AccountStatusUser)) {
    return { user: null as never, exp: 0 };
  }
  return undefined;
};

/** Refresh de token falha para blocked. */
export const rejectBlockedRefresh: CollectionRefreshHook = ({ user, args }) => {
  if (isBlocked(user as AccountStatusUser)) {
    throw new Forbidden(args.req.t);
  }
  return undefined;
};

/**
 * Envolve a estratégia JWT do Payload para invalidar sessões de contas blocked.
 * Instalado em onInit (authStrategies é mutável após bootstrap).
 */
export function wrapJwtStrategyRejectBlocked(payload: Payload): void {
  const strategies = payload.authStrategies;
  if (!strategies?.length) {
    return;
  }

  const jwt = strategies.find((s) => s.name === 'local-jwt');
  if (!jwt) {
    return;
  }

  const original: AuthStrategyFunction = jwt.authenticate.bind(jwt);
  jwt.authenticate = async (args) => {
    const result = await original(args);
    const user = result.user as AccountStatusUser | null;
    if (user && isBlocked(user)) {
      const headers = new Headers(result.responseHeaders);
      if (args.canSetHeaders) {
        const prefix = payload.config?.cookiePrefix || 'payload';
        headers.append('Set-Cookie', `${prefix}-token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
      }
      return { user: null, responseHeaders: headers };
    }
    return result;
  };
}

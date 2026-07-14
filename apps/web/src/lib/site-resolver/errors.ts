import type { SiteResolutionFailure } from './contracts';

export const createInternalApiUnauthorizedFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INTERNAL_API_UNAUTHORIZED',
    message: 'Falha de autenticação na API interna.',
    recoverable: false,
  },
});

export const createInternalApiUnavailableFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INTERNAL_API_UNAVAILABLE',
    message: 'API interna indisponível.',
    recoverable: true,
  },
});

export const createInternalApiTimeoutFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INTERNAL_API_TIMEOUT',
    message: 'Tempo limite excedido ao resolver o Site.',
    recoverable: true,
  },
});

export const createInternalApiNetworkFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INTERNAL_API_NETWORK_ERROR',
    message: 'Não foi possível acessar a API interna.',
    recoverable: true,
  },
});

export const createInvalidInternalApiResponseFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INVALID_INTERNAL_API_RESPONSE',
    message: 'Resposta inválida da API interna.',
    recoverable: false,
  },
});

export const createInternalConfigurationFailure = (): SiteResolutionFailure => ({
  ok: false,
  status: 'not_found',
  error: {
    code: 'INTERNAL_CONFIGURATION_ERROR',
    message: 'Configuração interna indisponível.',
    recoverable: false,
  },
});

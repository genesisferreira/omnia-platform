import { AppError } from './AppError';

export class AuthorizationError extends AppError {
  constructor(message = 'Sem permissão') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

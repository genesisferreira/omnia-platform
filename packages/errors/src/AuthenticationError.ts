import { AppError } from './AppError';

export class AuthenticationError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

import { AppError } from './AppError';

export class RateLimitError extends AppError {
  constructor(message = 'Limite de requisições excedido') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

import { AppError } from './AppError';

export class ExternalServiceError extends AppError {
  constructor(message: string, code = 'EXTERNAL_SERVICE_ERROR') {
    super(message, code, 502);
    this.name = 'ExternalServiceError';
  }
}

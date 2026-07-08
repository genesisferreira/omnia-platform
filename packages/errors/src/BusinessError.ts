import { AppError } from './AppError';

export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_ERROR') {
    super(message, code, 422);
    this.name = 'BusinessError';
  }
}

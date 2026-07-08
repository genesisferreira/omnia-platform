import { AppError } from './AppError';

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

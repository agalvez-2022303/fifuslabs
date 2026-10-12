export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 501,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Tema o elemento no encontrado') {
    super(404, 'NOT_FOUND', message)
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Contenido inválido', details?: unknown) {
    super(422, 'VALIDATION_ERROR', message, details)
  }
}
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'BAD_REQUEST', message)
  }
}
export class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'UNAUTHORIZED', 'Se requiere autenticación')
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Se requiere el rol teacher') {
    super(403, 'FORBIDDEN', message)
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Versión desactualizada o slug duplicado') {
    super(409, 'CONFLICT', message)
  }
}
export class NotImplementedError extends AppError {
  constructor() {
    super(
      501,
      'STORAGE_READ_ONLY',
      'Las escrituras JSON solo están disponibles en desarrollo local. El repositorio Supabase aún no está implementado.'
    )
  }
}
export class PayloadTooLargeError extends AppError {
  constructor() {
    super(413, 'PAYLOAD_TOO_LARGE', 'El body supera 256 KiB')
  }
}

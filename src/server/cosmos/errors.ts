export class ActiveSessionConflictError extends Error {
  readonly statusCode = 409;

  constructor(userOid: string) {
    super(`User ${userOid} already has an active game session.`);
    this.name = 'ActiveSessionConflictError';
  }
}

export class CosmosPreconditionFailedError extends Error {
  readonly statusCode = 412;

  constructor(message = 'The stored document changed since it was read.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'CosmosPreconditionFailedError';
  }
}

export class CosmosOperationError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'CosmosOperationError';
    this.statusCode = statusCode;
  }
}

export function getCosmosStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: number | string; statusCode?: number };
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  if (typeof candidate.code === 'number') return candidate.code;
  if (typeof candidate.code === 'string' && /^\d+$/.test(candidate.code)) return Number(candidate.code);
  return undefined;
}

export function rethrowCosmosError(error: unknown, operation: string): never {
  const statusCode = getCosmosStatusCode(error);
  if (statusCode === 412) {
    throw new CosmosPreconditionFailedError(`${operation} rejected because the ETag is stale.`, { cause: error });
  }
  throw error;
}

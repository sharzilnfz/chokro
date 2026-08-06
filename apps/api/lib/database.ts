import { NextResponse } from 'next/server';

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable');
  }
}

export async function databaseOrTestStore<T>(
  databaseOperation: () => Promise<T>,
  testOperation: () => T | Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV === 'test') {
    return testOperation();
  }

  try {
    return await databaseOperation();
  } catch {
    throw new DatabaseUnavailableError();
  }
}

export function routeError(error: unknown) {
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

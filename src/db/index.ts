// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    const rawConnStr = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
    const isValidPostgresUri = /^postgres(ql)?:\/\//i.test(rawConnStr);
    const hasSqlHost = Boolean(process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME);

    if (isValidPostgresUri) {
      const isLocal = rawConnStr.includes('localhost') || rawConnStr.includes('127.0.0.1');
      global._postgresPool = new Pool({
        connectionString: rawConnStr,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 25000,
        keepAlive: true,
      });
    } else if (hasSqlHost) {
      if (rawConnStr) {
        console.info('Non-PostgreSQL DATABASE_URL detected; connecting via SQL_HOST.');
      }
      const sqlHost = process.env.SQL_HOST;
      const isUnixSocket = Boolean(sqlHost && sqlHost.startsWith('/'));
      global._postgresPool = new Pool({
        host: sqlHost,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: isUnixSocket ? false : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 25000,
        keepAlive: true,
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 25000,
        keepAlive: true,
      });
    }

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.warn('PostgreSQL idle client pool event (handled gracefully):', err.message || err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

// Retry helper for transient Cloud SQL / PostgreSQL cold-start or socket reconnect errors
function isTransientDbError(err: any): boolean {
  const msg = String(err?.message || err?.cause?.message || err || '').toLowerCase();
  const code = String(err?.code || err?.cause?.code || '').toUpperCase();
  return (
    msg.includes('timeout exceeded') ||
    msg.includes('connection terminated') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('the database system is starting up') ||
    ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', '57P01', '57P03', '08006', '08001'].includes(code)
  );
}

export async function withDbRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && isTransientDbError(err)) {
        const delayMs = 350 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

import { Pool } from 'pg';
import { config } from './env';

export const pool = new Pool({
  connectionString: config.env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export async function checkDatabaseHealth(): Promise<{ isConnected: boolean; error?: string }> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1;');
      return { isConnected: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      isConnected: false,
      error: err?.message || 'Database connection error',
    };
  }
}

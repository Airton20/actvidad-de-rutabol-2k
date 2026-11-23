import {
  Injectable,
  OnModuleDestroy
} from '@nestjs/common';

import {
  Pool,
  PoolClient,
  QueryResultRow
} from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('Falta DATABASE_URL');
    }

    const isCloud = process.env.DATABASE_URL.includes('supabase.co') || process.env.DATABASE_URL.includes('sslmode=');

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isCloud ? { rejectUnauthorized: false } : undefined
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.pool.query<T>(
      sql,
      params
    );

    return result.rows;
  }

  async withTransaction<T>(
    work: (query: <R extends QueryResultRow>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txQuery = async <R extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<R[]> => {
        const result = await client.query<R>(sql, params);
        return result.rows;
      };
      const result = await work(txQuery);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

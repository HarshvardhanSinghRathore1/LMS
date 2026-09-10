import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function runMigrations() {
  console.log('🔄 Starting Capacity Connect database migrations...');
  const client = await pool.connect();

  try {
    // 1. Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read existing executed migrations
    const { rows } = await client.query<{ migration_name: string }>(
      'SELECT migration_name FROM schema_migrations;'
    );
    const executedMigrations = new Set(rows.map((r) => r.migration_name));

    // 3. Discover migration SQL files
    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '../../src/database/migrations');
    }
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️ No migrations directory found.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Deterministic alphabetical order

    let appliedCount = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`⏩ Migration ${file} already executed. Skipping.`);
        continue;
      }

      console.log(`⚡ Executing migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute inside transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1);',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Successfully applied migration: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying migration ${file}:`, err);
        throw err;
      }
    }

    console.log(`🎉 Migration run complete. Applied ${appliedCount} new migration(s).`);
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };

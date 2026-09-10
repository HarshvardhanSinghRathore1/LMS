import { pool } from '../config/database';
import { hashPassword } from '../modules/auth/auth.utils';

async function seedDemoAccounts() {
  console.log('🌱 Provisioning Trainer & Trainee demo accounts...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get default org
    const orgRes = await client.query('SELECT id, name, code FROM organizations WHERE code = $1 LIMIT 1', ['cc']);
    if (orgRes.rows.length === 0) {
      throw new Error('Default organization cc not found.');
    }
    const org = orgRes.rows[0];

    const trainerPasswordHash = await hashPassword('trainerbylms');
    const traineePasswordHash = await hashPassword('traineebylms');

    // Seed Trainer
    await client.query(
      `INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = true`,
      [org.id, 'Demo', 'Trainer', 'trainer@lms.com', trainerPasswordHash, 'TRAINER']
    );

    // Seed Trainee
    await client.query(
      `INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = true`,
      [org.id, 'Demo', 'Trainee', 'trainee@lms.com', traineePasswordHash, 'TRAINEE']
    );

    await client.query('COMMIT');
    console.log('✅ Demo accounts seeded successfully:');
    console.log('   - Trainer: trainer@lms.com (password: trainerbylms)');
    console.log('   - Trainee: trainee@lms.com (password: traineebylms)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 Failed to seed demo accounts:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoAccounts();

/**
 * PostgreSQL Client Module
 * 
 * Demonstrates: Persistent Distributed Storage
 * 
 * Provides a database connection pool for:
 * - Student credentials and accounts
 * - Exam definitions and questions
 * - Final submission results and scores
 * - Session logs for auditing
 * 
 * PostgreSQL ensures ACID properties and durability—
 * even if all exam nodes crash, the data is safe.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://exam_user:exam_password@localhost:5432/exam_db',
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log(`✓ PostgreSQL connected (${process.env.NODE_ID || 'unknown'})`);
});

pool.on('error', (err) => {
  console.error('✗ PostgreSQL pool error:', err);
});

/**
 * Initialize database schema on server startup
 * Idempotent: uses IF NOT EXISTS, safe to call multiple times
 */
export async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log(`✓ Database schema initialized (${process.env.NODE_ID || 'unknown'})`);
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  }
}

/**
 * Run migration (adds is_admin column and seeds new exams)
 * Idempotent: uses IF NOT EXISTS and NOT EXISTS checks
 */
export async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migration.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migration);
      console.log(`✓ Database migration applied (${process.env.NODE_ID || 'unknown'})`);
    }

    // Apply v2 migration for teachers and classrooms
    const migrationV2Path = path.join(__dirname, 'migration_v2_teachers_classrooms.sql');
    if (fs.existsSync(migrationV2Path)) {
      const migrationV2 = fs.readFileSync(migrationV2Path, 'utf8');
      await pool.query(migrationV2);
      console.log(`✓ Database v2 migration applied (${process.env.NODE_ID || 'unknown'})`);
    }
  } catch (error) {
    console.error('✗ Database migration error:', error);
    throw error;
  }
}

export default pool;

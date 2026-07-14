import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '4000', 10);
  const user = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE;

  if (!host || !user || !password || !database) {
    throw new Error('Database configuration env variables missing.');
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false // Required for serverless connecting to cloud databases securely
    },
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  return pool;
}

export async function testDbConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDbPool();
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    return { success: true, message: `Connected to database successfully. Result: ${(rows as any)[0]?.result}` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Unknown database connection error.' };
  }
}

export async function initDbTables(): Promise<void> {
  const db = getDbPool();

  // Create tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      \`value\` LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS resumes (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`content\` LONGTEXT NOT NULL,
      \`score\` INT NOT NULL,
      \`atsFeedback\` LONGTEXT NOT NULL,
      \`version\` INT NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cover_letters (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`jobTitle\` VARCHAR(255) NOT NULL,
      \`company\` VARCHAR(255) NOT NULL,
      \`content\` LONGTEXT NOT NULL,
      \`style\` VARCHAR(255) NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chats (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`messages\` LONGTEXT NOT NULL,
      \`createdAt\` BIGINT NOT NULL,
      \`updatedAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`jobId\` VARCHAR(255),
      \`title\` VARCHAR(255) NOT NULL,
      \`company\` VARCHAR(255) NOT NULL,
      \`location\` VARCHAR(255) NOT NULL,
      \`salary\` VARCHAR(255) NOT NULL,
      \`remote\` VARCHAR(255) NOT NULL,
      \`status\` VARCHAR(255) NOT NULL,
      \`dateApplied\` BIGINT,
      \`notes\` LONGTEXT NOT NULL,
      \`followUps\` TINYINT NOT NULL,
      \`reminderDate\` BIGINT,
      \`jobDesc\` LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`applicationId\` VARCHAR(255),
      \`company\` VARCHAR(255) NOT NULL,
      \`position\` VARCHAR(255) NOT NULL,
      \`dateTime\` BIGINT NOT NULL,
      \`timeZone\` VARCHAR(255) NOT NULL,
      \`meetingLink\` VARCHAR(255),
      \`interviewer\` VARCHAR(255),
      \`checklist\` LONGTEXT NOT NULL,
      \`notes\` LONGTEXT,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS saved_jobs (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`company\` VARCHAR(255) NOT NULL,
      \`location\` VARCHAR(255) NOT NULL,
      \`salary\` VARCHAR(255) NOT NULL,
      \`remote\` VARCHAR(255) NOT NULL,
      \`jobType\` VARCHAR(255) NOT NULL,
      \`description\` LONGTEXT NOT NULL,
      \`techStack\` LONGTEXT NOT NULL,
      \`industry\` VARCHAR(255) NOT NULL,
      \`url\` VARCHAR(255),
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`email\` VARCHAR(255) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS autopilot_runs (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`status\` VARCHAR(255) NOT NULL,
      \`jobsFound\` INT NOT NULL,
      \`jobsApplied\` INT NOT NULL,
      \`logs\` LONGTEXT NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS autopilot_jobs (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`runId\` VARCHAR(255) NOT NULL,
      \`jobId\` VARCHAR(255) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`company\` VARCHAR(255) NOT NULL,
      \`score\` INT NOT NULL,
      \`matchReasoning\` LONGTEXT NOT NULL,
      \`status\` VARCHAR(255) NOT NULL,
      \`formFields\` LONGTEXT,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

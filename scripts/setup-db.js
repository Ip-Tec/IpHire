// Run this once with a database user that has DDL privileges.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    process.env[key] ??= value;
  }
}

async function createDatabase() {
  loadLocalEnv();

  const database = process.env.DB_DATABASE || 'iphire';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '4000', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    console.log(`Database "${database}" created (or already exists)`);

    await conn.query(`USE \`${database}\``);

    await conn.query(`CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      \`value\` LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`email\` VARCHAR(255) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS autopilot_runs (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`status\` VARCHAR(255) NOT NULL,
      \`jobsFound\` INT NOT NULL,
      \`jobsApplied\` INT NOT NULL,
      \`logs\` LONGTEXT NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS autopilot_jobs (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS resumes (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`content\` LONGTEXT NOT NULL,
      \`score\` INT NOT NULL,
      \`atsFeedback\` LONGTEXT NOT NULL,
      \`version\` INT NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS cover_letters (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`jobTitle\` VARCHAR(255) NOT NULL,
      \`company\` VARCHAR(255) NOT NULL,
      \`content\` LONGTEXT NOT NULL,
      \`style\` VARCHAR(255) NOT NULL,
      \`createdAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS chats (
      \`id\` VARCHAR(255) PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`messages\` LONGTEXT NOT NULL,
      \`createdAt\` BIGINT NOT NULL,
      \`updatedAt\` BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS applications (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS interviews (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS saved_jobs (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log(`All tables created in "${database}" database`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

createDatabase();

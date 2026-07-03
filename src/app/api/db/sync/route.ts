import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables, testDbConnection } from '@/lib/tidb';

export async function GET() {
  try {
    const connTest = await testDbConnection();
    if (!connTest.success) {
      return NextResponse.json({ success: false, message: connTest.message }, { status: 500 });
    }

    await initDbTables();

    // Fetch all current database states to verify pulling
    const db = getDbPool();
    
    const [settings] = await db.query('SELECT * FROM settings');
    const [resumes] = await db.query('SELECT * FROM resumes');
    const [coverLetters] = await db.query('SELECT * FROM cover_letters');
    const [chats] = await db.query('SELECT * FROM chats');
    const [applications] = await db.query('SELECT * FROM applications');
    const [interviews] = await db.query('SELECT * FROM interviews');
    const [savedJobs] = await db.query('SELECT * FROM saved_jobs');

    return NextResponse.json({
      success: true,
      data: {
        settings: (settings as any[]).reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {}),
        resumes: resumes as any[],
        coverLetters: coverLetters as any[],
        chats: (chats as any[]).map(c => ({ ...c, messages: JSON.parse(c.messages) })),
        applications: applications as any[],
        interviews: (interviews as any[]).map(i => ({ ...i, checklist: JSON.parse(i.checklist) })),
        savedJobs: (savedJobs as any[]).map(j => ({ ...j, techStack: JSON.parse(j.techStack) }))
      }
    });
  } catch (error: any) {
    console.error('Database pull/check failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const connTest = await testDbConnection();
    if (!connTest.success) {
      return NextResponse.json({ success: false, message: connTest.message }, { status: 500 });
    }

    await initDbTables();
    const db = getDbPool();
    const body = await req.json();

    const { settings, resumes, coverLetters, chats, applications, interviews, savedJobs } = body;

    // We execute inside a connection helper or standard query
    // 1. Settings Sync
    if (settings && typeof settings === 'object') {
      for (const [key, val] of Object.entries(settings)) {
        await db.query(
          'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
          [key, JSON.stringify(val)]
        );
      }
    }

    // 2. Resumes Sync
    if (Array.isArray(resumes)) {
      for (const r of resumes) {
        await db.query(
          'INSERT INTO resumes (`id`, `name`, `content`, `score`, `atsFeedback`, `version`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `content` = VALUES(`content`), `score` = VALUES(`score`), `atsFeedback` = VALUES(`atsFeedback`), `version` = VALUES(\`version\`), \`createdAt\` = VALUES(\`createdAt\`)',
          [r.id, r.name, r.content, r.score, r.atsFeedback, r.version, r.createdAt]
        );
      }
    }

    // 3. Cover Letters Sync
    if (Array.isArray(coverLetters)) {
      for (const cl of coverLetters) {
        await db.query(
          'INSERT INTO cover_letters (`id`, `title`, `jobTitle`, `company`, `content`, `style`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `jobTitle` = VALUES(`jobTitle`), `company` = VALUES(`company`), `content` = VALUES(`content`), `style` = VALUES(\`style\`), \`createdAt\` = VALUES(\`createdAt\`)',
          [cl.id, cl.title, cl.jobTitle, cl.company, cl.content, cl.style, cl.createdAt]
        );
      }
    }

    // 4. Chats Sync
    if (Array.isArray(chats)) {
      for (const c of chats) {
        await db.query(
          'INSERT INTO chats (`id`, `title`, `messages`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `messages` = VALUES(`messages`), `createdAt` = VALUES(`createdAt`), `updatedAt` = VALUES(\`updatedAt\`)',
          [c.id, c.title, JSON.stringify(c.messages), c.createdAt, c.updatedAt]
        );
      }
    }

    // 5. Applications Sync
    if (Array.isArray(applications)) {
      for (const app of applications) {
        await db.query(
          'INSERT INTO applications (`id`, `jobId`, `title`, `company`, `location`, `salary`, `remote`, `status`, `dateApplied`, `notes`, `followUps`, `reminderDate`, `jobDesc`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `jobId` = VALUES(`jobId`), `title` = VALUES(`title`), `company` = VALUES(`company`), `location` = VALUES(`location`), `salary` = VALUES(\`salary\`), \`remote\` = VALUES(\`remote\`), \`status\` = VALUES(\`status\`), \`dateApplied\` = VALUES(\`dateApplied\`), \`notes\` = VALUES(\`notes\`), \`followUps\` = VALUES(\`followUps\`), \`reminderDate\` = VALUES(\`reminderDate\`), \`jobDesc\` = VALUES(\`jobDesc\`)',
          [app.id, app.jobId || null, app.title, app.company, app.location, app.salary, app.remote, app.status, app.dateApplied || null, app.notes, app.followUps ? 1 : 0, app.reminderDate || null, app.jobDesc || null]
        );
      }
    }

    // 6. Interviews Sync
    if (Array.isArray(interviews)) {
      for (const int of interviews) {
        await db.query(
          'INSERT INTO interviews (`id`, `applicationId`, `company`, `position`, `dateTime`, `timeZone`, `meetingLink`, `interviewer`, `checklist`, `notes`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `applicationId` = VALUES(`applicationId`), `company` = VALUES(`company`), `position` = VALUES(`position`), `dateTime` = VALUES(`dateTime`), `timeZone` = VALUES(\`timeZone\`), \`meetingLink\` = VALUES(\`meetingLink\`), \`interviewer\` = VALUES(\`interviewer\`), \`checklist\` = VALUES(\`checklist\`), \`notes\` = VALUES(\`notes\`), \`createdAt\` = VALUES(\`createdAt\`)',
          [int.id, int.applicationId || null, int.company, int.position, int.dateTime, int.timeZone, int.meetingLink || null, int.interviewer || null, JSON.stringify(int.checklist || []), int.notes || null, int.createdAt]
        );
      }
    }

    // 7. Saved Jobs Sync
    if (Array.isArray(savedJobs)) {
      for (const j of savedJobs) {
        await db.query(
          'INSERT INTO saved_jobs (`id`, `title`, `company`, `location`, `salary`, `remote`, `jobType`, `description`, `techStack`, `industry`, `url`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `company` = VALUES(`company`), `location` = VALUES(`location`), `salary` = VALUES(\`salary\`), \`remote\` = VALUES(\`remote\`), \`jobType\` = VALUES(\`jobType\`), \`description\` = VALUES(\`description\`), \`techStack\` = VALUES(\`techStack\`), \`industry\` = VALUES(\`industry\`), \`url\` = VALUES(\`url\`), \`createdAt\` = VALUES(\`createdAt\`)',
          [j.id, j.title, j.company, j.location, j.salary, j.remote, j.jobType, j.description, JSON.stringify(j.techStack || []), j.industry, j.url || null, j.createdAt]
        );
      }
    }

    // After updating, retrieve the entire merged set to sync back to client
    const [mergedSettings] = await db.query('SELECT * FROM settings');
    const [mergedResumes] = await db.query('SELECT * FROM resumes');
    const [mergedCoverLetters] = await db.query('SELECT * FROM cover_letters');
    const [mergedChats] = await db.query('SELECT * FROM chats');
    const [mergedApps] = await db.query('SELECT * FROM applications');
    const [mergedInts] = await db.query('SELECT * FROM interviews');
    const [mergedSavedJobs] = await db.query('SELECT * FROM saved_jobs');

    return NextResponse.json({
      success: true,
      data: {
        settings: (mergedSettings as any[]).reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {}),
        resumes: mergedResumes as any[],
        coverLetters: mergedCoverLetters as any[],
        chats: (mergedChats as any[]).map(c => ({ ...c, messages: JSON.parse(c.messages) })),
        applications: mergedApps as any[],
        interviews: (mergedInts as any[]).map(i => ({ ...i, checklist: JSON.parse(i.checklist) })),
        savedJobs: (mergedSavedJobs as any[]).map(j => ({ ...j, techStack: JSON.parse(j.techStack) }))
      }
    });
  } catch (error: any) {
    console.error('Database push/sync failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

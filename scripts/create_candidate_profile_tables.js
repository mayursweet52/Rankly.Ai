const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📦 Initializing Candidate Profile Database Schema (SQLite / PostgreSQL)...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CandidateProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "email" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "headline" TEXT,
      "phone" TEXT,
      "location" TEXT,
      "workPreference" TEXT DEFAULT 'remote',
      "noticePeriod" TEXT DEFAULT 'Immediate',
      "currentCtc" TEXT,
      "expectedCtc" TEXT,
      "linkedinUrl" TEXT,
      "githubUrl" TEXT,
      "portfolioUrl" TEXT,
      "bio" TEXT,
      "avatarUrl" TEXT,
      "resumeUrl" TEXT,
      "profileStrength" INTEGER DEFAULT 30,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CandidateProfile_email_key" ON "CandidateProfile"("email");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CandidateExperience" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "company" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "location" TEXT,
      "startDate" TEXT,
      "endDate" TEXT,
      "isCurrent" BOOLEAN DEFAULT false,
      "description" TEXT,
      "techStack" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CandidateExperience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CandidateEducation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "institution" TEXT NOT NULL,
      "degree" TEXT NOT NULL,
      "fieldOfStudy" TEXT,
      "startYear" TEXT,
      "endYear" TEXT,
      "gradeOrGpa" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CandidateEducation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CandidateSkill" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "skillName" TEXT NOT NULL,
      "proficiency" TEXT DEFAULT 'Intermediate',
      "yearsExperience" INTEGER DEFAULT 1,
      "isVerified" BOOLEAN DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CandidateSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  console.log('✅ Candidate Profile database tables created and verified successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Schema initialization error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Ensure DATABASE_URL is defined before initializing Prisma Client
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./rankly.db';
}

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['warn', 'error']
    });
  }
  prisma = global.prisma;
}

// Helper to check connection and auto-initialize tables
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ SQLite Database connected successfully via Prisma ORM.');

    // Auto-create essential tables if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "accountType" TEXT NOT NULL DEFAULT 'normal_user',
        "firstName" TEXT NOT NULL,
        "lastName" TEXT,
        "username" TEXT,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "password" TEXT NOT NULL,
        "dob" DATETIME,
        "age" INTEGER,
        "gender" TEXT,
        "profession" TEXT,
        "linkedInUrl" TEXT,
        "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
        "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
        "role" TEXT NOT NULL DEFAULT 'normal_user',
        "workEmail" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "organizationId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OTP" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT,
        "phone" TEXT,
        "otp" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'email_verification',
        "expiresAt" DATETIME NOT NULL,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Organization" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "adminId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ReferralCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "assignedRole" TEXT NOT NULL DEFAULT 'hr',
        "createdById" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "maxUses" INTEGER NOT NULL DEFAULT 1,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Evaluation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "organizationId" TEXT,
        "isPractice" BOOLEAN NOT NULL DEFAULT false,
        "candidateName" TEXT,
        "candidateEmail" TEXT,
        "candidatePhone" TEXT,
        "targetRole" TEXT NOT NULL,
        "resumeFileName" TEXT,
        "resumeFilePath" TEXT,
        "extractedText" TEXT,
        "matchScore" REAL NOT NULL DEFAULT 0,
        "skillsScore" REAL NOT NULL DEFAULT 0,
        "experienceScore" REAL NOT NULL DEFAULT 0,
        "toolsScore" REAL NOT NULL DEFAULT 0,
        "educationScore" REAL NOT NULL DEFAULT 0,
        "fitVerdict" TEXT,
        "summary" TEXT,
        "matchedSkills" TEXT,
        "missingSkills" TEXT,
        "recommendations" TEXT,
        "pipelineStage" TEXT NOT NULL DEFAULT 'applied',
        "status" TEXT NOT NULL DEFAULT 'screened',
        "hmNotes" TEXT,
        "rawAiResponse" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Candidate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "targetRole" TEXT NOT NULL,
        "stage" TEXT NOT NULL DEFAULT 'applied',
        "score" REAL NOT NULL DEFAULT 0,
        "skillsScore" REAL NOT NULL DEFAULT 0,
        "experienceScore" REAL NOT NULL DEFAULT 0,
        "toolsScore" REAL NOT NULL DEFAULT 0,
        "educationScore" REAL NOT NULL DEFAULT 0,
        "fitVerdict" TEXT,
        "summary" TEXT,
        "matchedSkills" TEXT,
        "missingSkills" TEXT,
        "recommendations" TEXT,
        "notes" TEXT,
        "resumeUrl" TEXT,
        "extractedText" TEXT,
        "organizationId" TEXT,
        "userId" TEXT,
        "evaluationId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "meta" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TeamInvitation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'hr',
        "token" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Feedback" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "name" TEXT,
        "email" TEXT,
        "rating" INTEGER DEFAULT 5,
        "category" TEXT NOT NULL DEFAULT 'general',
        "message" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CompanyDocument" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'policy',
        "description" TEXT,
        "fileUrl" TEXT,
        "fileName" TEXT,
        "fileSize" TEXT,
        "content" TEXT,
        "uploadedById" TEXT NOT NULL,
        "organizationId" TEXT,
        "isRestricted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Auto-seed Corporate Referral Code RNK-CORP-9842 so enterprise password recovery and referrals are functional
    try {
      const existingRef = await prisma.referralCode.findUnique({ where: { code: 'RNK-CORP-9842' } });
      if (!existingRef) {
        let defaultOrg = await prisma.organization.findFirst();
        if (!defaultOrg) {
          defaultOrg = await prisma.organization.create({
            data: {
              name: 'Rankly AI Technologies Inc.',
              adminId: 'org-admin-root'
            }
          });
        }
        let defaultUser = await prisma.user.findFirst();
        if (!defaultUser) {
          defaultUser = await prisma.user.create({
            data: {
              firstName: 'System',
              lastName: 'Administrator',
              email: 'admin@rankly.ai',
              password: '$2a$10$abcdefghijklmnopqrstuv',
              accountType: 'employee',
              role: 'admin'
            }
          });
        }
        const creatorId = defaultUser.id;
        const tenYearsLater = new Date();
        tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);

        await prisma.referralCode.create({
          data: {
            code: 'RNK-CORP-9842',
            organizationId: defaultOrg.id,
            assignedRole: 'hr',
            createdById: creatorId,
            expiresAt: tenYearsLater,
            maxUses: 9999,
            usedCount: 0,
            isUsed: false
          }
        });
        console.log('✅ Default Corporate Referral Code RNK-CORP-9842 seeded successfully.');
      }
    } catch (seedErr) {
      console.warn('⚠️ [Referral Seed Notice]:', seedErr.message);
    }

    console.log('✅ SQLite Schema Tables (User, OTP, Evaluation, Candidate, Feedback, etc.) initialized & verified.');
  } catch (error) {
    console.error('❌ Failed to connect/initialize SQLite database:', error.message);
  }
}

connectDatabase();

module.exports = prisma;

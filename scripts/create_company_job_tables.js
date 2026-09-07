const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Company" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "domain" TEXT,
      "atsPlatform" TEXT,
      "atsBoardSlug" TEXT,
      "isRegistered" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyJob" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "jobTitle" TEXT NOT NULL,
      "department" TEXT,
      "location" TEXT,
      "externalApplyUrl" TEXT,
      "ranklyApplicationSlug" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CompanyJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CompanyJob_ranklyApplicationSlug_key" ON "CompanyJob"("ranklyApplicationSlug");
  `);

  console.log('✅ Company and CompanyJob tables created successfully!');
  const compCount = await prisma.company.count();
  const jobCount = await prisma.companyJob.count();
  console.log(`Verified counts -> Companies: ${compCount}, Jobs: ${jobCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

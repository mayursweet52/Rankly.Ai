const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const compCount = await prisma.company.count();
  const jobCount = await prisma.companyJob.count();
  const companies = await prisma.company.findMany();
  const sampleJobs = await prisma.companyJob.findMany({
    take: 6,
    include: { company: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log('='.repeat(60));
  console.log('📊 GREENHOUSE AUTO-FETCH INGESTION VERIFICATION');
  console.log('='.repeat(60));
  console.log(`Total Companies in DB: ${compCount}`);
  console.log(`Total Company Jobs in DB: ${jobCount}`);
  console.log('\nRegistered Companies:');
  companies.forEach(c => console.log(` - ${c.name} (Slug: ${c.atsBoardSlug}, Platform: ${c.atsPlatform})`));

  console.log('\nSample Ingested Jobs:');
  sampleJobs.forEach((j, i) => {
    console.log(` ${i + 1}. [${j.company.name}] ${j.jobTitle}`);
    console.log(`    Location: ${j.location}`);
    console.log(`    Slug: ${j.ranklyApplicationSlug}`);
    console.log(`    Apply URL: ${j.externalApplyUrl}`);
  });
  console.log('='.repeat(60));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
